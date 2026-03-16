import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { UsuarioSessao } from '../../../../../types';
import { registrarEventoLocacao } from '../../../../../lib/locacao-eventos';

/**
 * POST /api/locacoes/[id]/aprovar
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;

    const locacao = await prisma.locacao.findUnique({
      where: { id },
      include: {
        vaga: true,
        locatario: true,
      },
    });

    if (!locacao) {
      return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 });
    }

    if (locacao.proprietarioId !== usuario.id) {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode aprovar esta locação' },
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
      const locacaoAprovada = await tx.locacao.update({
        where: { id },
        data: {
          status: 'ATIVA',
          pagamentoObservacao:
            'Cobrança ainda fora do app. Em breve, o pagamento poderá ser acompanhado aqui.',
        },
      });

      await registrarEventoLocacao(tx, {
        locacaoId: id,
        tipo: 'LOCACAO_APROVADA',
        titulo: 'Locação aprovada',
        descricao: `O proprietário aprovou a solicitação da vaga ${locacao.vaga.numero}.`,
        usuarioId: usuario.id,
      });

      await tx.notificacao.create({
        data: {
          usuarioId: locacao.locatarioId,
          tipo: 'LOCACAO_APROVADA',
          titulo: 'Locação aprovada',
          mensagem: `Sua solicitação de locação da vaga ${locacao.vaga.numero} foi aprovada pelo proprietário.`,
          locacaoId: locacao.id,
        },
      });

      return locacaoAprovada;
    });

    return NextResponse.json({
      success: true,
      locacao: locacaoAtualizada,
    });
  } catch (error) {
    console.error('Erro ao aprovar locação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
