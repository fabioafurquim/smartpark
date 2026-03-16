import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { autoCadastroMoradorSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dados = autoCadastroMoradorSchema.parse(body);
    const codigoCondominio = dados.codigoCondominio.trim().toUpperCase();

    const condominio = await prisma.condominio.findUnique({
      where: {
        codigoUnico: codigoCondominio,
      },
      select: {
        id: true,
        ativo: true,
      },
    });

    if (!condominio || !condominio.ativo) {
      return NextResponse.json({ error: 'Condomínio não encontrado' }, { status: 404 });
    }

    const unidade = await prisma.unidade.findFirst({
      where: {
        id: dados.unidadeId,
        condominioId: condominio.id,
      },
      select: {
        id: true,
        usuarioId: true,
        solicitacoesCadastro: {
          where: {
            status: 'pendente',
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada para este condomínio' },
        { status: 404 }
      );
    }

    if (unidade.usuarioId) {
      return NextResponse.json(
        { error: 'Esta unidade já possui um responsável vinculado' },
        { status: 409 }
      );
    }

    if (unidade.solicitacoesCadastro.length > 0) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação pendente para esta unidade' },
        { status: 409 }
      );
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: {
        email: dados.email,
      },
      include: {
        perfis: {
          where: {
            ativo: true,
          },
        },
        solicitacoesCadastro: {
          where: {
            status: 'pendente',
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (usuarioExistente?.perfis.length) {
      return NextResponse.json(
        { error: 'Este e-mail já possui acesso ativo ao sistema' },
        { status: 409 }
      );
    }

    if (usuarioExistente?.solicitacoesCadastro.length) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação pendente para este usuário' },
        { status: 409 }
      );
    }

    const senhaHash = await hash(dados.senha, 10);

    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = usuarioExistente
        ? await tx.usuario.update({
            where: {
              id: usuarioExistente.id,
            },
            data: {
              nome: dados.nome,
              senha: senhaHash,
              ativo: true,
            },
          })
        : await tx.usuario.create({
            data: {
              nome: dados.nome,
              email: dados.email,
              senha: senhaHash,
              ativo: true,
            },
          });

      const solicitacao = await tx.solicitacaoCadastro.create({
        data: {
          usuarioId: usuario.id,
          condominioId: condominio.id,
          unidadeId: unidade.id,
          status: 'pendente',
        },
      });

      return { usuario, solicitacao };
    });

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: 'Solicitação enviada para aprovação do condomínio',
        usuarioId: resultado.usuario.id,
        solicitacaoId: resultado.solicitacao.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar solicitação de cadastro:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Não foi possível concluir o cadastro' }, { status: 500 });
  }
}
