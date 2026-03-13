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

const confirmarPagamentoSchema = z.object({
  statusPagamento: z.enum(['CONFIRMADO', 'CANCELADO', 'REEMBOLSADO']),
  metodo: z.enum(['PIX', 'CARTAO', 'TRANSFERENCIA', 'MANUAL']).optional(),
  referencia: z.string().optional(),
});

async function getUsuarioAutenticado() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return session.user as UsuarioSessao;
}

async function carregarReserva(id: string) {
  return prisma.reserva.findUnique({
    where: { id },
  });
}

/**
 * PUT /api/reservas/[id]/pagamento - Confirmar ou atualizar pagamento
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
    const validatedData = confirmarPagamentoSchema.parse(body);
    const reservaExistente = await carregarReserva(id);

    if (!reservaExistente) {
      return NextResponse.json(
        { error: 'Reserva nao encontrada' },
        { status: 404 }
      );
    }

    const accessScope = getReservaAccessScope(usuario);
    const canManage = canManageCondominio(accessScope, reservaExistente.condominioId);
    const isOwner = reservaExistente.usuarioId === usuario.id;

    if (!canManage && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const transicoesValidas: Record<string, string[]> = {
      PENDENTE: ['CONFIRMADO', 'CANCELADO'],
      CONFIRMADO: ['REEMBOLSADO', 'CANCELADO'],
      CANCELADO: [],
      REEMBOLSADO: [],
    };

    const statusAtual = reservaExistente.statusPagamento;
    if (!transicoesValidas[statusAtual]?.includes(validatedData.statusPagamento)) {
      return NextResponse.json(
        {
          error: 'Transicao de status invalida',
          statusAtual,
          statusSolicitado: validatedData.statusPagamento,
          transicoesPermitidas: transicoesValidas[statusAtual],
        },
        { status: 400 }
      );
    }

    const reservaAtualizada = await prisma.reserva.update({
      where: { id },
      data: {
        statusPagamento: validatedData.statusPagamento,
      },
    });

    console.log(
      `Pagamento atualizado - Reserva: ${id}, Status: ${validatedData.statusPagamento}, Metodo: ${validatedData.metodo || 'N/A'}`
    );

    return NextResponse.json({
      success: true,
      data: {
        id: reservaAtualizada.id,
        statusPagamento: reservaAtualizada.statusPagamento,
        valor: reservaAtualizada.valor?.toString(),
        metodo: validatedData.metodo,
        referencia: validatedData.referencia,
        atualizadoEm: reservaAtualizada.atualizadoEm.toISOString(),
      },
    });
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);

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
 * GET /api/reservas/[id]/pagamento - Obter status de pagamento
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
    const reserva = await carregarReserva(id);

    if (!reserva) {
      return NextResponse.json(
        { error: 'Reserva nao encontrada' },
        { status: 404 }
      );
    }

    const accessScope = getReservaAccessScope(usuario);
    const canManage = canManageCondominio(accessScope, reserva.condominioId);
    const isOwner = reserva.usuarioId === usuario.id;

    if (!canManage && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: reserva.id,
        valor: reserva.valor?.toString(),
        status: reserva.status,
        statusPagamento: reserva.statusPagamento,
        dataInicio: reserva.dataInicio.toISOString(),
        dataFim: reserva.dataFim.toISOString(),
        tipoLocacao: reserva.tipoLocacao,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar status de pagamento:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}
