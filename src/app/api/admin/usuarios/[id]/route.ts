import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { ehAdministradorMestre } from '../../../../../lib/auth';

const paramsSchema = z.object({
  id: z.string().cuid('ID do usuario invalido'),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem acessar esta funcionalidade.' },
        { status: 403 }
      );
    }

    const { id } = paramsSchema.parse(await params);

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        perfis: {
          include: {
            condominio: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuario nao encontrado' }, { status: 404 });
    }

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem excluir usuarios.' },
        { status: 403 }
      );
    }

    const { id } = paramsSchema.parse(await params);

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        perfis: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuario nao encontrado' }, { status: 404 });
    }

    if (usuario.id === (session.user as { id: string }).id) {
      return NextResponse.json(
        { erro: 'Nao e possivel excluir seu proprio usuario' },
        { status: 400 }
      );
    }

    const isAdminMestre = usuario.perfis.some(
      (perfil) => perfil.tipo === 'administrador_mestre' && perfil.ativo
    );

    if (isAdminMestre) {
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

    await prisma.usuario.delete({
      where: { id },
    });

    return NextResponse.json({ mensagem: 'Usuario excluido com sucesso' }, { status: 200 });
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem atualizar usuarios.' },
        { status: 403 }
      );
    }

    const { id } = paramsSchema.parse(await params);
    const dados = await request.json();

    const atualizarUsuarioSchema = z.object({
      nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').optional(),
      email: z.string().email('Email invalido').optional(),
      senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').optional(),
      perfis: z
        .array(
          z.object({
            condominioId: z.string().min(1, 'ID do condominio e obrigatorio'),
            tipo: z.enum([
              'administrador_mestre',
              'administrador_condominio',
              'sindico',
              'porteiro',
              'morador',
            ]),
            ativo: z.boolean().optional(),
            permissoes: z.record(z.string(), z.boolean()).optional(),
          })
        )
        .optional(),
    });

    const dadosValidados = atualizarUsuarioSchema.parse(dados);

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
      include: { perfis: true },
    });

    if (!usuarioExistente) {
      return NextResponse.json({ erro: 'Usuario nao encontrado' }, { status: 404 });
    }

    const dataUpdate: Record<string, unknown> = {};

    if (dadosValidados.nome) {
      dataUpdate.nome = dadosValidados.nome;
    }

    if (dadosValidados.email) {
      dataUpdate.email = dadosValidados.email;
    }

    if (dadosValidados.senha) {
      dataUpdate.senha = await hash(dadosValidados.senha, 10);
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dataUpdate,
      include: {
        perfis: {
          include: {
            condominio: {
              select: { id: true, nome: true },
            },
          },
        },
      },
    });

    if (dadosValidados.perfis) {
      await prisma.perfilUsuario.deleteMany({
        where: { usuarioId: id },
      });

      await prisma.perfilUsuario.createMany({
        data: dadosValidados.perfis.map((perfil) => ({
          usuarioId: id,
          condominioId: perfil.condominioId,
          tipo: perfil.tipo,
          ativo: perfil.ativo ?? true,
          permissoes: perfil.permissoes ? (perfil.permissoes as any) : undefined,
        })),
      });

      const usuarioComPerfisAtualizados = await prisma.usuario.findUnique({
        where: { id },
        include: {
          perfis: {
            include: {
              condominio: {
                select: { id: true, nome: true },
              },
            },
          },
        },
      });

      return NextResponse.json({
        mensagem: 'Usuario atualizado com sucesso',
        usuario: usuarioComPerfisAtualizados,
      });
    }

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

    if (typeof error === 'object' && error && (error as any).code === 'P2002') {
      return NextResponse.json({ erro: 'Email ja esta em uso' }, { status: 409 });
    }

    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}
