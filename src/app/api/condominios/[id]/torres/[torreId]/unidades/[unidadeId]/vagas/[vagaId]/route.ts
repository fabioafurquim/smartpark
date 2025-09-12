import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de vaga
const updateVagaSchema = z.object({
  numero: z.string().min(1, 'Número da vaga é obrigatório').optional(),
  tipo: z.enum(['carro', 'moto', 'bicicleta', 'deficiente'], {
    errorMap: () => ({ message: 'Tipo deve ser: carro, moto, bicicleta ou deficiente' })
  }).optional(),
  localizacao: z.string().optional(),
  observacoes: z.string().optional()
});

/**
 * GET /api/condominios/[id]/torres/[torreId]/unidades/[unidadeId]/vagas/[vagaId]
 * Busca uma vaga específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string; unidadeId: string; vagaId: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId, torreId, unidadeId, vagaId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1),
      unidadeId: z.string().min(1),
      vagaId: z.string().min(1)
    }).safeParse({ condominioId, torreId, unidadeId, vagaId });

    if (!idsValidation.success) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem acesso ao condomínio
    const condominio = await prisma.condominio.findFirst({
      where: {
        id: condominioId,
        ativo: true,
        perfisUsuario: {
          some: {
            usuarioId: session.user.id,
            ativo: true
          }
        }
      }
    });

    if (!condominio) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    // Buscar a vaga com informações completas
    const vaga = await prisma.vaga.findFirst({
      where: {
        id: vagaId,
        unidadeId: unidadeId,
        unidade: {
          torreId: torreId,
          torre: {
            condominioId: condominioId
          }
        }
      },
      include: {
        unidade: {
          select: {
            id: true,
            numero: true,
            torre: {
              select: {
                id: true,
                nome: true,
                tipo: true,
                condominioId: true
              }
            }
          }
        }
      }
    });

    if (!vaga) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(vaga);

  } catch (error) {
    console.error('Erro ao buscar vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/condominios/[id]/torres/[torreId]/unidades/[unidadeId]/vagas/[vagaId]
 * Atualiza uma vaga
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string; unidadeId: string; vagaId: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId, torreId, unidadeId, vagaId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1),
      unidadeId: z.string().min(1),
      vagaId: z.string().min(1)
    }).safeParse({ condominioId, torreId, unidadeId, vagaId });

    if (!idsValidation.success) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem acesso de administrador
    const condominio = await prisma.condominio.findFirst({
      where: {
        id: condominioId,
        ativo: true,
        perfisUsuario: {
          some: {
            usuarioId: session.user.id,
            tipo: {
              in: ['administrador_mestre', 'administrador_condominio', 'sindico']
            },
            ativo: true
          }
        }
      }
    });

    if (!condominio) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    // Verificar se a vaga existe
    const vagaExistente = await prisma.vaga.findFirst({
      where: {
        id: vagaId,
        unidadeId: unidadeId,
        unidade: {
          torreId: torreId,
          torre: {
            condominioId: condominioId
          }
        }
      }
    });

    if (!vagaExistente) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    // Validar dados da requisição
    const body = await request.json();
    const validation = updateVagaSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const dadosAtualizacao = validation.data;

    // Se está alterando o número, verificar se não existe outro com o mesmo número na unidade
    if (dadosAtualizacao.numero && dadosAtualizacao.numero !== vagaExistente.numero) {
      const numeroExistente = await prisma.vaga.findFirst({
        where: {
          unidadeId: unidadeId,
          numero: dadosAtualizacao.numero,
          id: {
            not: vagaId
          }
        }
      });

      if (numeroExistente) {
        return NextResponse.json(
          { error: `Já existe uma vaga com o número "${dadosAtualizacao.numero}" nesta unidade` },
          { status: 409 }
        );
      }
    }

    // Atualizar a vaga
    const vagaAtualizada = await prisma.vaga.update({
      where: {
        id: vagaId
      },
      data: dadosAtualizacao,
      include: {
        unidade: {
          select: {
            id: true,
            numero: true,
            torre: {
              select: {
                id: true,
                nome: true,
                tipo: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(vagaAtualizada);

  } catch (error) {
    console.error('Erro ao atualizar vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/condominios/[id]/torres/[torreId]/unidades/[unidadeId]/vagas/[vagaId]
 * Remove uma vaga
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string; unidadeId: string; vagaId: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId, torreId, unidadeId, vagaId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1),
      unidadeId: z.string().min(1),
      vagaId: z.string().min(1)
    }).safeParse({ condominioId, torreId, unidadeId, vagaId });

    if (!idsValidation.success) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem acesso de administrador
    const condominio = await prisma.condominio.findFirst({
      where: {
        id: condominioId,
        ativo: true,
        perfisUsuario: {
          some: {
            usuarioId: session.user.id,
            tipo: {
              in: ['administrador_mestre', 'administrador_condominio', 'sindico']
            },
            ativo: true
          }
        }
      }
    });

    if (!condominio) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    // Verificar se a vaga existe
    const vaga = await prisma.vaga.findFirst({
      where: {
        id: vagaId,
        unidadeId: unidadeId,
        unidade: {
          torreId: torreId,
          torre: {
            condominioId: condominioId
          }
        }
      }
    });

    if (!vaga) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    // Remover a vaga
    await prisma.vaga.delete({
      where: {
        id: vagaId
      }
    });

    return NextResponse.json(
      { message: 'Vaga removida com sucesso' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro ao remover vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}