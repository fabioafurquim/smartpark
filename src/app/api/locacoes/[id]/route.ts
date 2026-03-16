import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, temPermissao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';
import {
  getStatusLocacaoLabel,
  getStatusPagamentoLocacaoLabel,
  registrarEventoLocacao,
} from '../../../../lib/locacao-eventos';

const atualizarStatusSchema = z.object({
  status: z.enum(['ATIVA', 'CANCELADA', 'FINALIZADA']),
  observacao: z.string().max(300).optional(),
});

const includeLocacaoDetalhe = {
  vaga: {
    include: {
      unidade: {
        select: {
          numero: true,
          torre: {
            select: {
              nome: true,
            },
          },
        },
      },
      condominio: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  },
  locatario: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
  proprietario: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
  eventos: {
    orderBy: {
      criadoEm: 'desc' as const,
    },
    take: 10,
    select: {
      id: true,
      tipo: true,
      titulo: true,
      descricao: true,
      criadoEm: true,
      usuario: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  },
};

function podeAlterarStatus(
  usuario: UsuarioSessao,
  locacao: {
    locatarioId: string;
    proprietarioId: string;
    vaga: { condominioId: string };
  },
  statusDestino: 'ATIVA' | 'CANCELADA' | 'FINALIZADA'
) {
  const ehLocatario = locacao.locatarioId === usuario.id;
  const ehProprietario = locacao.proprietarioId === usuario.id;
  const ehOperacional =
    temPermissao(usuario, 'aprovarSolicitacoes', locacao.vaga.condominioId) ||
    temPermissao(usuario, 'monitorarLocacoes', locacao.vaga.condominioId);

  if (statusDestino === 'ATIVA') {
    return ehProprietario || ehOperacional;
  }

  if (statusDestino === 'CANCELADA') {
    return ehLocatario || ehProprietario || ehOperacional;
  }

  if (statusDestino === 'FINALIZADA') {
    return ehProprietario || ehOperacional;
  }

  return false;
}

/**
 * PUT /api/locacoes/[id]
 */
export async function PUT(
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
    const validatedData = atualizarStatusSchema.parse(body);

    const locacao = await prisma.locacao.findUnique({
      where: { id },
      include: {
        vaga: {
          include: {
            condominio: true,
          },
        },
      },
    });

    if (!locacao) {
      return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 });
    }

    if (!podeAlterarStatus(usuario, locacao, validatedData.status)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (locacao.status === validatedData.status) {
      return NextResponse.json(
        { error: 'A locação já está neste status' },
        { status: 400 }
      );
    }

    const transicoesValidas: Record<string, string[]> = {
      PENDENTE: ['ATIVA', 'CANCELADA'],
      ATIVA: ['FINALIZADA', 'CANCELADA'],
      REJEITADA: [],
      CANCELADA: [],
      FINALIZADA: [],
    };

    if (!transicoesValidas[locacao.status]?.includes(validatedData.status)) {
      return NextResponse.json(
        {
          error: `Não é possível mudar de ${getStatusLocacaoLabel(locacao.status)} para ${getStatusLocacaoLabel(validatedData.status)}.`,
        },
        { status: 400 }
      );
    }

    const statusPagamento =
      validatedData.status === 'FINALIZADA' && locacao.statusPagamento === 'PENDENTE'
        ? 'CONFIRMADO'
        : locacao.statusPagamento;

    const descricaoEvento = validatedData.observacao?.trim()
      ? validatedData.observacao.trim()
      : validatedData.status === 'FINALIZADA'
        ? `Locação encerrada. ${getStatusPagamentoLocacaoLabel(statusPagamento)}.`
        : undefined;

    const locacaoAtualizada = await prisma.$transaction(async (tx) => {
      const locacaoSalva = await tx.locacao.update({
        where: { id },
        data: {
          status: validatedData.status,
          statusPagamento,
          pagamentoObservacao:
            statusPagamento === 'CONFIRMADO'
              ? 'Pagamento tratado manualmente neste piloto e marcado como confirmado no encerramento.'
              : locacao.pagamentoObservacao,
        },
        include: includeLocacaoDetalhe,
      });

      await registrarEventoLocacao(tx, {
        locacaoId: id,
        tipo: `STATUS_${validatedData.status}`,
        titulo: getStatusLocacaoLabel(validatedData.status),
        descricao: descricaoEvento,
        usuarioId: usuario.id,
      });

      const destinatarioId =
        usuario.id === locacao.locatarioId ? locacao.proprietarioId : locacao.locatarioId;

      await tx.notificacao.create({
        data: {
          usuarioId: destinatarioId,
          tipo:
            validatedData.status === 'FINALIZADA'
              ? 'LOCACAO_FINALIZADA'
              : 'LOCACAO_CANCELADA',
          titulo: getStatusLocacaoLabel(validatedData.status),
          mensagem: descricaoEvento || `A locação da vaga ${locacao.vaga.numero} mudou de status.`,
          locacaoId: id,
        },
      });

      return locacaoSalva;
    });

    return NextResponse.json(locacaoAtualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar locação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * GET /api/locacoes/[id]
 */
export async function GET(
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
      include: includeLocacaoDetalhe,
    });

    if (!locacao) {
      return NextResponse.json({ error: 'Locação não encontrada' }, { status: 404 });
    }

    const podeVisualizar =
      locacao.locatarioId === usuario.id ||
      locacao.proprietarioId === usuario.id ||
      temPermissao(usuario, 'monitorarLocacoes', locacao.vaga.condominio.id) ||
      temPermissao(usuario, 'aprovarSolicitacoes', locacao.vaga.condominio.id);

    if (!podeVisualizar) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json(locacao);
  } catch (error) {
    console.error('Erro ao buscar locação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
