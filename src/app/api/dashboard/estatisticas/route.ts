import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ehAdministradorMestre } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';

function obterContextoModalidade(modalidades: string[]) {
  const usaEmprestimo = modalidades.some(
    (modalidade) => modalidade === 'EMPRESTIMO' || modalidade === 'HIBRIDO'
  );
  const usaLocacao = modalidades.some(
    (modalidade) => modalidade === 'LOCACAO' || modalidade === 'HIBRIDO'
  );

  return {
    usaEmprestimo,
    usaLocacao,
    usaSomenteEmprestimo: usaEmprestimo && !usaLocacao,
    usaSomenteLocacao: usaLocacao && !usaEmprestimo,
  };
}

/**
 * GET /api/dashboard/estatisticas
 * Retorna estatísticas personalizadas por perfil do usuário
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const isAdminMestre = ehAdministradorMestre(usuario);

    // Identificar perfil do usuário
    const prioridadePerfis = [
      'administrador_mestre',
      'administrador_condominio',
      'sindico',
      'porteiro',
      'morador',
    ];
    const perfilPrincipal =
      prioridadePerfis.find((perfil) =>
        usuario.perfis?.some((perfilUsuario) => perfilUsuario.tipo === perfil)
      ) || 'morador';
    const condominioIds = usuario.perfis?.map(p => p.condominioId).filter(Boolean) || [];

    const modalidadesCondominio = isAdminMestre
      ? (
          await prisma.condominio.findMany({
            select: { modalidade: true },
          })
        ).map((condominio) => condominio.modalidade)
      : condominioIds.length > 0
        ? (
            await prisma.condominio.findMany({
              where: {
                id: {
                  in: condominioIds,
                },
              },
              select: { modalidade: true },
            })
          ).map((condominio) => condominio.modalidade)
        : [];

    const contextoModalidade = obterContextoModalidade(modalidadesCondominio);

    if (isAdminMestre) {
      // ESTATÍSTICAS PARA ADMINISTRADOR MESTRE
      const [
        totalCondominios,
        usuariosAtivos,
        totalVagas,
        vagasDisponiveis,
        totalLocacoes,
        locacoesAtivas,
        locacoesFinalizadas,
        solicitacoesCadastroPendentes,
        locacoesHoje,
        locacoesSemana,
        locacoesMes,
        receitaTotal
      ] = await Promise.all([
        prisma.condominio.count(),
        prisma.perfilUsuario.count({ where: { ativo: true } }),
        prisma.vaga.count(),
        prisma.vaga.count({
          where: {
            configuracaoLocacao: { disponivel: true }
          }
        }),
        prisma.locacao.count(),
        prisma.locacao.count({ where: { status: 'ATIVA' } }),
        prisma.locacao.count({ where: { status: 'FINALIZADA' } }),
        prisma.solicitacaoCadastro.count({ where: { status: 'pendente' } }),
        prisma.locacao.count({
          where: {
            criadoEm: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        }),
        prisma.locacao.count({
          where: {
            criadoEm: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.locacao.count({
          where: {
            criadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.locacao.aggregate({
          where: { status: { in: ['ATIVA', 'FINALIZADA'] } },
          _sum: { valor: true }
        }),
        // Usuários criados nos últimos 6 meses (para gráfico)
        prisma.usuario.groupBy({
          by: ['criadoEm'],
          _count: true,
          where: {
            criadoEm: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }
          }
        })
      ]);

      // Buscar locações por mês para gráfico
      const locacoesPorMes = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "criadoEm") as mes,
          COUNT(*) as total,
          SUM(valor) as receita
        FROM locacoes
        WHERE "criadoEm" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "criadoEm")
        ORDER BY mes DESC
      ` as Array<{ mes: Date; total: bigint; receita: number }>;

      // Buscar top condomínios por locações
      const topCondominios = await prisma.$queryRaw`
        SELECT 
          c.nome,
          COUNT(l.id) as total_locacoes,
          COALESCE(SUM(l.valor), 0) as receita
        FROM condominios c
        LEFT JOIN vagas v ON v."condominioId" = c.id
        LEFT JOIN locacoes l ON l."vagaId" = v.id
        GROUP BY c.id, c.nome
        ORDER BY total_locacoes DESC
        LIMIT 5
      ` as Array<{ nome: string; total_locacoes: bigint; receita: number }>;

      return NextResponse.json({
        perfil: 'administrador_mestre',
        cards: {
          totalCondominios,
          usuariosAtivos,
          totalVagas,
          vagasDisponiveis,
          totalLocacoes,
          locacoesAtivas,
          locacoesFinalizadas,
          solicitacoesCadastroPendentes,
          receitaTotal: receitaTotal._sum.valor || 0
        },
        metricas: {
          locacoesHoje,
          locacoesSemana,
          locacoesMes,
          taxaOcupacao: totalVagas > 0 ? Math.round((vagasDisponiveis / totalVagas) * 100) : 0
        },
        contexto: contextoModalidade,
        graficos: {
          locacoesPorMes: locacoesPorMes.map(l => ({
            mes: l.mes,
            total: Number(l.total),
            receita: l.receita || 0
          })),
          topCondominios: topCondominios.map(c => ({
            nome: c.nome,
            locacoes: Number(c.total_locacoes),
            receita: c.receita || 0
          }))
        }
      });

    } else if (
      perfilPrincipal === 'sindico' ||
      perfilPrincipal === 'administrador_condominio' ||
      perfilPrincipal === 'porteiro'
    ) {
      // ESTATÍSTICAS PARA SÍNDICO / ADMIN CONDOMÍNIO
      const [
        totalVagas,
        vagasDisponiveis,
        totalUnidades,
        totalMoradores,
        locacoesAtivas,
        locacoesFinalizadas,
        solicitacoesCadastroPendentes,
        locacoesMes,
        receitaMes
      ] = await Promise.all([
        prisma.vaga.count({
          where: { condominioId: { in: condominioIds } }
        }),
        prisma.vaga.count({
          where: {
            condominioId: { in: condominioIds },
            configuracaoLocacao: { disponivel: true }
          }
        }),
        prisma.unidade.count({
          where: { condominioId: { in: condominioIds } }
        }),
        prisma.perfilUsuario.count({
          where: {
            condominioId: { in: condominioIds },
            tipo: 'morador',
            ativo: true
          }
        }),
        prisma.locacao.count({
          where: {
            status: 'ATIVA',
            vaga: { condominioId: { in: condominioIds } }
          }
        }),
        prisma.locacao.count({
          where: {
            status: 'FINALIZADA',
            vaga: { condominioId: { in: condominioIds } }
          }
        }),
        prisma.solicitacaoCadastro.count({
          where: {
            status: 'pendente',
            condominioId: { in: condominioIds }
          }
        }),
        prisma.locacao.count({
          where: {
            criadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            vaga: { condominioId: { in: condominioIds } }
          }
        }),
        prisma.locacao.aggregate({
          where: {
            status: { in: ['ATIVA', 'FINALIZADA'] },
            criadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            vaga: { condominioId: { in: condominioIds } }
          },
          _sum: { valor: true }
        })
      ]);

      return NextResponse.json({
        perfil: perfilPrincipal === 'porteiro' ? 'porteiro' : 'sindico',
        cards: {
          totalVagas,
          vagasDisponiveis,
          totalUnidades,
          totalMoradores,
          locacoesAtivas,
          locacoesFinalizadas,
          solicitacoesCadastroPendentes
        },
        metricas: {
          locacoesMes,
          receitaMes: receitaMes._sum.valor || 0,
          taxaOcupacao: totalVagas > 0 ? Math.round(((totalVagas - vagasDisponiveis) / totalVagas) * 100) : 0
        },
        contexto: contextoModalidade,
      });

    } else {
      // ESTATÍSTICAS PARA MORADOR
      const [
        vagasDisponiveis,
        minhasLocacoesAtivas,
        minhasLocacoesMes,
        minhasLocacoesFinalizadasMes,
        minhasVagasAlugadas,
        minhasVagasPublicadas,
        totalGastoMes,
        totalRecebidoMes
      ] = await Promise.all([
        // Vagas disponíveis para locação nos condomínios do usuário
        prisma.vaga.count({
          where: {
            condominioId: { in: condominioIds },
            configuracaoLocacao: { disponivel: true },
            proprietarioId: { not: usuario.id } // Não mostrar próprias vagas
          }
        }),
        // Minhas locações ativas (como locatário)
        prisma.locacao.count({
          where: {
            locatarioId: usuario.id,
            status: 'ATIVA'
          }
        }),
        // Meus usos no mês (como locatário)
        prisma.locacao.count({
          where: {
            locatarioId: usuario.id,
            criadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        // Meus usos finalizados no mês (como locatário)
        prisma.locacao.count({
          where: {
            locatarioId: usuario.id,
            status: 'FINALIZADA',
            criadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        // Minhas vagas alugadas (como proprietário)
        prisma.locacao.count({
          where: {
            proprietarioId: usuario.id,
            status: 'ATIVA'
          }
        }),
        // Minhas vagas publicadas para uso
        prisma.vaga.count({
          where: {
            proprietarioId: usuario.id,
            configuracaoLocacao: {
              disponivel: true,
            },
          },
        }),
        // Total gasto no mês (como locatário)
        prisma.locacao.aggregate({
          where: {
            locatarioId: usuario.id,
            status: { in: ['ATIVA', 'FINALIZADA'] },
            criadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          },
          _sum: { valor: true }
        }),
        // Total recebido no mês (como proprietário)
        prisma.locacao.aggregate({
          where: {
            proprietarioId: usuario.id,
            status: { in: ['ATIVA', 'FINALIZADA'] },
            criadoEm: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          },
          _sum: { valor: true }
        })
      ]);

      // Buscar total de vagas nos condomínios do usuário
      const totalVagasCondominio = await prisma.vaga.count({
        where: { condominioId: { in: condominioIds } }
      });

      return NextResponse.json({
        perfil: 'morador',
        cards: {
          vagasDisponiveis,
          minhasLocacoesAtivas,
          minhasLocacoesMes,
          minhasLocacoesFinalizadasMes,
          minhasVagasAlugadas,
          minhasVagasPublicadas,
        },
        metricas: {
          totalGastoMes: totalGastoMes._sum.valor || 0,
          totalRecebidoMes: totalRecebidoMes._sum.valor || 0,
          taxaOcupacao: totalVagasCondominio > 0 
            ? Math.round(((totalVagasCondominio - vagasDisponiveis) / totalVagasCondominio) * 100) 
            : 0
        },
        contexto: contextoModalidade,
      });
    }

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
