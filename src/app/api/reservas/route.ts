import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';

// Schema de validação para criação de reserva
const createReservaSchema = z.object({
  vagaId: z.string().min(1, 'ID da vaga é obrigatório'),
  usuarioId: z.string().min(1, 'ID do usuário é obrigatório'),
  condominioId: z.string().min(1, 'ID do condomínio é obrigatório'),
  dataInicio: z.string().datetime('Data de início deve ser uma data válida'),
  dataFim: z.string().datetime('Data de fim deve ser uma data válida'),
  tipoLocacao: z.enum(['HORA', 'DIARIA', 'MENSAL', 'ANUAL']).optional(),
  observacoes: z.string().optional(),
});

// Schema de validação para listagem de reservas
const listReservasSchema = z.object({
  condominioId: z.string().optional(),
  usuarioId: z.string().optional(),
  vagaId: z.string().optional(),
  status: z.enum(['ativa', 'cancelada', 'expirada', 'concluida']).optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
});

/**
 * GET /api/reservas - Lista reservas com filtros opcionais
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedParams = listReservasSchema.parse(queryParams);

    const where: any = {};
    
    if (validatedParams.condominioId) {
      where.condominioId = validatedParams.condominioId;
    }
    
    if (validatedParams.usuarioId) {
      where.usuarioId = validatedParams.usuarioId;
    }
    
    if (validatedParams.vagaId) {
      where.vagaId = validatedParams.vagaId;
    }
    
    if (validatedParams.status) {
      where.status = validatedParams.status;
    }
    
    if (validatedParams.dataInicio && validatedParams.dataFim) {
      where.dataInicio = {
        gte: new Date(validatedParams.dataInicio),
        lte: new Date(validatedParams.dataFim),
      };
    }

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
          error: 'Parâmetros inválidos',
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
    const body = await request.json();
    const validatedData = createReservaSchema.parse(body);

    // Verificar se a vaga existe e está disponível
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
          error: 'Vaga não encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar se há conflito de horários
    if (vaga.reservas.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vaga já está reservada para este período',
          conflitos: vaga.reservas,
        },
        { status: 409 }
      );
    }

    // Verificar se a vaga está disponível para locação
    if (!vaga.configuracaoLocacao || !vaga.configuracaoLocacao.disponivel) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vaga não está disponível para locação',
        },
        { status: 400 }
      );
    }

    // Verificar se o tipo de locação é permitido
    if (validatedData.tipoLocacao && !vaga.configuracaoLocacao.tiposPermitidos.includes(validatedData.tipoLocacao)) {
      return NextResponse.json(
        {
          success: false,
          error: `Tipo de locação ${validatedData.tipoLocacao.toLowerCase()} não é permitido para esta vaga`,
        },
        { status: 400 }
      );
    }

    // Verificar se a data de início não é no passado
    const agora = new Date();
    const dataInicio = new Date(validatedData.dataInicio);
    
    if (dataInicio < agora) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data de início não pode ser no passado',
        },
        { status: 400 }
      );
    }

    // Verificar se a data de fim é posterior à data de início
    const dataFim = new Date(validatedData.dataFim);
    
    if (dataFim <= dataInicio) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data de fim deve ser posterior à data de início',
        },
        { status: 400 }
      );
    }

    // Calcular valor da reserva baseado no tipo de locação
    let valorReserva: number | null = null;
    if (validatedData.tipoLocacao && vaga.configuracaoLocacao) {
      const config = vaga.configuracaoLocacao;
      const tipoLocacao = validatedData.tipoLocacao;
      
      if (tipoLocacao === 'HORA' && config.valorHora) {
        const horas = (dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60);
        valorReserva = parseFloat(config.valorHora.toString()) * horas;
      } else if (tipoLocacao === 'DIARIA' && config.valorDiaria) {
        const dias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
        valorReserva = parseFloat(config.valorDiaria.toString()) * dias;
      } else if (tipoLocacao === 'MENSAL' && config.valorMensal) {
        valorReserva = parseFloat(config.valorMensal.toString());
      } else if (tipoLocacao === 'ANUAL' && config.valorAnual) {
        valorReserva = parseFloat(config.valorAnual.toString());
      }
    }

    // Criar a reserva
    const novaReserva = await prisma.reserva.create({
      data: {
        vagaId: validatedData.vagaId,
        usuarioId: validatedData.usuarioId,
        condominioId: validatedData.condominioId,
        dataInicio: new Date(validatedData.dataInicio),
        dataFim: new Date(validatedData.dataFim),
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
          error: 'Dados inválidos',
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