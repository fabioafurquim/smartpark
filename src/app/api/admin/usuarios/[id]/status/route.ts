import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';
import { ehAdministradorMestre } from '../../../../../../lib/auth';

const paramsSchema = z.object({
  id: z.string().min(1, 'ID do usuario invalido'),
});

const bodySchema = z.object({
  ativo: z.boolean('Status ativo deve ser um valor booleano'),
});

export async function PATCH(
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
        { erro: 'Acesso negado. Apenas administradores mestres podem alterar status de usuarios.' },
        { status: 403 }
      );
    }

    const { id } = paramsSchema.parse(await params);
    const dados = await request.json();
    const { ativo } = bodySchema.parse(dados);

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        perfis: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuario nao encontrado' }, { status: 404 });
    }

    if (usuario.id === (session.user as { id: string }).id && !ativo) {
      return NextResponse.json(
        { erro: 'Nao e possivel desativar seu proprio usuario' },
        { status: 400 }
      );
    }

    const isAdminMestre = usuario.perfis.some(
      (perfil) => perfil.tipo === 'administrador_mestre' && perfil.ativo
    );

    if (isAdminMestre && !ativo) {
      const totalAdminsMestreAtivos = await prisma.perfilUsuario.count({
        where: {
          tipo: 'administrador_mestre',
          ativo: true,
          usuarioId: {
            not: id,
          },
        },
      });

      if (totalAdminsMestreAtivos === 0) {
        return NextResponse.json(
          { erro: 'Nao e possivel desativar o ultimo administrador mestre ativo do sistema' },
          { status: 400 }
        );
      }
    }

    await prisma.perfilUsuario.updateMany({
      where: {
        usuarioId: id,
      },
      data: {
        ativo,
      },
    });

    const usuarioAtualizado = await prisma.usuario.findUnique({
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

    return NextResponse.json({
      mensagem: `Usuario ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      usuario: usuarioAtualizado,
    });
  } catch (error) {
    console.error('Erro ao alterar status do usuario:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}
