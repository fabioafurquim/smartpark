import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/estrutura/estatisticas - Busca estatísticas da estrutura
 * Query params: condominioId (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const condominioId = searchParams.get('condominioId');

    const where = condominioId ? { condominioId } : {};

    // Buscar estatísticas em paralelo para melhor performance
    const [totalTorres, totalUnidades, totalVagas, vagasOcupadas] = await Promise.all([
      // Total de torres/blocos
      prisma.torre.count({ where }),
      
      // Total de unidades
      prisma.unidade.count({ where }),
      
      // Total de vagas
      prisma.vaga.count({ where }),
      
      // Vagas ocupadas
      prisma.vaga.count({
        where: {
          ...where,
          status: 'OCUPADA'
        }
      })
    ]);

    // Estatísticas detalhadas por tipo
    const [estatisticasTorres, estatisticasUnidades, estatisticasVagas] = await Promise.all([
      // Estatísticas de torres por tipo
      prisma.torre.groupBy({
        by: ['tipo'],
        where,
        _count: {
          id: true
        }
      }),
      
      // Estatísticas de unidades por tipo
      prisma.unidade.groupBy({
        by: ['tipo'],
        where,
        _count: {
          id: true
        }
      }),
      
      // Estatísticas de vagas por tipo e status
      prisma.vaga.groupBy({
        by: ['tipo', 'status'],
        where,
        _count: {
          id: true
        }
      })
    ]);

    // Formatear estatísticas de torres
    const torresPorTipo = estatisticasTorres.reduce((acc, item) => {
      acc[item.tipo] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Formatear estatísticas de unidades
    const unidadesPorTipo = estatisticasUnidades.reduce((acc, item) => {
      acc[item.tipo] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Formatear estatísticas de vagas
    const vagasPorTipo = {} as Record<string, number>;
    const vagasPorStatus = {} as Record<string, number>;
    
    estatisticasVagas.forEach(item => {
      // Por tipo
      if (!vagasPorTipo[item.tipo]) {
        vagasPorTipo[item.tipo] = 0;
      }
      vagasPorTipo[item.tipo] += item._count.id;
      
      // Por status
      if (!vagasPorStatus[item.status]) {
        vagasPorStatus[item.status] = 0;
      }
      vagasPorStatus[item.status] += item._count.id;
    });

    // Calcular percentuais
    const percentualOcupacao = totalVagas > 0 ? Math.round((vagasOcupadas / totalVagas) * 100) : 0;
    const vagasLivres = totalVagas - vagasOcupadas;
    const percentualLivres = totalVagas > 0 ? Math.round((vagasLivres / totalVagas) * 100) : 0;

    const estatisticas = {
      // Totais gerais
      totalTorres,
      totalUnidades,
      totalVagas,
      vagasOcupadas,
      vagasLivres,
      
      // Percentuais
      percentualOcupacao,
      percentualLivres,
      
      // Detalhamentos
      torres: {
        total: totalTorres,
        porTipo: {
          TORRE: torresPorTipo.TORRE || 0,
          BLOCO: torresPorTipo.BLOCO || 0
        }
      },
      
      unidades: {
        total: totalUnidades,
        porTipo: {
          APARTAMENTO: unidadesPorTipo.APARTAMENTO || 0,
          SALA_COMERCIAL: unidadesPorTipo.SALA_COMERCIAL || 0,
          LOJA: unidadesPorTipo.LOJA || 0,
          COBERTURA: unidadesPorTipo.COBERTURA || 0
        }
      },
      
      vagas: {
        total: totalVagas,
        porTipo: {
          CARRO: vagasPorTipo.CARRO || 0,
          MOTO: vagasPorTipo.MOTO || 0,
          DEFICIENTE: vagasPorTipo.DEFICIENTE || 0,
          IDOSO: vagasPorTipo.IDOSO || 0
        },
        porStatus: {
          LIVRE: vagasPorStatus.LIVRE || 0,
          OCUPADA: vagasPorStatus.OCUPADA || 0,
          RESERVADA: vagasPorStatus.RESERVADA || 0,
          MANUTENCAO: vagasPorStatus.MANUTENCAO || 0
        }
      }
    };

    return NextResponse.json(estatisticas);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}