import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessCondominio, getReservaAccessScope } from '@/lib/reservas-auth';
import { UsuarioSessao } from '@/types';

const disponibilidadeSchema = z.object({
  condominioId: z.string().min(1, 'ID do condominio e obrigatorio'),
  dataInicio: z.string().datetime('Data de inicio deve ser uma data valida'),
  dataFim: z.string().datetime('Data de fim deve ser uma data valida'),
  tipoVaga: z
    .enum(['COBERTA', 'DESCOBERTA', 'DEFICIENTE', 'IDOSO', 'VISITANTE'])
    .optional(),
  excluirVagaId: z.string().optional(),
});

async function getUsuarioAutenticado() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return session.user as UsuarioSessao;
}

async function consultarDisponibilidade(validatedParams: z.infer<typeof disponibilidadeSchema>) {
  const dataInicio = new Date(validatedParams.dataInicio);
  const dataFim = new Date(validatedParams.dataFim);

  if (dataFim <= dataInicio) {
    return NextResponse.json(
      {
        success: false,
        error: 'Data de fim deve ser posterior a data de inicio',
      },
      { status: 400 }
    );
  }

  if (dataInicio < new Date()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Data de inicio nao pode ser no passado',
      },
      { status: 400 }
    );
  }

  const whereVagas: Record<string, unknown> = {
    condominioId: validatedParams.condominioId,
    configuracaoLocacao: {
      is: {
        disponivel: true,
      },
    },
  };

  if (validatedParams.tipoVaga) {
    whereVagas.tipo = validatedParams.tipoVaga;
  }

  if (validatedParams.excluirVagaId) {
    whereVagas.id = { not: validatedParams.excluirVagaId };
  }

  const todasVagas = await prisma.vaga.findMany({
    where: whereVagas,
    include: {
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
      reservas: {
        where: {
          status: 'ativa',
          OR: [
            {
              dataInicio: {
                lte: dataFim,
              },
              dataFim: {
                gte: dataInicio,
              },
            },
          ],
        },
        select: {
          id: true,
          dataInicio: true,
          dataFim: true,
          usuario: {
            select: {
              nome: true,
            },
          },
        },
      },
    },
    orderBy: [{ tipo: 'asc' }, { numero: 'asc' }],
  });

  const vagasDisponiveis = todasVagas.filter((vaga) => vaga.reservas.length === 0);
  const vagasOcupadas = todasVagas.filter((vaga) => vaga.reservas.length > 0);

  const estatisticasPorTipo = todasVagas.reduce(
    (acc, vaga) => {
      const tipo = vaga.tipo;

      if (!acc[tipo]) {
        acc[tipo] = {
          total: 0,
          disponiveis: 0,
          ocupadas: 0,
        };
      }

      acc[tipo].total++;

      if (vaga.reservas.length === 0) {
        acc[tipo].disponiveis++;
      } else {
        acc[tipo].ocupadas++;
      }

      return acc;
    },
    {} as Record<string, { total: number; disponiveis: number; ocupadas: number }>
  );

  return NextResponse.json({
    success: true,
    data: {
      periodo: {
        dataInicio: validatedParams.dataInicio,
        dataFim: validatedParams.dataFim,
      },
      resumo: {
        totalVagas: todasVagas.length,
        vagasDisponiveis: vagasDisponiveis.length,
        vagasOcupadas: vagasOcupadas.length,
        percentualDisponibilidade:
          todasVagas.length > 0
            ? Math.round((vagasDisponiveis.length / todasVagas.length) * 100)
            : 0,
      },
      estatisticasPorTipo,
      vagas: {
        disponiveis: vagasDisponiveis.map((vaga) => ({
          id: vaga.id,
          numero: vaga.numero,
          tipo: vaga.tipo,
          unidade: vaga.unidade,
          criadoEm: vaga.criadoEm,
        })),
        ocupadas: vagasOcupadas.map((vaga) => ({
          id: vaga.id,
          numero: vaga.numero,
          tipo: vaga.tipo,
          unidade: vaga.unidade,
          reservas: vaga.reservas,
          criadoEm: vaga.criadoEm,
        })),
      },
    },
  });
}

/**
 * GET /api/reservas/disponibilidade - Verifica vagas disponiveis para reserva
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

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedParams = disponibilidadeSchema.parse(queryParams);
    const accessScope = getReservaAccessScope(usuario);

    if (!canAccessCondominio(accessScope, validatedParams.condominioId)) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado para este condominio' },
        { status: 403 }
      );
    }

    return consultarDisponibilidade(validatedParams);
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);

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
 * POST /api/reservas/disponibilidade - Verifica disponibilidade com dados no corpo
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

    const body = await request.json();
    const validatedData = disponibilidadeSchema.parse(body);
    const accessScope = getReservaAccessScope(usuario);

    if (!canAccessCondominio(accessScope, validatedData.condominioId)) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado para este condominio' },
        { status: 403 }
      );
    }

    return consultarDisponibilidade(validatedData);
  } catch (error) {
    console.error('Erro ao processar disponibilidade:', error);

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
