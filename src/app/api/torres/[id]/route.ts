import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de torre/bloco
const updateTorreSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  tipo: z.enum(['TORRE', 'BLOCO'], {
    errorMap: () => ({ message: 'Tipo deve ser TORRE ou BLOCO' })
  }).optional()
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/torres/[id] - Busca torre/bloco específica
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const torre = await prisma.torre.findUnique({
      where: { id: params.id },
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
            andar: true,
            tipo: true
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
        { error: 'Torre/bloco não encontrada' },
        { status: 404 }
      );
    }

    const torreFormatada = {
      id: torre.id,
      nome: torre.nome,
      tipo: torre.tipo,
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
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTorreSchema.parse(body);

    // Verificar se a torre existe
    const torreExistente = await prisma.torre.findUnique({
      where: { id: params.id }
    });

    if (!torreExistente) {
      return NextResponse.json(
        { error: 'Torre/bloco não encontrada' },
        { status: 404 }
      );
    }

    // Se está alterando o nome, verificar duplicatas no mesmo condomínio
    if (validatedData.nome && validatedData.nome !== torreExistente.nome) {
      const torreComMesmoNome = await prisma.torre.findFirst({
        where: {
          nome: validatedData.nome,
          condominioId: torreExistente.condominioId,
          id: { not: params.id }
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
      where: { id: params.id },
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
        { error: 'Dados inválidos', details: error.errors },
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
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se a torre existe
    const torre = await prisma.torre.findUnique({
      where: { id: params.id },
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

    // Verificar se há unidades vinculadas
    if (torre._count.unidades > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível excluir torre/bloco que possui unidades vinculadas',
          details: `Esta torre/bloco possui ${torre._count.unidades} unidade(s) vinculada(s)` 
        },
        { status: 400 }
      );
    }

    await prisma.torre.delete({
      where: { id: params.id }
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