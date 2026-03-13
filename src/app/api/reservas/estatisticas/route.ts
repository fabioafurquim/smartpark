import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildReservaScopeWhere,
  canAccessCondominio,
  getReservaAccessScope,
} from '@/lib/reservas-auth';
import { UsuarioSessao } from '@/types';

/**
 * GET /api/reservas/estatisticas - Estatisticas agregadas de reservas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const accessScope = getReservaAccessScope(usuario);
    const { searchParams } = new URL(request.url);
    const condominioId = searchParams.get('condominioId') || undefined;

    if (condominioId && !canAccessCondominio(accessScope, condominioId)) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado para este condominio' },
        { status: 403 }
      );
    }

    const agora = new Date();
    const baseWhere: Record<string, unknown> = {};

    if (condominioId) {
      baseWhere.condominioId = condominioId;
    }

    const whereReservas = buildReservaScopeWhere(
      accessScope,
      usuario.id,
      baseWhere,
      condominioId
    );

    const whereVagas = accessScope.isAdminMestre
      ? condominioId
        ? { condominioId }
        : {}
      : condominioId
        ? { condominioId }
        : { condominioId: { in: accessScope.memberCondominioIds } };

    const [
      totalReservas,
      reservasAtivas,
      reservasHoje,
      totalVagas,
      reservasAtivasAgora,
      gruposStatus,
    ] = await Promise.all([
      prisma.reserva.count({ where: whereReservas }),
      prisma.reserva.count({
        where: {
          AND: [whereReservas, { status: 'ativa' }],
        },
      }),
      prisma.reserva.count({
        where: {
          AND: [
            whereReservas,
            {
              status: 'ativa',
              dataInicio: { lte: agora },
              dataFim: { gte: agora },
            },
          ],
        },
      }),
      prisma.vaga.count({ where: whereVagas }),
      prisma.reserva.count({
        where: {
          AND: [
            whereReservas,
            {
              status: 'ativa',
              dataInicio: { lte: agora },
              dataFim: { gte: agora },
            },
          ],
        },
      }),
      prisma.reserva.groupBy({
        by: ['status'],
        where: whereReservas,
        _count: { id: true },
      }),
    ]);

    const vagasDisponiveis = Math.max(totalVagas - reservasAtivasAgora, 0);

    const reservasPorStatus: Record<string, number> = {};
    for (const grupo of gruposStatus) {
      reservasPorStatus[grupo.status] = grupo._count.id;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReservas,
        reservasAtivas,
        reservasHoje,
        vagasDisponiveis,
        reservasPorStatus: {
          ativa: reservasPorStatus.ativa || 0,
          cancelada: reservasPorStatus.cancelada || 0,
          expirada: reservasPorStatus.expirada || 0,
          concluida: reservasPorStatus.concluida || 0,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao calcular estatisticas de reservas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
