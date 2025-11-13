import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reservas/estatisticas - Estatísticas agregadas de reservas
 */
export async function GET(_request: NextRequest) {
  try {
    const agora = new Date();

    const [totalReservas, reservasAtivas, reservasHoje, totalVagas, reservasAtivasAgora, gruposStatus] = await Promise.all([
      prisma.reserva.count(),
      prisma.reserva.count({ where: { status: 'ativa' } }),
      prisma.reserva.count({
        where: {
          status: 'ativa',
          dataInicio: { lte: agora },
          dataFim: { gte: agora },
        },
      }),
      prisma.vaga.count(),
      prisma.reserva.count({
        where: {
          status: 'ativa',
          dataInicio: { lte: agora },
          dataFim: { gte: agora },
        },
      }),
      prisma.reserva.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const vagasDisponiveis = Math.max(totalVagas - reservasAtivasAgora, 0);

    const reservasPorStatus: Record<string, number> = {};
    for (const g of gruposStatus) {
      reservasPorStatus[g.status] = g._count.id;
    }

    const estatisticas = {
      totalReservas,
      reservasAtivas,
      reservasHoje,
      vagasDisponiveis,
      reservasPorStatus: {
        ativa: reservasPorStatus['ativa'] || 0,
        cancelada: reservasPorStatus['cancelada'] || 0,
        expirada: reservasPorStatus['expirada'] || 0,
        concluida: reservasPorStatus['concluida'] || 0,
      },
    };

    return NextResponse.json({ success: true, data: estatisticas });
  } catch (error) {
    console.error('Erro ao calcular estatísticas de reservas:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}