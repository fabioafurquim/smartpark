import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de unidade
const updateUnidadeSchema = z.object({
  numero: z.string().min(1, 'Número da unidade é obrigatório').optional(),
  andar: z.number().int().min(0, 'Andar deve ser um número inteiro não negativo').optional(),
  area: z.number().positive('Área deve ser um número positivo').optional(),
  quartos: z.number().int().min(0, 'Número de quartos deve ser um inteiro não negativo').optional(),
  banheiros: z.number().int().min(0, 'Número de banheiros deve ser um inteiro não negativo').optional(),
  observacoes: z.string().optional()
});

/**
 * GET /api/condominios/[id]/torres/[torreId]/unidades/[unidadeId]
 * Busca uma unidade específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string; unidadeId: string }> }
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

    const { id: condominioId, torreId, unidadeId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1),
      unidadeId: z.string().min(1)
    }).safeParse({ condominioId, torreId, unidadeId });

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

    // Buscar a unidade com informações da torre
    const unidade = await prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        torreId: torreId,
        torre: {
          condominioId: condominioId
        }
      },
      include: {
        torre: {
          select: {
            id: true,
            nome: true,
            tipo: true,
            condominioId: true
          }
        },
        vagas: {
          orderBy: {
            numero: 'asc'
          }
        },
        _count: {
          select: {
            vagas: true
          }
        }
      }
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(unidade);

  } catch (error) {
    console.error('Erro ao buscar unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/condominios/[id]/torres/[torreId]/unidades/[unidadeId]
 * Atualiza uma unidade
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string; unidadeId: string }> }
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

    const { id: condominioId, torreId, unidadeId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1),
      unidadeId: z.string().min(1)
    }).safeParse({ condominioId, torreId, unidadeId });

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

    // Verificar se a unidade existe
    const unidadeExistente = await prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        torreId: torreId,
        torre: {
          condominioId: condominioId
        }
      }
    });

    if (!unidadeExistente) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    // Validar dados da requisição
    const body = await request.json();
    const validation = updateUnidadeSchema.safeParse(body);
    
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

    // Se está alterando o número, verificar se não existe outro com o mesmo número na torre
    if (dadosAtualizacao.numero && dadosAtualizacao.numero !== unidadeExistente.numero) {
      const numeroExistente = await prisma.unidade.findFirst({
        where: {
          torreId: torreId,
          numero: dadosAtualizacao.numero,
          id: {
            not: unidadeId
          }
        }
      });

      if (numeroExistente) {
        return NextResponse.json(
          { error: `Já existe uma unidade com o número "${dadosAtualizacao.numero}" nesta torre/bloco` },
          { status: 409 }
        );
      }
    }

    // Atualizar a unidade
    const unidadeAtualizada = await prisma.unidade.update({
      where: {
        id: unidadeId
      },
      data: dadosAtualizacao,
      include: {
        torre: {
          select: {
            id: true,
            nome: true,
            tipo: true
          }
        },
        _count: {
          select: {
            vagas: true
          }
        }
      }
    });

    return NextResponse.json(unidadeAtualizada);

  } catch (error) {
    console.error('Erro ao atualizar unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/condominios/[id]/torres/[torreId]/unidades/[unidadeId]
 * Remove uma unidade
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string; unidadeId: string }> }
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

    const { id: condominioId, torreId, unidadeId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1),
      unidadeId: z.string().min(1)
    }).safeParse({ condominioId, torreId, unidadeId });

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

    // Verificar se a unidade existe e se tem vagas
    const unidade = await prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        torreId: torreId,
        torre: {
          condominioId: condominioId
        }
      },
      include: {
        _count: {
          select: {
            vagas: true
          }
        }
      }
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se há vagas cadastradas
    if (unidade._count.vagas > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir esta unidade pois há ${unidade._count.vagas} vaga(s) de estacionamento cadastrada(s)` },
        { status: 409 }
      );
    }

    // Remover a unidade
    await prisma.unidade.delete({
      where: {
        id: unidadeId
      }
    });

    return NextResponse.json(
      { message: 'Unidade removida com sucesso' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro ao remover unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}