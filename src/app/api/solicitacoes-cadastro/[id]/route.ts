import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processarSolicitacaoSchema } from '@/lib/validations';
import { UsuarioSessao } from '@/types';
import {
  obterCondominiosGerenciados,
  podeGerenciarSolicitacoes,
} from '@/lib/solicitacoes-cadastro';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;

    if (!podeGerenciarSolicitacoes(usuario)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const dados = processarSolicitacaoSchema.parse(body);
    const condominiosPermitidos = obterCondominiosGerenciados(usuario);

    const solicitacao = await prisma.solicitacaoCadastro.findUnique({
      where: {
        id,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
        unidade: {
          include: {
            vagas: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!solicitacao) {
      return NextResponse.json(
        { error: 'Solicitacao nao encontrada' },
        { status: 404 }
      );
    }

    if (
      condominiosPermitidos &&
      !condominiosPermitidos.includes(solicitacao.condominioId)
    ) {
      return NextResponse.json(
        { error: 'Condominio fora do seu escopo' },
        { status: 403 }
      );
    }

    if (solicitacao.status !== 'pendente') {
      return NextResponse.json(
        { error: 'Esta solicitacao ja foi processada' },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      if (dados.status === 'aprovado' && solicitacao.unidadeId) {
        const unidadeAtualizada = await tx.unidade.findUnique({
          where: {
            id: solicitacao.unidadeId,
          },
          select: {
            id: true,
            usuarioId: true,
          },
        });

        if (unidadeAtualizada?.usuarioId && unidadeAtualizada.usuarioId !== solicitacao.usuarioId) {
          throw new Error('A unidade ja foi vinculada a outro usuario');
        }

        await tx.perfilUsuario.upsert({
          where: {
            usuarioId_condominioId_tipo: {
              usuarioId: solicitacao.usuarioId,
              condominioId: solicitacao.condominioId,
              tipo: 'morador',
            },
          },
          create: {
            usuarioId: solicitacao.usuarioId,
            condominioId: solicitacao.condominioId,
            tipo: 'morador',
            ativo: true,
          },
          update: {
            ativo: true,
          },
        });

        await tx.unidade.update({
          where: {
            id: solicitacao.unidadeId,
          },
          data: {
            usuarioId: solicitacao.usuarioId,
          },
        });

        await tx.vaga.updateMany({
          where: {
            unidadeId: solicitacao.unidadeId,
          },
          data: {
            proprietarioId: solicitacao.usuarioId,
          },
        });
      }

      const solicitacaoAtualizada = await tx.solicitacaoCadastro.update({
        where: {
          id: solicitacao.id,
        },
        data: {
          status: dados.status,
          observacoes: dados.observacoes,
        },
      });

      await tx.notificacao.create({
        data: {
          usuarioId: solicitacao.usuarioId,
          tipo: 'SISTEMA',
          titulo:
            dados.status === 'aprovado'
              ? 'Cadastro aprovado'
              : 'Cadastro nao aprovado',
          mensagem:
            dados.status === 'aprovado'
              ? `Seu vinculo com ${solicitacao.condominio.nome} foi aprovado e seu acesso de morador esta liberado.`
              : `Sua solicitacao de vinculo com ${solicitacao.condominio.nome} foi rejeitada.${dados.observacoes ? ` Motivo: ${dados.observacoes}` : ''}`,
        },
      });

      return solicitacaoAtualizada;
    });

    return NextResponse.json({
      sucesso: true,
      solicitacao: resultado,
    });
  } catch (error) {
    console.error('Erro ao processar solicitacao de cadastro:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Dados invalidos',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}
