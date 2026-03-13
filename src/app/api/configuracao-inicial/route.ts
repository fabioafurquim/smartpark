import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { configuracaoInicialSchema } from '@/lib/validations';

async function obterEstadoConfiguracao() {
  const [configuracaoExistente, totalUsuarios, totalCondominios, totalPerfis] =
    await Promise.all([
      prisma.configuracaoSistema.findFirst(),
      prisma.usuario.count(),
      prisma.condominio.count(),
      prisma.perfilUsuario.count(),
    ]);

  const bancoJaPossuiDados =
    totalUsuarios > 0 || totalCondominios > 0 || totalPerfis > 0;
  const configurado =
    configuracaoExistente?.administradorMestreConfigurado || bancoJaPossuiDados;

  return {
    configuracaoExistente,
    bancoJaPossuiDados,
    configurado,
  };
}

export async function POST(request: NextRequest) {
  try {
    const estado = await obterEstadoConfiguracao();

    if (estado.configurado) {
      return NextResponse.json(
        { erro: 'Sistema ja foi configurado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const dadosValidados = configuracaoInicialSchema.parse(body);

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: dadosValidados.emailAdmin },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { erro: 'Ja existe um usuario com este email' },
        { status: 400 }
      );
    }

    const senhaHash = await bcrypt.hash(dadosValidados.senhaAdmin, 12);

    const resultado = await prisma.$transaction(async (tx) => {
      const novoUsuario = await tx.usuario.create({
        data: {
          nome: dadosValidados.nomeAdmin,
          email: dadosValidados.emailAdmin,
          senha: senhaHash,
          ativo: true,
        },
      });

      const condominioMestre = await tx.condominio.create({
        data: {
          nome: 'Sistema - Administracao',
          endereco: 'Sistema',
          codigoUnico: 'ADMIN_MASTER',
          ativo: true,
        },
      });

      await tx.perfilUsuario.create({
        data: {
          usuarioId: novoUsuario.id,
          condominioId: condominioMestre.id,
          tipo: 'administrador_mestre',
          ativo: true,
        },
      });

      const configuracao = estado.configuracaoExistente
        ? await tx.configuracaoSistema.update({
            where: { id: estado.configuracaoExistente.id },
            data: {
              administradorMestreConfigurado: true,
            },
          })
        : await tx.configuracaoSistema.create({
            data: {
              administradorMestreConfigurado: true,
            },
          });

      return {
        usuario: novoUsuario,
        configuracao,
      };
    });

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: 'Sistema configurado com sucesso',
        dados: {
          usuarioId: resultado.usuario.id,
          configuracaoId: resultado.configuracao.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro na configuracao inicial:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          erro: 'Dados invalidos',
          detalhes: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { erro: 'Email ja esta em uso' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        erro: 'Erro interno do servidor',
        mensagem: 'Ocorreu um erro durante a configuracao do sistema',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const estado = await obterEstadoConfiguracao();

    const configuracao =
      estado.configuracaoExistente ||
      (await prisma.configuracaoSistema.create({
        data: {
          administradorMestreConfigurado: estado.configurado,
        },
      }));

    if (!configuracao.administradorMestreConfigurado && estado.configurado) {
      await prisma.configuracaoSistema.update({
        where: {
          id: configuracao.id,
        },
        data: {
          administradorMestreConfigurado: true,
        },
      });
    }

    return NextResponse.json({
      configurado: estado.configurado,
      dados: {
        id: configuracao.id,
        administradorMestreConfigurado: estado.configurado,
        criadoEm: configuracao.criadoEm,
        atualizadoEm: configuracao.atualizadoEm,
      },
    });
  } catch (error) {
    console.error('Erro ao verificar configuracao:', error);

    return NextResponse.json(
      {
        erro: 'Erro interno do servidor',
        mensagem: 'Nao foi possivel verificar a configuracao do sistema',
      },
      { status: 500 }
    );
  }
}
