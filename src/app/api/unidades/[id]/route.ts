import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de unidade
const updateUnidadeSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório').optional(),
  andar: z.number().int().min(0, 'Andar deve ser um número inteiro não negativo').optional(),
  tipo: z.enum(['APARTAMENTO', 'SALA_COMERCIAL', 'LOJA', 'COBERTURA'], {
    errorMap: () => ({ message: 'Tipo deve ser APARTAMENTO, SALA_COMERCIAL, LOJA ou COBERTURA' })
  }).optional(),
  proprietario: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  observacoes: z.string().optional()
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/unidades/[id] - Busca unidade específica
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

    const unidade = await prisma.unidade.findUnique({
      where: { id: params.id },
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        torre: {
          select: {
            id: true,
            nome: true,
            tipo: true
          }
        },
        vagas: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            status: true
          },
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

    const unidadeFormatada = {
      id: unidade.id,
      numero: unidade.numero,
      andar: unidade.andar,
      tipo: unidade.tipo,
      proprietario: unidade.proprietario,
      telefone: unidade.telefone,
      email: unidade.email,
      observacoes: unidade.observacoes,
      condominioId: unidade.condominioId,
      torreId: unidade.torreId,
      condominio: unidade.condominio,
      torre: unidade.torre,
      vagas: unidade.vagas,
      totalVagas: unidade._count.vagas,
      createdAt: unidade.criadoEm.toISOString(),
      updatedAt: unidade.atualizadoEm.toISOString()
    };

    return NextResponse.json(unidadeFormatada);
  } catch (error) {
    console.error('Erro ao buscar unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/unidades/[id] - Atualiza unidade
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
    const validatedData = updateUnidadeSchema.parse(body);

    // Verificar se a unidade existe
    const unidadeExistente = await prisma.unidade.findUnique({
      where: { id: params.id }
    });

    if (!unidadeExistente) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    // Se está alterando o número, verificar duplicatas na mesma torre
    if (validatedData.numero && validatedData.numero !== unidadeExistente.numero) {
      const unidadeComMesmoNumero = await prisma.unidade.findFirst({
        where: {
          numero: validatedData.numero,
          torreId: unidadeExistente.torreId,
          id: { not: params.id }
        }
      });

      if (unidadeComMesmoNumero) {
        return NextResponse.json(
          { error: 'Já existe uma unidade com este número nesta torre/bloco' },
          { status: 400 }
        );
      }
    }

    const unidadeAtualizada = await prisma.unidade.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
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

    const unidadeFormatada = {
      id: unidadeAtualizada.id,
      numero: unidadeAtualizada.numero,
      andar: unidadeAtualizada.andar,
      tipo: unidadeAtualizada.tipo,
      proprietario: unidadeAtualizada.proprietario,
      telefone: unidadeAtualizada.telefone,
      email: unidadeAtualizada.email,
      observacoes: unidadeAtualizada.observacoes,
      condominioId: unidadeAtualizada.condominioId,
      torreId: unidadeAtualizada.torreId,
      condominio: unidadeAtualizada.condominio,
      torre: unidadeAtualizada.torre,
      totalVagas: unidadeAtualizada._count.vagas,
      createdAt: unidadeAtualizada.criadoEm.toISOString(),
      updatedAt: unidadeAtualizada.atualizadoEm.toISOString()
    };

    return NextResponse.json(unidadeFormatada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/unidades/[id] - Remove unidade
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

    // Verificar se a unidade existe
    const unidade = await prisma.unidade.findUnique({
      where: { id: params.id },
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

    // Verificar se há vagas vinculadas
    if (unidade._count.vagas > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível excluir unidade que possui vagas vinculadas',
          details: `Esta unidade possui ${unidade._count.vagas} vaga(s) vinculada(s)` 
        },
        { status: 400 }
      );
    }

    await prisma.unidade.delete({
      where: { id: params.id }
    });

    return NextResponse.json(
      { message: 'Unidade excluída com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}