import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsuarioSessao } from '@/types';
import { ehAdministradorMestre, obterCondominiosUsuario } from '@/lib/auth';
import {
  atualizarUsuarioAdminSchema,
  obterCondominiosGerenciaveis,
  sincronizarVinculosUnidadeDoUsuario,
  usuarioPodeGerenciarUsuarioAlvo,
  usuarioPodeGerenciarUsuarios,
  validarCondominiosExistentes,
  validarEscopoPerfis,
  validarUnidadesDosPerfis,
} from '@/lib/usuarios-admin';

const paramsSchema = z.object({
  id: z.string().min(1, 'ID do usuario invalido'),
});

function construirIncludeUsuario(usuario: UsuarioSessao) {
  const condominiosGerenciaveis = obterCondominiosGerenciaveis(usuario);
  const filtroEscopo = ehAdministradorMestre(usuario)
    ? undefined
    : {
        condominioId: {
          in: condominiosGerenciaveis || [],
        },
      };

  return {
    perfis: {
      where: filtroEscopo,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    },
    unidades: {
      where: filtroEscopo,
      select: {
        id: true,
        numero: true,
        condominioId: true,
        torre: {
          select: {
            id: true,
            nome: true,
          },
        },
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: [{ condominio: { nome: 'asc' } }, { numero: 'asc' }],
    },
  } satisfies Prisma.UsuarioInclude;
}

async function buscarUsuarioAlvo(id: string) {
  return prisma.usuario.findUnique({
    where: { id },
    include: {
      perfis: true,
      unidades: {
        select: {
          id: true,
          condominioId: true,
        },
      },
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    const usuarioSessao = session.user as UsuarioSessao;
    if (!usuarioPodeGerenciarUsuarios(usuarioSessao)) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
    }

    const { id } = paramsSchema.parse(await params);
    const usuarioAlvo = await buscarUsuarioAlvo(id);

    if (!usuarioAlvo) {
      return NextResponse.json({ erro: 'Usuario nao encontrado' }, { status: 404 });
    }

    if (!usuarioPodeGerenciarUsuarioAlvo(usuarioSessao, usuarioAlvo.perfis)) {
      return NextResponse.json(
        { erro: 'Voce nao pode visualizar este usuario' },
        { status: 403 }
      );
    }

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id },
      include: construirIncludeUsuario(usuarioSessao),
    });

    return NextResponse.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuario:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Parametros invalidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    const usuarioSessao = session.user as UsuarioSessao;
    if (!usuarioPodeGerenciarUsuarios(usuarioSessao)) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
    }

    const { id } = paramsSchema.parse(await params);
    const dados = atualizarUsuarioAdminSchema.parse(await request.json());
    const usuarioAlvo = await buscarUsuarioAlvo(id);

    if (!usuarioAlvo) {
      return NextResponse.json({ erro: 'Usuario nao encontrado' }, { status: 404 });
    }

    if (!usuarioPodeGerenciarUsuarioAlvo(usuarioSessao, usuarioAlvo.perfis)) {
      return NextResponse.json(
        { erro: 'Voce nao pode editar este usuario' },
        { status: 403 }
      );
    }

    if (dados.perfis) {
      validarEscopoPerfis(usuarioSessao, dados.perfis);
    }

    const usuarioAtualizado = await prisma.$transaction(async (tx) => {
      const dataUpdate: Prisma.UsuarioUpdateInput = {};

      if (dados.nome) {
        dataUpdate.nome = dados.nome;
      }

      if (dados.email) {
        dataUpdate.email = dados.email;
      }

      if (dados.senha) {
        dataUpdate.senha = await hash(dados.senha, 10);
      }

      if (Object.keys(dataUpdate).length > 0) {
        await tx.usuario.update({
          where: { id },
          data: dataUpdate,
        });
      }

      if (dados.perfis) {
        await validarCondominiosExistentes(tx, dados.perfis);
        await validarUnidadesDosPerfis(tx, dados.perfis, id);

        if (ehAdministradorMestre(usuarioSessao)) {
          await tx.perfilUsuario.deleteMany({
            where: { usuarioId: id },
          });

          await tx.perfilUsuario.createMany({
            data: dados.perfis.map((perfil) => ({
              usuarioId: id,
              condominioId: perfil.condominioId,
              tipo: perfil.tipo,
              ativo: perfil.ativo ?? true,
              permissoes: perfil.permissoes ? (perfil.permissoes as Prisma.InputJsonValue) : undefined,
            })),
          });
        } else {
          const condominiosGerenciaveis = obterCondominiosGerenciaveis(usuarioSessao) || [];

          await tx.perfilUsuario.deleteMany({
            where: {
              usuarioId: id,
              condominioId: {
                in: condominiosGerenciaveis,
              },
            },
          });

          await tx.perfilUsuario.createMany({
            data: dados.perfis.map((perfil) => ({
              usuarioId: id,
              condominioId: perfil.condominioId,
              tipo: perfil.tipo,
              ativo: perfil.ativo ?? true,
              permissoes: perfil.permissoes ? (perfil.permissoes as Prisma.InputJsonValue) : undefined,
            })),
          });
        }

        await sincronizarVinculosUnidadeDoUsuario(tx, id, dados.perfis, usuarioSessao);
      }

      return tx.usuario.findUniqueOrThrow({
        where: { id },
        include: construirIncludeUsuario(usuarioSessao),
      });
    });

    return NextResponse.json({
      mensagem: 'Usuario atualizado com sucesso',
      usuario: usuarioAtualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar usuario:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && !('code' in error)) {
      return NextResponse.json({ erro: error.message }, { status: 400 });
    }

    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ erro: 'Email ja esta em uso' }, { status: 409 });
    }

    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    const usuarioSessao = session.user as UsuarioSessao;
    if (!usuarioPodeGerenciarUsuarios(usuarioSessao)) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
    }

    const { id } = paramsSchema.parse(await params);

    if (id === usuarioSessao.id) {
      return NextResponse.json(
        { erro: 'Nao e possivel excluir seu proprio usuario' },
        { status: 400 }
      );
    }

    const usuarioAlvo = await buscarUsuarioAlvo(id);

    if (!usuarioAlvo) {
      return NextResponse.json({ erro: 'Usuario nao encontrado' }, { status: 404 });
    }

    if (!usuarioPodeGerenciarUsuarioAlvo(usuarioSessao, usuarioAlvo.perfis)) {
      return NextResponse.json(
        { erro: 'Voce nao pode excluir este usuario' },
        { status: 403 }
      );
    }

    const possuiAdminMestre = usuarioAlvo.perfis.some(
      (perfil) => perfil.tipo === 'administrador_mestre' && perfil.ativo
    );

    if (possuiAdminMestre) {
      const totalAdminsMestre = await prisma.perfilUsuario.count({
        where: {
          tipo: 'administrador_mestre',
          ativo: true,
        },
      });

      if (totalAdminsMestre <= 1) {
        return NextResponse.json(
          { erro: 'Nao e possivel excluir o ultimo administrador mestre do sistema' },
          { status: 400 }
        );
      }
    }

    if (!ehAdministradorMestre(usuarioSessao)) {
      const condominiosAlvo = new Set(
        usuarioAlvo.perfis.map((perfil) => perfil.condominioId)
      );
      const condominiosSessao = obterCondominiosUsuario(usuarioSessao);
      const condominiosGerenciaveis = new Set(
        (obterCondominiosGerenciaveis(usuarioSessao) || []).concat(
          condominiosSessao === 'TODOS_CONDOMINIOS'
            ? []
            : condominiosSessao.map((condominio) => condominio.id)
        )
      );

      for (const condominioId of condominiosAlvo) {
        if (!condominiosGerenciaveis.has(condominioId)) {
          return NextResponse.json(
            { erro: 'Voce nao pode excluir um usuario fora do seu escopo' },
            { status: 403 }
          );
        }
      }
    }

    await prisma.usuario.delete({
      where: { id },
    });

    return NextResponse.json({ mensagem: 'Usuario excluido com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuario:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Parametros invalidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}
