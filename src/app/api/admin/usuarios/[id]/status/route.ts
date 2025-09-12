import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ehAdministradorMestre } from '@/lib/auth';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().uuid('ID do usuário deve ser um UUID válido'),
});

const bodySchema = z.object({
  ativo: z.boolean('Status ativo deve ser um valor booleano'),
});

/**
 * PATCH /api/admin/usuarios/[id]/status
 * Altera o status ativo/inativo de todos os perfis de um usuário
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem alterar status de usuários.' },
        { status: 403 }
      );
    }

    // Validar parâmetros
    const { id } = paramsSchema.parse(params);
    const dados = await request.json();
    const { ativo } = bodySchema.parse(dados);

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

    // Não permitir desativar o próprio usuário
    if (usuario.id === session.user.id && !ativo) {
      return NextResponse.json(
        { erro: 'Não é possível desativar seu próprio usuário' },
        { status: 400 }
      );
    }

    // Verificar se é o último administrador mestre ativo
    const isAdminMestre = usuario.perfis.some(
      perfil => perfil.tipo === 'ADMINISTRADOR_MESTRE' && perfil.ativo
    );

    if (isAdminMestre && !ativo) {
      const totalAdminsMestreAtivos = await prisma.perfilUsuario.count({
        where: {
          tipo: 'ADMINISTRADOR_MESTRE',
          ativo: true,
          usuarioId: {
            not: id, // Excluir o usuário atual da contagem
          },
        },
      });

      if (totalAdminsMestreAtivos === 0) {
        return NextResponse.json(
          { erro: 'Não é possível desativar o último administrador mestre ativo do sistema' },
          { status: 400 }
        );
      }
    }

    // Atualizar status de todos os perfis do usuário
    await prisma.perfilUsuario.updateMany({
      where: {
        usuarioId: id,
      },
      data: {
        ativo,
      },
    });

    // Buscar usuário atualizado
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
      mensagem: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      usuario: usuarioAtualizado,
    });
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}