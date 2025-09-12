import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de vaga
const updateVagaSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório').optional(),
  tipo: z.enum(['CARRO', 'MOTO', 'DEFICIENTE', 'IDOSO'], {
    errorMap: () => ({ message: 'Tipo deve ser CARRO, MOTO, DEFICIENTE ou IDOSO' })
  }).optional(),
  status: z.enum(['LIVRE', 'OCUPADA', 'RESERVADA', 'MANUTENCAO'], {
    errorMap: () => ({ message: 'Status deve ser LIVRE, OCUPADA, RESERVADA ou MANUTENCAO' })
  }).optional(),
  observacoes: z.string().optional()
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/vagas/[id] - Busca vaga específica
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

    const vaga = await prisma.vaga.findUnique({
      where: { id: params.id },
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
            telefone: true,
            email: true,
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
      status: vaga.status,
      observacoes: vaga.observacoes,
      condominioId: vaga.condominioId,
      unidadeId: vaga.unidadeId,
      condominio: vaga.condominio,
      unidade: vaga.unidade,
      createdAt: vaga.createdAt.toISOString(),
      updatedAt: vaga.updatedAt.toISOString()
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
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateVagaSchema.parse(body);

    // Verificar se a vaga existe
    const vagaExistente = await prisma.vaga.findUnique({
      where: { id: params.id }
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
          id: { not: params.id }
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
      where: { id: params.id },
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
      status: vagaAtualizada.status,
      observacoes: vagaAtualizada.observacoes,
      condominioId: vagaAtualizada.condominioId,
      unidadeId: vagaAtualizada.unidadeId,
      condominio: vagaAtualizada.condominio,
      unidade: vagaAtualizada.unidade,
      createdAt: vagaAtualizada.createdAt.toISOString(),
      updatedAt: vagaAtualizada.updatedAt.toISOString()
    };

    return NextResponse.json(vagaFormatada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
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
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se a vaga existe
    const vaga = await prisma.vaga.findUnique({
      where: { id: params.id }
    });

    if (!vaga) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se a vaga está ocupada ou reservada
    if (vaga.status === 'OCUPADA' || vaga.status === 'RESERVADA') {
      return NextResponse.json(
        { 
          error: `Não é possível excluir vaga com status ${vaga.status}`,
          details: 'Altere o status da vaga para LIVRE antes de excluí-la' 
        },
        { status: 400 }
      );
    }

    await prisma.vaga.delete({
      where: { id: params.id }
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