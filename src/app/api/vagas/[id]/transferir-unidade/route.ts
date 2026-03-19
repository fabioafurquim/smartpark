import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, temPermissao } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { UsuarioSessao } from '../../../../../types';

const transferirVagaSchema = z.object({
  unidadeId: z.string().min(1, 'Unidade e obrigatoria'),
});

const vagaTemMovimentacoesAtivas = async (vagaId: string) => {
  const [locacoesAtivas, reservasAtivas] = await Promise.all([
    prisma.locacao.count({
      where: {
        vagaId,
        status: { in: ['PENDENTE', 'ATIVA'] },
      },
    }),
    prisma.reserva.count({
      where: {
        vagaId,
        status: { in: ['ativa', 'confirmada', 'ATIVA', 'CONFIRMADA'] },
      },
    }),
  ]);

  return locacoesAtivas > 0 || reservasAtivas > 0;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const body = await request.json();
    const { unidadeId } = transferirVagaSchema.parse(body);

    const vaga = await prisma.vaga.findUnique({
      where: { id },
      select: {
        id: true,
        numero: true,
        unidadeId: true,
        condominioId: true,
      },
    });

    if (!vaga) {
      return NextResponse.json({ error: 'Vaga nao encontrada' }, { status: 404 });
    }

    if (!temPermissao(usuario, 'vincularVagaUnidade', vaga.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condominio especificado' },
        { status: 403 }
      );
    }

    if (unidadeId === vaga.unidadeId) {
      return NextResponse.json(
        { error: 'Selecione uma unidade diferente da atual' },
        { status: 400 }
      );
    }

    const unidadeDestino = await prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        condominioId: vaga.condominioId,
      },
      select: {
        id: true,
        numero: true,
        usuarioId: true,
      },
    });

    if (!unidadeDestino) {
      return NextResponse.json(
        { error: 'Unidade de destino nao encontrada neste condominio' },
        { status: 400 }
      );
    }

    const possuiMovimentacoesAtivas = await vagaTemMovimentacoesAtivas(vaga.id);
    if (possuiMovimentacoesAtivas) {
      return NextResponse.json(
        {
          error: 'Nao e possivel transferir uma vaga com locacoes ou reservas ativas',
        },
        { status: 400 }
      );
    }

    const vagaAtualizada = await prisma.vaga.update({
      where: { id: vaga.id },
      data: {
        unidadeId: unidadeDestino.id,
        proprietarioId: unidadeDestino.usuarioId ?? null,
      },
      include: {
        unidade: {
          select: {
            id: true,
            numero: true,
            torre: {
              select: {
                id: true,
                nome: true,
                tipo: true,
              },
            },
          },
        },
        proprietario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Vaga transferida com sucesso',
      vaga: {
        id: vagaAtualizada.id,
        numero: vagaAtualizada.numero,
        unidadeId: vagaAtualizada.unidadeId,
        proprietarioId: vagaAtualizada.proprietarioId,
        unidade: vagaAtualizada.unidade,
        proprietario: vagaAtualizada.proprietario,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao transferir vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
