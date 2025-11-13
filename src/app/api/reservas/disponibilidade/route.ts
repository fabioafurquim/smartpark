import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para verificação de disponibilidade
const disponibilidadeSchema = z.object({
  condominioId: z.string().min(1, 'ID do condomínio é obrigatório'),
  dataInicio: z.string().datetime('Data de início deve ser uma data válida'),
  dataFim: z.string().datetime('Data de fim deve ser uma data válida'),
  tipoVaga: z.enum(['COBERTA', 'DESCOBERTA', 'DEFICIENTE', 'IDOSO', 'VISITANTE']).optional(),
  excluirVagaId: z.string().optional(), // Para excluir uma vaga específica da busca (útil para edição)
});

/**
 * GET /api/reservas/disponibilidade - Verifica vagas disponíveis para reserva
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedParams = disponibilidadeSchema.parse(queryParams);

    const dataInicio = new Date(validatedParams.dataInicio);
    const dataFim = new Date(validatedParams.dataFim);

    // Verificar se as datas são válidas
    if (dataFim <= dataInicio) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data de fim deve ser posterior à data de início',
        },
        { status: 400 }
      );
    }

    // Verificar se a data de início não é no passado
    const agora = new Date();
    if (dataInicio < agora) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data de início não pode ser no passado',
        },
        { status: 400 }
      );
    }

    // Buscar todas as vagas do condomínio
    const whereVagas: any = {
      condominioId: validatedParams.condominioId,
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
      orderBy: [
        { tipo: 'asc' },
        { numero: 'asc' },
      ],
    });

    // Separar vagas disponíveis e ocupadas
    const vagasDisponiveis = todasVagas.filter(vaga => vaga.reservas.length === 0);
    const vagasOcupadas = todasVagas.filter(vaga => vaga.reservas.length > 0);

    // Estatísticas por tipo
    const estatisticasPorTipo = todasVagas.reduce((acc, vaga) => {
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
    }, {} as Record<string, { total: number; disponiveis: number; ocupadas: number }>);

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
          percentualDisponibilidade: todasVagas.length > 0 
            ? Math.round((vagasDisponiveis.length / todasVagas.length) * 100) 
            : 0,
        },
        estatisticasPorTipo,
        vagas: {
          disponiveis: vagasDisponiveis.map(vaga => ({
            id: vaga.id,
            numero: vaga.numero,
            tipo: vaga.tipo,
            unidade: vaga.unidade,
            criadoEm: vaga.criadoEm,
          })),
          ocupadas: vagasOcupadas.map(vaga => ({
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
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    
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
 * POST /api/reservas/disponibilidade - Verifica disponibilidade com dados no corpo da requisição
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = disponibilidadeSchema.parse(body);

    // Redirecionar para o método GET com os parâmetros
    const searchParams = new URLSearchParams({
      condominioId: validatedData.condominioId,
      dataInicio: validatedData.dataInicio,
      dataFim: validatedData.dataFim,
      ...(validatedData.tipoVaga && { tipoVaga: validatedData.tipoVaga }),
      ...(validatedData.excluirVagaId && { excluirVagaId: validatedData.excluirVagaId }),
    });

    const url = new URL(request.url);
    url.search = searchParams.toString();

    // Criar uma nova requisição com os parâmetros
    const newRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers,
    });

    return GET(newRequest);
  } catch (error) {
    console.error('Erro ao processar requisição POST:', error);
    
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
