import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { EstatisticasDashboard } from '@/types';

/**
 * GET /api/dashboard/estatisticas
 * Retorna estatísticas gerais do sistema para o dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Buscar estatísticas do banco de dados
    const [totalCondominios, usuariosAtivos, totalVagas, vagasOcupadas] = await Promise.all([
      // Total de condomínios
      prisma.condominio.count(),
      
      // Usuários ativos (com perfil ativo)
      prisma.perfilUsuario.count({
        where: {
          ativo: true
        }
      }),
      
      // Total de vagas
      prisma.vaga.count(),
      
      // Vagas ocupadas (que têm proprietário)
      prisma.vaga.count({
        where: {
          proprietarioId: {
            not: null
          }
        }
      })
    ]);

    // Calcular ocupação atual
    const ocupacaoAtual = totalVagas > 0 
      ? Math.round((vagasOcupadas / totalVagas) * 100)
      : 0;

    const estatisticas: EstatisticasDashboard = {
      totalCondominios,
      usuariosAtivos,
      totalVagas,
      vagasOcupadas,
      ocupacaoAtual,
      vagasDisponiveis: totalVagas - vagasOcupadas,
      // Estatísticas adicionais que podem ser implementadas futuramente
      solicitacoesPendentes: 0,
      alertasAtivos: 0,
      manutencoesProgramadas: 0
    };

    return NextResponse.json(estatisticas);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}