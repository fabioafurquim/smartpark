import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { hash, compare } from 'bcryptjs';

const mudarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
  novaSenha: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

/**
 * POST /api/perfil/mudar-senha
 * Permite que o usuário autenticado mude sua própria senha
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    const dados = await request.json();
    const dadosValidados = mudarSenhaSchema.parse(dados);

    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: (session.user as any).id },
    });

    if (!usuario) {
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o usuário tem senha (deve ter)
    if (!usuario.senha) {
      return NextResponse.json(
        { erro: 'Usuário não tem senha configurada' },
        { status: 400 }
      );
    }

    // Verificar senha atual
    const senhaValida = await compare(dadosValidados.senhaAtual, usuario.senha);
    if (!senhaValida) {
      return NextResponse.json(
        { erro: 'Senha atual incorreta' },
        { status: 400 }
      );
    }

    // Hash da nova senha
    const novaSenhaHash = await hash(dadosValidados.novaSenha, 10);

    // Atualizar senha
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha: novaSenhaHash },
    });

    return NextResponse.json({
      mensagem: 'Senha alterada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao mudar senha:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
