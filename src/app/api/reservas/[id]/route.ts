import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de reserva
const updateReservaSchema = z.object({
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  status: z.enum(['ativa', 'cancelada', 'expirada', 'concluida']).optional(),
  observacoes: z.string().optional(),
});

/**
 * GET /api/reservas/[id] - Busca uma reserva específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: {
        vaga: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            unidade: {
              select: {
                numero: true,
                torre: {
                  select: {
                    nome: true,
                  },
                },
              },
            },
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!reserva) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reserva não encontrada',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: reserva,
    });
  } catch (error) {
    console.error('Erro ao buscar reserva:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reservas/[id] - Atualiza uma reserva
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateReservaSchema.parse(body);

    // Verificar se a reserva existe
    const reservaExistente = await prisma.reserva.findUnique({
      where: { id },
      include: {
        vaga: true,
      },
    });

    if (!reservaExistente) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reserva não encontrada',
        },
        { status: 404 }
      );
    }

    // Se está alterando datas, verificar conflitos
    if (validatedData.dataInicio || validatedData.dataFim) {
      const novaDataInicio = validatedData.dataInicio 
        ? new Date(validatedData.dataInicio) 
        : reservaExistente.dataInicio;
      const novaDataFim = validatedData.dataFim 
        ? new Date(validatedData.dataFim) 
        : reservaExistente.dataFim;

      // Verificar se a data de fim é posterior à data de início
      if (novaDataFim <= novaDataInicio) {
        return NextResponse.json(
          {
            success: false,
            error: 'Data de fim deve ser posterior à data de início',
          },
          { status: 400 }
        );
      }

      // Verificar conflitos com outras reservas ativas
      const conflitos = await prisma.reserva.findMany({
        where: {
          vagaId: reservaExistente.vagaId,
          id: { not: id }, // Excluir a própria reserva
          status: 'ativa',
          OR: [
            {
              dataInicio: {
                lte: novaDataFim,
              },
              dataFim: {
                gte: novaDataInicio,
              },
            },
          ],
        },
      });

      if (conflitos.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Conflito de horários com outras reservas',
            conflitos,
          },
          { status: 409 }
        );
      }
    }

    // Atualizar a reserva
    const reservaAtualizada = await prisma.reserva.update({
      where: { id },
      data: {
        ...(validatedData.dataInicio && { dataInicio: new Date(validatedData.dataInicio) }),
        ...(validatedData.dataFim && { dataFim: new Date(validatedData.dataFim) }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.observacoes !== undefined && { observacoes: validatedData.observacoes }),
      },
      include: {
        vaga: {
          select: {
            numero: true,
            tipo: true,
            unidade: {
              select: {
                numero: true,
                torre: {
                  select: {
                    nome: true,
                  },
                },
              },
            },
          },
        },
        usuario: {
          select: {
            nome: true,
            email: true,
          },
        },
        condominio: {
          select: {
            nome: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: reservaAtualizada,
      message: 'Reserva atualizada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar reserva:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reservas/[id] - Cancela uma reserva
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar se a reserva existe
    const reservaExistente = await prisma.reserva.findUnique({
      where: { id },
    });

    if (!reservaExistente) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reserva não encontrada',
        },
        { status: 404 }
      );
    }

    // Marcar como cancelada ao invés de deletar
    const reservaCancelada = await prisma.reserva.update({
      where: { id },
      data: {
        status: 'cancelada',
      },
      include: {
        vaga: {
          select: {
            numero: true,
            tipo: true,
            unidade: {
              select: {
                numero: true,
                torre: {
                  select: {
                    nome: true,
                  },
                },
              },
            },
          },
        },
        usuario: {
          select: {
            nome: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: reservaCancelada,
      message: 'Reserva cancelada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao cancelar reserva:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}