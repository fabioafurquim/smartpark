import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';

/**
 * GET /api/locacoes/todas
 * Listar TODAS as locações (apenas para admin mestre)
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

    // Verificar se é admin mestre
    const ehAdminMestre = usuario.perfis.some(p => p.tipo === 'administrador_mestre');
    if (!ehAdminMestre) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem visualizar todas as locações.' },
        { status: 403 }
      );
    }

    // Buscar todas as locações
    const locacoes = await prisma.locacao.findMany({
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
                id: true,
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
      orderBy: { criadoEm: 'desc' }
    });

    return NextResponse.json(locacoes);
  } catch (error) {
    console.error('Erro ao buscar todas as locações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
