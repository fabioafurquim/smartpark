import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de torre/bloco
const updateTorreSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  tipo: z.enum(['torre', 'bloco']).optional(),
  descricao: z.string().optional()
});

/**
 * GET /api/condominios/[id]/torres/[torreId]
 * Busca uma torre/bloco específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId, torreId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1)
    }).safeParse({ condominioId, torreId });

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
            usuarioId: (session.user as any).id,
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

    // Buscar a torre/bloco
    const torre = await prisma.torre.findFirst({
      where: {
        id: torreId,
        condominioId: condominioId
      },
      include: {
        unidades: {
          include: {
            _count: {
              select: {
                vagas: true
              }
            }
          },
          orderBy: {
            numero: 'asc'
          }
        },
        _count: {
          select: {
            unidades: true
          }
        }
      }
    });

    if (!torre) {
      return NextResponse.json(
        { error: 'Torre/Bloco não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(torre);

  } catch (error) {
    console.error('Erro ao buscar torre:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/condominios/[id]/torres/[torreId]
 * Atualiza uma torre/bloco
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId, torreId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1)
    }).safeParse({ condominioId, torreId });

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
            usuarioId: (session.user as any).id,
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

    // Verificar se a torre existe
    const torreExistente = await prisma.torre.findFirst({
      where: {
        id: torreId,
        condominioId: condominioId
      }
    });

    if (!torreExistente) {
      return NextResponse.json(
        { error: 'Torre/Bloco não encontrado' },
        { status: 404 }
      );
    }

    // Validar dados da requisição
    const body = await request.json();
    const validation = updateTorreSchema.safeParse(body);
    
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

    // Se está alterando o nome, verificar se não existe outro com o mesmo nome
    if (dadosAtualizacao.nome && dadosAtualizacao.nome !== torreExistente.nome) {
      const nomeExistente = await prisma.torre.findFirst({
        where: {
          condominioId: condominioId,
          nome: dadosAtualizacao.nome,
          id: {
            not: torreId
          }
        }
      });

      if (nomeExistente) {
        return NextResponse.json(
          { error: `Já existe um(a) ${dadosAtualizacao.tipo || torreExistente.tipo} com este nome neste condomínio` },
          { status: 409 }
        );
      }
    }

    // Atualizar a torre/bloco
    const torreAtualizada = await prisma.torre.update({
      where: {
        id: torreId
      },
      data: dadosAtualizacao,
      include: {
        _count: {
          select: {
            unidades: true
          }
        }
      }
    });

    return NextResponse.json(torreAtualizada);

  } catch (error) {
    console.error('Erro ao atualizar torre:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/condominios/[id]/torres/[torreId]
 * Remove uma torre/bloco
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId, torreId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1)
    }).safeParse({ condominioId, torreId });

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
            usuarioId: (session.user as any).id,
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

    // Verificar se a torre existe e se tem unidades
    const torre = await prisma.torre.findFirst({
      where: {
        id: torreId,
        condominioId: condominioId
      },
      include: {
        _count: {
          select: {
            unidades: true
          }
        }
      }
    });

    if (!torre) {
      return NextResponse.json(
        { error: 'Torre/Bloco não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se há unidades cadastradas
    if (torre._count.unidades > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir esta ${torre.tipo} pois há ${torre._count.unidades} unidade(s) cadastrada(s)` },
        { status: 409 }
      );
    }

    // Remover a torre/bloco
    await prisma.torre.delete({
      where: {
        id: torreId
      }
    });

    return NextResponse.json(
      { message: `${torre.tipo === 'torre' ? 'Torre' : 'Bloco'} removido(a) com sucesso` },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro ao remover torre:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}