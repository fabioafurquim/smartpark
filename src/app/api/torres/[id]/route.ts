import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, temPermissao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';
import { UsuarioSessao } from '../../../../types';

// Schema de validação para atualização de torre
const updateTorreSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  tipo: z.enum(['TORRE', 'BLOCO']).optional(),
  descricao: z.string().optional()
});

/**
 * GET /api/torres/[id] - Busca torre específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const torre = await prisma.torre.findUnique({
      where: { id },
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        unidades: {
          select: {
            id: true,
            numero: true,
            proprietario: true,
            contato: true
          },
          orderBy: { numero: 'asc' }
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
        { error: 'Torre não encontrada' },
        { status: 404 }
      );
    }

    if (!temPermissao(usuario, 'gerenciarEstrutura', torre.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condomínio especificado' },
        { status: 403 }
      );
    }

    const torreFormatada = {
      id: torre.id,
      nome: torre.nome,
      tipo: torre.tipo,
      descricao: torre.descricao,
      condominioId: torre.condominioId,
      condominio: torre.condominio,
      unidades: torre.unidades,
      totalUnidades: torre._count.unidades,
      createdAt: torre.criadoEm.toISOString(),
      updatedAt: torre.atualizadoEm.toISOString()
    };

    return NextResponse.json(torreFormatada);
  } catch (error) {
    console.error('Erro ao buscar torre:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/torres/[id] - Atualiza torre/bloco
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateTorreSchema.parse(body);

    // Verificar se a torre existe
    const torreExistente = await prisma.torre.findUnique({
      where: { id }
    });

    if (!torreExistente) {
      return NextResponse.json(
        { error: 'Torre/bloco não encontrada' },
        { status: 404 }
      );
    }

    if (!temPermissao(usuario, 'gerenciarEstrutura', torreExistente.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condomínio especificado' },
        { status: 403 }
      );
    }

    // Se está alterando o nome, verificar duplicatas no mesmo condomínio
    if (validatedData.nome && validatedData.nome !== torreExistente.nome) {
      const torreComMesmoNome = await prisma.torre.findFirst({
        where: {
          nome: validatedData.nome,
          condominioId: torreExistente.condominioId,
          id: { not: id }
        }
      });

      if (torreComMesmoNome) {
        return NextResponse.json(
          { error: 'Já existe uma torre/bloco com este nome neste condomínio' },
          { status: 400 }
        );
      }
    }

    const torreAtualizada = await prisma.torre.update({
      where: { id },
      data: validatedData,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        _count: {
          select: {
            unidades: true
          }
        }
      }
    });

    const torreFormatada = {
      id: torreAtualizada.id,
      nome: torreAtualizada.nome,
      tipo: torreAtualizada.tipo,
      condominioId: torreAtualizada.condominioId,
      condominio: torreAtualizada.condominio,
      totalUnidades: torreAtualizada._count.unidades,
      createdAt: torreAtualizada.criadoEm.toISOString(),
      updatedAt: torreAtualizada.atualizadoEm.toISOString()
    };

    return NextResponse.json(torreFormatada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar torre:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/torres/[id] - Remove torre/bloco
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    // Verificar se a torre existe
    const torre = await prisma.torre.findUnique({
      where: { id },
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
        { error: 'Torre/bloco não encontrada' },
        { status: 404 }
      );
    }

    if (!temPermissao(usuario, 'gerenciarEstrutura', torre.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condomínio especificado' },
        { status: 403 }
      );
    }

    // Verificar se há unidades vinculadas
    if (torre._count.unidades > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível excluir esta estrutura',
          details: `Esta torre/bloco possui ${torre._count.unidades} unidade(s) vinculada(s)`
        },
        { status: 400 }
      );
    }

    await prisma.torre.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Torre/bloco excluída com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir torre:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
