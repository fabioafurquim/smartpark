import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  canManageCondominio,
  getReservaAccessScope,
} from '@/lib/reservas-auth';
import { UsuarioSessao } from '@/types';

const criarNotificacaoSchema = z.object({
  usuarioId: z.string().min(1, 'usuarioId e obrigatorio'),
  tipo: z.string().min(1, 'tipo e obrigatorio'),
  titulo: z.string().min(1, 'titulo e obrigatorio'),
  mensagem: z.string().min(1, 'mensagem e obrigatoria'),
  locacaoId: z.string().optional(),
});

async function getUsuarioAutenticado() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return session.user as UsuarioSessao;
}

/**
 * GET /api/notificacoes - Lista notificacoes do usuario logado
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioAutenticado();
    if (!usuario) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const apenasNaoLidas = searchParams.get('apenasNaoLidas') === 'true';
    const limite = parseInt(searchParams.get('limite') || '20', 10);

    const where: Record<string, unknown> = {
      usuarioId: usuario.id,
    };

    if (apenasNaoLidas) {
      where.lida = false;
    }

    const notificacoes = await prisma.notificacao.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: limite,
    });

    const naoLidas = await prisma.notificacao.count({
      where: {
        usuarioId: usuario.id,
        lida: false,
      },
    });

    return NextResponse.json({
      notificacoes,
      naoLidas,
    });
  } catch (error) {
    console.error('Erro ao buscar notificacoes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notificacoes - Criar notificacao com escopo validado
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioAutenticado();
    if (!usuario) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = criarNotificacaoSchema.parse(body);
    const accessScope = getReservaAccessScope(usuario);

    if (validatedData.usuarioId !== usuario.id) {
      const usuarioDestino = await prisma.usuario.findUnique({
        where: { id: validatedData.usuarioId },
        select: {
          perfis: {
            where: { ativo: true },
            select: {
              condominioId: true,
            },
          },
        },
      });

      if (!usuarioDestino) {
        return NextResponse.json(
          { error: 'Usuario de destino nao encontrado' },
          { status: 404 }
        );
      }

      const podeNotificar = usuarioDestino.perfis.some((perfil) =>
        canManageCondominio(accessScope, perfil.condominioId)
      );

      if (!podeNotificar) {
        return NextResponse.json(
          { error: 'Voce nao pode criar notificacoes para este usuario' },
          { status: 403 }
        );
      }
    }

    const notificacao = await prisma.notificacao.create({
      data: validatedData,
    });

    return NextResponse.json(notificacao, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar notificacao:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notificacoes - Marcar notificacoes como lidas
 */
export async function PATCH(request: NextRequest) {
  try {
    const usuario = await getUsuarioAutenticado();
    if (!usuario) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, marcarTodas } = body;

    if (marcarTodas) {
      await prisma.notificacao.updateMany({
        where: {
          usuarioId: usuario.id,
          lida: false,
        },
        data: { lida: true },
      });
    } else if (ids && Array.isArray(ids)) {
      await prisma.notificacao.updateMany({
        where: {
          id: { in: ids },
          usuarioId: usuario.id,
        },
        data: { lida: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar notificacoes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
