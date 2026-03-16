import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, temPermissao } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { UsuarioSessao } from '../../../../../types';
import { registrarEventoLocacao } from '../../../../../lib/locacao-eventos';

const registrarEventoSchema = z.object({
  tipo: z.enum(['ENTRADA_PORTARIA', 'SAIDA_PORTARIA', 'OBSERVACAO_PORTARIA']),
  descricao: z.string().max(300).optional(),
});

const EVENTO_CONFIG = {
  ENTRADA_PORTARIA: {
    titulo: 'Entrada registrada na portaria',
    notificacao: 'Entrada registrada para a locação da vaga',
  },
  SAIDA_PORTARIA: {
    titulo: 'Saída registrada na portaria',
    notificacao: 'Saída registrada para a locação da vaga',
  },
  OBSERVACAO_PORTARIA: {
    titulo: 'Observação da portaria',
    notificacao: 'A portaria adicionou uma observação à locação da vaga',
  },
} as const;

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
    const dados = registrarEventoSchema.parse(body);

    const locacao = await prisma.locacao.findUnique({
      where: { id },
      include: {
        vaga: true,
      },
    });

    if (!locacao) {
      return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 });
    }

    if (!temPermissao(usuario, 'monitorarLocacoes', locacao.vaga.condominioId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const config = EVENTO_CONFIG[dados.tipo];
    const descricao = dados.descricao?.trim() || undefined;

    await prisma.$transaction(async (tx) => {
      await registrarEventoLocacao(tx, {
        locacaoId: id,
        tipo: dados.tipo,
        titulo: config.titulo,
        descricao,
        usuarioId: usuario.id,
      });

      await tx.notificacao.create({
        data: {
          usuarioId: locacao.proprietarioId,
          tipo: 'LOCACAO_ATUALIZADA',
          titulo: config.titulo,
          mensagem: `${config.notificacao} ${locacao.vaga.numero}.${descricao ? ` ${descricao}` : ''}`,
          locacaoId: id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao registrar evento da locação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
