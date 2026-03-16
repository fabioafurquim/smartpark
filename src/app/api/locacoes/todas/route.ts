import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ehAdministradorMestre } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';

/**
 * GET /api/locacoes/todas
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    if (!ehAdministradorMestre(usuario)) {
      return NextResponse.json(
        {
          error: 'Acesso negado. Apenas administradores mestres podem visualizar todas as locações.',
        },
        { status: 403 }
      );
    }

    const locacoes = await prisma.locacao.findMany({
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
      orderBy: { criadoEm: 'desc' },
    });

    return NextResponse.json(locacoes);
  } catch (error) {
    console.error('Erro ao buscar todas as locações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
