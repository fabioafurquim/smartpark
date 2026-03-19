import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, temPermissao } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { UsuarioSessao } from '../../../../../types';

const transferirMoradorSchema = z.object({
  usuarioId: z.string().min(1, 'Usuario e obrigatorio'),
});

const unidadeTemMovimentacoesAtivas = async (unidadeId: string) => {
  const [locacoesAtivas, reservasAtivas] = await Promise.all([
    prisma.locacao.count({
      where: {
        vaga: { unidadeId },
        status: { in: ['PENDENTE', 'ATIVA'] },
      },
    }),
    prisma.reserva.count({
      where: {
        vaga: { unidadeId },
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
    const { usuarioId } = transferirMoradorSchema.parse(body);

    const unidadeDestino = await prisma.unidade.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    if (!unidadeDestino) {
      return NextResponse.json({ error: 'Unidade nao encontrada' }, { status: 404 });
    }

    if (!temPermissao(usuario, 'vincularMoradorUnidade', unidadeDestino.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condominio especificado' },
        { status: 403 }
      );
    }

    const morador = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        perfis: {
          where: {
            condominioId: unidadeDestino.condominioId,
            tipo: 'morador',
            ativo: true,
          },
        },
      },
    });

    if (!morador || morador.perfis.length === 0) {
      return NextResponse.json(
        { error: 'Usuario selecionado nao e um morador ativo deste condominio' },
        { status: 400 }
      );
    }

    const unidadesAtuaisDoMorador = await prisma.unidade.findMany({
      where: {
        condominioId: unidadeDestino.condominioId,
        usuarioId,
      },
      select: {
        id: true,
        numero: true,
      },
    });

    const unidadeOrigem = unidadesAtuaisDoMorador.find((unidade) => unidade.id !== id) || null;

    if (unidadesAtuaisDoMorador.length > 1 && !unidadeOrigem) {
      return NextResponse.json(
        {
          error:
            'Este morador esta vinculado a mais de uma unidade. Corrija manualmente antes de transferir.',
        },
        { status: 400 }
      );
    }

    if (unidadeOrigem) {
      const origemTemMovimentacoesAtivas = await unidadeTemMovimentacoesAtivas(unidadeOrigem.id);

      if (origemTemMovimentacoesAtivas) {
        return NextResponse.json(
          {
            error:
              'Nao e possivel transferir este morador porque a unidade atual possui locacoes ou reservas ativas',
          },
          { status: 400 }
        );
      }
    }

    const trocaMoradorDestino =
      unidadeDestino.usuarioId !== null && unidadeDestino.usuarioId !== usuarioId;

    if (trocaMoradorDestino) {
      const destinoTemMovimentacoesAtivas = await unidadeTemMovimentacoesAtivas(unidadeDestino.id);

      if (destinoTemMovimentacoesAtivas) {
        return NextResponse.json(
          {
            error:
              'Nao e possivel trocar o morador desta unidade porque existem locacoes ou reservas ativas',
          },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      if (unidadeOrigem) {
        await tx.unidade.update({
          where: { id: unidadeOrigem.id },
          data: { usuarioId: null },
        });

        await tx.vaga.updateMany({
          where: { unidadeId: unidadeOrigem.id },
          data: { proprietarioId: null },
        });
      }

      await tx.unidade.update({
        where: { id: unidadeDestino.id },
        data: { usuarioId },
      });

      await tx.vaga.updateMany({
        where: { unidadeId: unidadeDestino.id },
        data: { proprietarioId: usuarioId },
      });
    });

    const unidadeAtualizada = await prisma.unidade.findUnique({
      where: { id: unidadeDestino.id },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Morador transferido com sucesso',
      unidade: unidadeAtualizada,
      origem: unidadeOrigem,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao transferir morador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
