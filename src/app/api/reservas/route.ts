import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildReservaScopeWhere,
  canAccessCondominio,
  canManageCondominio,
  getReservaAccessScope,
} from '@/lib/reservas-auth';
import { UsuarioSessao } from '@/types';

const createReservaSchema = z.object({
  vagaId: z.string().min(1, 'ID da vaga e obrigatorio'),
  condominioId: z.string().min(1, 'ID do condominio e obrigatorio'),
  dataInicio: z.string().datetime('Data de inicio deve ser uma data valida'),
  dataFim: z.string().datetime('Data de fim deve ser uma data valida'),
  tipoLocacao: z.enum(['HORA', 'DIARIA', 'MENSAL', 'ANUAL']).optional(),
  observacoes: z.string().optional(),
});

const listReservasSchema = z.object({
  condominioId: z.string().optional(),
  usuarioId: z.string().optional(),
  vagaId: z.string().optional(),
  status: z.enum(['ativa', 'cancelada', 'expirada', 'concluida']).optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
});

async function getUsuarioAutenticado() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return session.user as UsuarioSessao;
}

/**
 * GET /api/reservas - Lista reservas com filtros opcionais
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioAutenticado();
    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const accessScope = getReservaAccessScope(usuario);
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedParams = listReservasSchema.parse(queryParams);

    if (
      validatedParams.condominioId &&
      !canAccessCondominio(accessScope, validatedParams.condominioId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado para este condominio' },
        { status: 403 }
      );
    }

    const baseWhere: Record<string, unknown> = {};

    if (validatedParams.condominioId) {
      baseWhere.condominioId = validatedParams.condominioId;
    }

    if (validatedParams.usuarioId) {
      const podeFiltrarOutroUsuario =
        validatedParams.usuarioId === usuario.id ||
        accessScope.isAdminMestre ||
        (validatedParams.condominioId
          ? canManageCondominio(accessScope, validatedParams.condominioId)
          : accessScope.managedCondominioIds.length > 0);

      if (!podeFiltrarOutroUsuario) {
        return NextResponse.json(
          {
            success: false,
            error: 'Voce nao pode consultar reservas de outro usuario',
          },
          { status: 403 }
        );
      }

      baseWhere.usuarioId = validatedParams.usuarioId;
    }

    if (validatedParams.vagaId) {
      baseWhere.vagaId = validatedParams.vagaId;
    }

    if (validatedParams.status) {
      baseWhere.status = validatedParams.status;
    }

    if (validatedParams.dataInicio && validatedParams.dataFim) {
      baseWhere.dataInicio = {
        gte: new Date(validatedParams.dataInicio),
        lte: new Date(validatedParams.dataFim),
      };
    }

    const where = buildReservaScopeWhere(
      accessScope,
      usuario.id,
      baseWhere,
      validatedParams.condominioId
    );

    const reservas = await prisma.reserva.findMany({
      where,
      include: {
        vaga: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            unidade: {
              select: {
                numero: true,
                torre: {
                  select: {
                    nome: true,
                  },
                },
              },
            },
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: reservas,
      total: reservas.length,
    });
  } catch (error) {
    console.error('Erro ao listar reservas:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parametros invalidos',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reservas - Cria uma nova reserva
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioAutenticado();
    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const accessScope = getReservaAccessScope(usuario);
    const body = await request.json();
    const validatedData = createReservaSchema.parse(body);

    if (!canAccessCondominio(accessScope, validatedData.condominioId)) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado para este condominio' },
        { status: 403 }
      );
    }

    const vaga = await prisma.vaga.findUnique({
      where: { id: validatedData.vagaId },
      include: {
        reservas: {
          where: {
            status: 'ativa',
            OR: [
              {
                dataInicio: {
                  lte: new Date(validatedData.dataFim),
                },
                dataFim: {
                  gte: new Date(validatedData.dataInicio),
                },
              },
            ],
          },
        },
        configuracaoLocacao: {
          select: {
            disponivel: true,
            tiposPermitidos: true,
            valorHora: true,
            valorDiaria: true,
            valorMensal: true,
            valorAnual: true,
          },
        },
      },
    });

    if (!vaga) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vaga nao encontrada',
        },
        { status: 404 }
      );
    }

    if (vaga.condominioId !== validatedData.condominioId) {
      return NextResponse.json(
        {
          success: false,
          error: 'A vaga informada nao pertence ao condominio selecionado',
        },
        { status: 400 }
      );
    }

    if (vaga.reservas.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vaga ja esta reservada para este periodo',
          conflitos: vaga.reservas,
        },
        { status: 409 }
      );
    }

    if (!vaga.configuracaoLocacao || !vaga.configuracaoLocacao.disponivel) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vaga nao esta disponivel para locacao',
        },
        { status: 400 }
      );
    }

    if (
      validatedData.tipoLocacao &&
      !vaga.configuracaoLocacao.tiposPermitidos.includes(validatedData.tipoLocacao)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Tipo de locacao ${validatedData.tipoLocacao.toLowerCase()} nao e permitido para esta vaga`,
        },
        { status: 400 }
      );
    }

    const agora = new Date();
    const dataInicio = new Date(validatedData.dataInicio);
    const dataFim = new Date(validatedData.dataFim);

    if (dataInicio < agora) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data de inicio nao pode ser no passado',
        },
        { status: 400 }
      );
    }

    if (dataFim <= dataInicio) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data de fim deve ser posterior a data de inicio',
        },
        { status: 400 }
      );
    }

    let valorReserva: number | null = null;
    if (validatedData.tipoLocacao && vaga.configuracaoLocacao) {
      const config = vaga.configuracaoLocacao;

      if (validatedData.tipoLocacao === 'HORA' && config.valorHora) {
        const horas = (dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60);
        valorReserva = parseFloat(config.valorHora.toString()) * horas;
      } else if (validatedData.tipoLocacao === 'DIARIA' && config.valorDiaria) {
        const dias = Math.ceil(
          (dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)
        );
        valorReserva = parseFloat(config.valorDiaria.toString()) * dias;
      } else if (validatedData.tipoLocacao === 'MENSAL' && config.valorMensal) {
        valorReserva = parseFloat(config.valorMensal.toString());
      } else if (validatedData.tipoLocacao === 'ANUAL' && config.valorAnual) {
        valorReserva = parseFloat(config.valorAnual.toString());
      }
    }

    const novaReserva = await prisma.reserva.create({
      data: {
        vagaId: validatedData.vagaId,
        usuarioId: usuario.id,
        condominioId: validatedData.condominioId,
        dataInicio,
        dataFim,
        tipoLocacao: validatedData.tipoLocacao,
        valor: valorReserva,
        observacoes: validatedData.observacoes,
      },
      include: {
        vaga: {
          select: {
            numero: true,
            tipo: true,
            unidade: {
              select: {
                numero: true,
                torre: {
                  select: {
                    nome: true,
                  },
                },
              },
            },
          },
        },
        usuario: {
          select: {
            nome: true,
            email: true,
          },
        },
        condominio: {
          select: {
            nome: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: novaReserva,
        message: 'Reserva criada com sucesso',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar reserva:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados invalidos',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}
