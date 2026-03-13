import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsuarioSessao } from '@/types';
import {
  obterCondominiosGerenciados,
  podeGerenciarSolicitacoes,
} from '@/lib/solicitacoes-cadastro';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;

    if (!podeGerenciarSolicitacoes(usuario)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pendente';
    const busca = searchParams.get('busca')?.trim();
    const condominioId = searchParams.get('condominioId') || undefined;
    const condominiosPermitidos = obterCondominiosGerenciados(usuario);

    if (
      condominiosPermitidos &&
      condominioId &&
      !condominiosPermitidos.includes(condominioId)
    ) {
      return NextResponse.json(
        { error: 'Condominio fora do seu escopo' },
        { status: 403 }
      );
    }

    const where = {
      ...(status === 'todas' ? {} : { status }),
      ...(condominioId ? { condominioId } : {}),
      ...(condominiosPermitidos
        ? {
            condominioId: {
              in: condominioId ? [condominioId] : condominiosPermitidos,
            },
          }
        : {}),
      ...(busca
        ? {
            OR: [
              {
                usuario: {
                  nome: {
                    contains: busca,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                usuario: {
                  email: {
                    contains: busca,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                unidade: {
                  numero: {
                    contains: busca,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                condominio: {
                  nome: {
                    contains: busca,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const solicitacoes = await prisma.solicitacaoCadastro.findMany({
      where,
      include: {
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
        unidade: {
          select: {
            id: true,
            numero: true,
            andar: true,
            torre: {
              select: {
                id: true,
                nome: true,
              },
            },
            _count: {
              select: {
                vagas: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { criadoEm: 'desc' }],
    });

    return NextResponse.json({
      solicitacoes,
      resumo: {
        pendentes: solicitacoes.filter((item) => item.status === 'pendente').length,
        aprovadas: solicitacoes.filter((item) => item.status === 'aprovado').length,
        rejeitadas: solicitacoes.filter((item) => item.status === 'rejeitado').length,
      },
    });
  } catch (error) {
    console.error('Erro ao listar solicitacoes de cadastro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
