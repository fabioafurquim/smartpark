import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  canManageCondominio,
  getReservaAccessScope,
} from '@/lib/reservas-auth';
import { UsuarioSessao } from '@/types';

const updateReservaSchema = z.object({
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  status: z.enum(['ativa', 'cancelada', 'expirada', 'concluida']).optional(),
  observacoes: z.string().optional(),
});

async function getUsuarioAutenticado() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return session.user as UsuarioSessao;
}

async function getReservaComAcesso(id: string, usuario: UsuarioSessao) {
  const reserva = await prisma.reserva.findUnique({
    where: { id },
    include: {
      vaga: {
        select: {
          id: true,
          numero: true,
          tipo: true,
          condominioId: true,
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
    return { reserva: null, canManage: false, canAccess: false };
  }

  const accessScope = getReservaAccessScope(usuario);
  const canManage = canManageCondominio(accessScope, reserva.condominioId);
  const canAccess = canManage || reserva.usuarioId === usuario.id;

  return { reserva, canManage, canAccess };
}

/**
 * GET /api/reservas/[id] - Busca uma reserva especifica
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await getUsuarioAutenticado();
    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { reserva, canAccess } = await getReservaComAcesso(id, usuario);

    if (!reserva) {
      return NextResponse.json(
        { success: false, error: 'Reserva nao encontrada' },
        { status: 404 }
      );
    }

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
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
    const usuario = await getUsuarioAutenticado();
    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateReservaSchema.parse(body);
    const { reserva, canManage, canAccess } = await getReservaComAcesso(id, usuario);

    if (!reserva) {
      return NextResponse.json(
        { success: false, error: 'Reserva nao encontrada' },
        { status: 404 }
      );
    }

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      );
    }

    if (!canManage && validatedData.status && validatedData.status !== 'cancelada') {
      return NextResponse.json(
        {
          success: false,
          error: 'Somente sindicos e administradores podem alterar este status',
        },
        { status: 403 }
      );
    }

    if (!canManage && reserva.status !== 'ativa') {
      return NextResponse.json(
        {
          success: false,
          error: 'Apenas reservas ativas podem ser alteradas pelo proprio usuario',
        },
        { status: 400 }
      );
    }

    if (validatedData.dataInicio || validatedData.dataFim) {
      const novaDataInicio = validatedData.dataInicio
        ? new Date(validatedData.dataInicio)
        : reserva.dataInicio;
      const novaDataFim = validatedData.dataFim
        ? new Date(validatedData.dataFim)
        : reserva.dataFim;

      if (novaDataFim <= novaDataInicio) {
        return NextResponse.json(
          {
            success: false,
            error: 'Data de fim deve ser posterior a data de inicio',
          },
          { status: 400 }
        );
      }

      const conflitos = await prisma.reserva.findMany({
        where: {
          vagaId: reserva.vagaId,
          id: { not: id },
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
            error: 'Conflito de horarios com outras reservas',
            conflitos,
          },
          { status: 409 }
        );
      }
    }

    const reservaAtualizada = await prisma.reserva.update({
      where: { id },
      data: {
        ...(validatedData.dataInicio && {
          dataInicio: new Date(validatedData.dataInicio),
        }),
        ...(validatedData.dataFim && {
          dataFim: new Date(validatedData.dataFim),
        }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.observacoes !== undefined && {
          observacoes: validatedData.observacoes,
        }),
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
          error: 'Dados invalidos',
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await getUsuarioAutenticado();
    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { reserva, canAccess } = await getReservaComAcesso(id, usuario);

    if (!reserva) {
      return NextResponse.json(
        { success: false, error: 'Reserva nao encontrada' },
        { status: 404 }
      );
    }

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      );
    }

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
