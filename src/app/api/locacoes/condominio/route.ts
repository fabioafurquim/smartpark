import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, temPermissao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';

/**
 * GET /api/locacoes/condominio
 * Listar todas as locações de um condomínio (apenas para síndico/admin)
 * Query: condominioId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const { searchParams } = new URL(request.url);
    const condominioId = searchParams.get('condominioId');

    if (!condominioId) {
      return NextResponse.json(
        { error: 'condominioId é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar permissão: apenas síndico ou admin do condomínio
    if (!temPermissao(usuario, 'gerenciarReservas', condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Buscar todas as locações do condomínio
    const locacoes = await prisma.locacao.findMany({
      where: {
        vaga: {
          condominioId
        }
      },
      include: {
        vaga: {
          include: {
            unidade: {
              select: {
                numero: true,
                torre: {
                  select: {
                    nome: true
                  }
                }
              }
            },
            condominio: {
              select: {
                nome: true
              }
            }
          }
        },
        locatario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        proprietario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { dataInicio: 'desc' }
      ]
    });

    return NextResponse.json(locacoes);
  } catch (error) {
    console.error('Erro ao buscar locações do condomínio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
