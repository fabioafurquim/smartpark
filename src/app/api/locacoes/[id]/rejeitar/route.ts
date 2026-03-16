import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { UsuarioSessao } from '../../../../../types';
import { registrarEventoLocacao } from '../../../../../lib/locacao-eventos';

/**
 * POST /api/locacoes/[id]/rejeitar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const body = await request.json();
    const motivo =
      typeof body?.motivo === 'string' && body.motivo.trim() ? body.motivo.trim() : '';

    const locacao = await prisma.locacao.findUnique({
      where: { id },
      include: {
        vaga: true,
      },
    });

    if (!locacao) {
      return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 });
    }

    if (locacao.proprietarioId !== usuario.id) {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode rejeitar esta locação' },
        { status: 403 }
      );
    }

    if (locacao.status !== 'PENDENTE') {
      return NextResponse.json(
        { error: 'Esta locação não está pendente de aprovação' },
        { status: 400 }
      );
    }

    const locacaoAtualizada = await prisma.$transaction(async (tx) => {
      const locacaoRejeitada = await tx.locacao.update({
        where: { id },
        data: { status: 'REJEITADA' },
      });

      await registrarEventoLocacao(tx, {
        locacaoId: id,
        tipo: 'LOCACAO_REJEITADA',
        titulo: 'Solicitação rejeitada',
        descricao: motivo
          ? `O proprietário rejeitou a solicitação. Motivo: ${motivo}`
          : 'O proprietário rejeitou a solicitação.',
        usuarioId: usuario.id,
      });

      await tx.notificacao.create({
        data: {
          usuarioId: locacao.locatarioId,
          tipo: 'LOCACAO_REJEITADA',
          titulo: 'Locação rejeitada',
          mensagem: `Sua solicitação de locação da vaga ${locacao.vaga.numero} foi rejeitada.${motivo ? ` Motivo: ${motivo}` : ''}`,
          locacaoId: locacao.id,
        },
      });

      return locacaoRejeitada;
    });

    return NextResponse.json({
      success: true,
      locacao: locacaoAtualizada,
    });
  } catch (error) {
    console.error('Erro ao rejeitar locação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
