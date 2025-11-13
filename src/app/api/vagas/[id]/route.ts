import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de vaga
const updateVagaSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório').optional(),
  tipo: z.enum(['comum', 'deficiente', 'idoso']).optional(),
  observacoes: z.string().optional()
});

/**
 * GET /api/vagas/[id] - Busca vaga específica
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

    const { id } = await params;
    const vaga = await prisma.vaga.findUnique({
      where: { id },
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        unidade: {
          select: {
            id: true,
            numero: true,
            proprietario: true,
            contato: true,
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

    if (!vaga) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    const vagaFormatada = {
      id: vaga.id,
      numero: vaga.numero,
      tipo: vaga.tipo,
      condominioId: vaga.condominioId,
      unidadeId: vaga.unidadeId,
      condominio: vaga.condominio,
      unidade: vaga.unidade,
      createdAt: vaga.criadoEm.toISOString(),
      updatedAt: vaga.atualizadoEm.toISOString()
    };

    return NextResponse.json(vagaFormatada);
  } catch (error) {
    console.error('Erro ao buscar vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vagas/[id] - Atualiza vaga
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

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateVagaSchema.parse(body);

    // Verificar se a vaga existe
    const vagaExistente = await prisma.vaga.findUnique({
      where: { id }
    });

    if (!vagaExistente) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    // Se está alterando o número, verificar duplicatas no mesmo condomínio
    if (validatedData.numero && validatedData.numero !== vagaExistente.numero) {
      const vagaComMesmoNumero = await prisma.vaga.findFirst({
        where: {
          numero: validatedData.numero,
          condominioId: vagaExistente.condominioId,
          id: { not: id }
        }
      });

      if (vagaComMesmoNumero) {
        return NextResponse.json(
          { error: 'Já existe uma vaga com este número neste condomínio' },
          { status: 400 }
        );
      }
    }

    const vagaAtualizada = await prisma.vaga.update({
      where: { id },
      data: validatedData,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        unidade: {
          select: {
            id: true,
            numero: true,
            proprietario: true,
            contato: true,
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

    const vagaFormatada = {
      id: vagaAtualizada.id,
      numero: vagaAtualizada.numero,
      tipo: vagaAtualizada.tipo,
      condominioId: vagaAtualizada.condominioId,
      unidadeId: vagaAtualizada.unidadeId,
      createdAt: vagaAtualizada.criadoEm.toISOString(),
      updatedAt: vagaAtualizada.atualizadoEm.toISOString()
    };

    return NextResponse.json(vagaFormatada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vagas/[id] - Remove vaga
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

    const { id } = await params;
    
    // Verificar se a vaga existe
    const vaga = await prisma.vaga.findUnique({
      where: { id }
    });

    if (!vaga) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se há reservas ativas para esta vaga
    const reservasAtivas = await prisma.reserva.count({
      where: {
        vagaId: id,
        status: {
          in: ['ATIVA', 'CONFIRMADA']
        }
      }
    });

    if (reservasAtivas > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível excluir vaga com reservas ativas',
          details: 'Cancele ou finalize as reservas antes de excluir a vaga' 
        },
        { status: 400 }
      );
    }

    await prisma.vaga.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Vaga excluída com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}