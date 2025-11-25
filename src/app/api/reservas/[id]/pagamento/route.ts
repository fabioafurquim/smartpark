import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const confirmarPagamentoSchema = z.object({
  statusPagamento: z.enum(['CONFIRMADO', 'CANCELADO', 'REEMBOLSADO']),
  metodo: z.enum(['PIX', 'CARTAO', 'TRANSFERENCIA', 'MANUAL']).optional(),
  referencia: z.string().optional(),
});

/**
 * PUT /api/reservas/[id]/pagamento - Confirmar ou atualizar pagamento
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = confirmarPagamentoSchema.parse(body);

    // Buscar reserva existente
    const reservaExistente = await prisma.reserva.findUnique({
      where: { id },
    });

    if (!reservaExistente) {
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      );
    }

    // Validar transição de status
    const transicoesValidas: Record<string, string[]> = {
      PENDENTE: ['CONFIRMADO', 'CANCELADO'],
      CONFIRMADO: ['REEMBOLSADO', 'CANCELADO'],
      CANCELADO: [],
      REEMBOLSADO: [],
    };

    const statusAtual = (reservaExistente as any).statusPagamento as string;
    if (!transicoesValidas[statusAtual]?.includes(validatedData.statusPagamento)) {
      return NextResponse.json(
        {
          error: 'Transição de status inválida',
          statusAtual,
          statusSolicitado: validatedData.statusPagamento,
          transicoesPermitidas: transicoesValidas[statusAtual],
        },
        { status: 400 }
      );
    }

    // Atualizar status de pagamento
    const reservaAtualizada = await prisma.reserva.update({
      where: { id },
      data: {
        statusPagamento: validatedData.statusPagamento as any,
      },
    });

    // Log da transação (para auditoria)
    console.log(`Pagamento atualizado - Reserva: ${id}, Status: ${validatedData.statusPagamento}, Método: ${validatedData.metodo || 'N/A'}`);

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
 * GET /api/reservas/[id]/pagamento - Obter status de pagamento
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reserva = await prisma.reserva.findUnique({
      where: { id },
    });

    if (!reserva) {
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: reserva.id,
        valor: reserva.valor?.toString(),
        status: reserva.status,
        statusPagamento: (reserva as any).statusPagamento,
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
