import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { ehAdministradorMestre } from '../../../../../lib/auth';
import { z } from 'zod';
import { hash } from 'bcryptjs';

/**
 * PUT /api/admin/usuarios/[id]
 * Atualiza um usuário (apenas para administrador mestre)
 */
export async function PUT(
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
        { erro: 'Acesso negado. Apenas administradores mestres podem atualizar usuários.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const dados = await request.json();

    // Schema de validação para atualização de usuário
    const atualizarUsuarioSchema = z.object({
      nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').optional(),
      email: z.string().email('Email inválido').optional(),
      senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').optional(),
      perfis: z.array(
        z.object({
          condominioId: z.string().min(1, 'ID do condomínio é obrigatório'),
          tipo: z.enum(['administrador_mestre', 'administrador_condominio', 'sindico', 'morador']),
          ativo: z.boolean().optional(),
          permissoes: z.record(z.string(), z.boolean()).optional(),
        })
      ).optional(),
    });

    const dadosValidados = atualizarUsuarioSchema.parse(dados);

    // Verificar se o usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
      include: { perfis: true },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { erro: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const dataUpdate: any = {};
    
    if (dadosValidados.nome) {
      dataUpdate.nome = dadosValidados.nome;
    }
    
    if (dadosValidados.email) {
      dataUpdate.email = dadosValidados.email;
    }
    
    if (dadosValidados.senha) {
      dataUpdate.senha = await hash(dadosValidados.senha, 10);
    }

    // Atualizar usuário
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dataUpdate,
      include: {
        perfis: {
          include: {
            condominio: {
              select: { id: true, nome: true }
            }
          }
        }
      }
    });

    // Atualizar perfis se fornecidos
    if (dadosValidados.perfis) {
      // Deletar perfis antigos
      await prisma.perfilUsuario.deleteMany({
        where: { usuarioId: id }
      });

      // Criar novos perfis
      await prisma.perfilUsuario.createMany({
        data: dadosValidados.perfis.map((p) => ({
          usuarioId: id,
          condominioId: p.condominioId,
          tipo: p.tipo,
          ativo: p.ativo ?? true,
          permissoes: p.permissoes ? (p.permissoes as any) : undefined,
        })),
      });

      // Buscar usuário atualizado com novos perfis
      const usuarioComPerfisAtualizados = await prisma.usuario.findUnique({
        where: { id },
        include: {
          perfis: {
            include: {
              condominio: {
                select: { id: true, nome: true }
              }
            }
          }
        }
      });

      return NextResponse.json({
        mensagem: 'Usuário atualizado com sucesso',
        usuario: usuarioComPerfisAtualizados,
      });
    }

    return NextResponse.json({
      mensagem: 'Usuário atualizado com sucesso',
      usuario: usuarioAtualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    if (typeof error === 'object' && error && (error as any).code === 'P2002') {
      return NextResponse.json(
        { erro: 'Email já está em uso' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
