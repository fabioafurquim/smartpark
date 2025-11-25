import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, temPermissao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';
import { UsuarioSessao } from '../../../../types';

const atualizarStatusSchema = z.object({
  status: z.enum(['ATIVA', 'CANCELADA', 'FINALIZADA'])
});

/**
 * PUT /api/locacoes/[id]
 * Atualizar status de locação (aprovar, rejeitar, cancelar)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const body = await request.json();
    const validatedData = atualizarStatusSchema.parse(body);

    // Buscar locação
    const locacao = await prisma.locacao.findUnique({
      where: { id },
      include: {
        vaga: {
          include: {
            condominio: true
          }
        }
      }
    });

    if (!locacao) {
      return NextResponse.json(
        { error: 'Locação não encontrada' },
        { status: 404 }
      );
    }

    // Verificar permissão: apenas proprietário da vaga pode atualizar
    if (locacao.proprietarioId !== usuario.id) {
      // Verificar se é síndico do condomínio
      if (!temPermissao(usuario, 'gerenciarReservas', locacao.vaga.condominioId)) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        );
      }
    }

    // Atualizar status
    const locacaoAtualizada = await prisma.locacao.update({
      where: { id },
      data: {
        status: validatedData.status
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
      }
    });

    return NextResponse.json(locacaoAtualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar locação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/locacoes/[id]
 * Buscar locação específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const locacao = await prisma.locacao.findUnique({
      where: { id },
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
      }
    });

    if (!locacao) {
      return NextResponse.json(
        { error: 'Locação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(locacao);
  } catch (error) {
    console.error('Erro ao buscar locação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
