import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { UsuarioSessao } from '../../../types';

/**
 * GET /api/notificacoes - Lista notificações do usuário logado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const { searchParams } = new URL(request.url);
    const apenasNaoLidas = searchParams.get('apenasNaoLidas') === 'true';
    const limite = parseInt(searchParams.get('limite') || '20');

    const where: any = {
      usuarioId: usuario.id
    };

    if (apenasNaoLidas) {
      where.lida = false;
    }

    const notificacoes = await prisma.notificacao.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: limite
    });

    // Contar não lidas
    const naoLidas = await prisma.notificacao.count({
      where: {
        usuarioId: usuario.id,
        lida: false
      }
    });

    return NextResponse.json({
      notificacoes,
      naoLidas
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notificacoes - Criar notificação (uso interno)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { usuarioId, tipo, titulo, mensagem, locacaoId } = body;

    if (!usuarioId || !tipo || !titulo || !mensagem) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    const notificacao = await prisma.notificacao.create({
      data: {
        usuarioId,
        tipo,
        titulo,
        mensagem,
        locacaoId
      }
    });

    return NextResponse.json(notificacao, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notificacoes - Marcar notificações como lidas
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const body = await request.json();
    const { ids, marcarTodas } = body;

    if (marcarTodas) {
      // Marcar todas como lidas
      await prisma.notificacao.updateMany({
        where: {
          usuarioId: usuario.id,
          lida: false
        },
        data: { lida: true }
      });
    } else if (ids && Array.isArray(ids)) {
      // Marcar específicas como lidas
      await prisma.notificacao.updateMany({
        where: {
          id: { in: ids },
          usuarioId: usuario.id
        },
        data: { lida: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar notificações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
