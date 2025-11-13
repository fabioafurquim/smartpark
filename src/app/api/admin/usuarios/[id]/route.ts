import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { ehAdministradorMestre } from '../../../../../lib/auth';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().uuid('ID do usuário deve ser um UUID válido'),
});

/**
 * GET /api/admin/usuarios/[id]
 * Busca um usuário específico por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem acessar esta funcionalidade.' },
        { status: 403 }
      );
    }

    // Validar parâmetros
    const { id } = paramsSchema.parse(await params);

    // Buscar usuário
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
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Parâmetros inválidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/usuarios/[id]
 * Exclui um usuário (apenas para administrador mestre)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem excluir usuários.' },
        { status: 403 }
      );
    }

    // Validar parâmetros
    const { id } = paramsSchema.parse(await params);

    // Verificar se o usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        perfis: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Não permitir exclusão do próprio usuário
    if (usuario.id === (session.user as any).id) {
      return NextResponse.json(
        { erro: 'Não é possível excluir seu próprio usuário' },
        { status: 400 }
      );
    }

    // Verificar se é o último administrador mestre
    const isAdminMestre = usuario.perfis.some(
      perfil => perfil.tipo === 'ADMINISTRADOR_MESTRE'
    );

    if (isAdminMestre) {
      const totalAdminsMestre = await prisma.perfilUsuario.count({
        where: {
          tipo: 'ADMINISTRADOR_MESTRE',
          ativo: true,
        },
      });

      if (totalAdminsMestre <= 1) {
        return NextResponse.json(
          { erro: 'Não é possível excluir o último administrador mestre do sistema' },
          { status: 400 }
        );
      }
    }

    // Excluir usuário e seus perfis (cascade)
    await prisma.usuario.delete({
      where: { id },
    });

    return NextResponse.json(
      { mensagem: 'Usuário excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Parâmetros inválidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}