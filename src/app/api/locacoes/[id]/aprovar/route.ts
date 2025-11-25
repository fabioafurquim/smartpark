import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { UsuarioSessao } from '../../../../../types';

/**
 * POST /api/locacoes/[id]/aprovar - Aprovar uma locação
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;

    // Buscar a locação
    const locacao = await prisma.locacao.findUnique({
      where: { id },
      include: {
        vaga: true,
        locatario: true,
        proprietario: true
      }
    });

    if (!locacao) {
      return NextResponse.json(
        { error: 'Locação não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o usuário é o proprietário da vaga
    if (locacao.proprietarioId !== usuario.id) {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode aprovar esta locação' },
        { status: 403 }
      );
    }

    // Verificar se está pendente
    if (locacao.status !== 'PENDENTE') {
      return NextResponse.json(
        { error: 'Esta locação não está pendente de aprovação' },
        { status: 400 }
      );
    }

    // Atualizar status para ATIVA
    const locacaoAtualizada = await prisma.locacao.update({
      where: { id },
      data: { status: 'ATIVA' }
    });

    // Criar notificação para o locatário
    await prisma.notificacao.create({
      data: {
        usuarioId: locacao.locatarioId,
        tipo: 'LOCACAO_APROVADA',
        titulo: 'Locação Aprovada!',
        mensagem: `Sua solicitação de locação da vaga ${locacao.vaga.numero} foi aprovada pelo proprietário.`,
        locacaoId: locacao.id
      }
    });

    return NextResponse.json({
      success: true,
      locacao: locacaoAtualizada
    });
  } catch (error) {
    console.error('Erro ao aprovar locação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
