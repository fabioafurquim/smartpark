import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, temPermissao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';

/**
 * GET /api/locacoes/condominio
 * Lista locações de um condomínio para monitoramento operacional.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { searchParams } = new URL(request.url);
    const condominioId = searchParams.get('condominioId');

    if (!condominioId) {
      return NextResponse.json({ error: 'condominioId é obrigatório' }, { status: 400 });
    }

    if (!temPermissao(usuario, 'monitorarLocacoes', condominioId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const locacoes = await prisma.locacao.findMany({
      where: {
        vaga: {
          condominioId,
        },
      },
      include: {
        vaga: {
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
            condominio: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
        locatario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        proprietario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        eventos: {
          orderBy: {
            criadoEm: 'desc',
          },
          take: 3,
          select: {
            id: true,
            tipo: true,
            titulo: true,
            descricao: true,
            criadoEm: true,
            usuario: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { dataInicio: 'desc' }],
    });

    return NextResponse.json(locacoes);
  } catch (error) {
    console.error('Erro ao buscar locações do condomínio:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
