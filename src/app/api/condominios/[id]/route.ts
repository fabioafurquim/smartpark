import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { atualizarCondominioSchema } from '../../../../lib/validations/condominio';
import { z } from 'zod';

// GET /api/condominios/[id] - Buscar condomínio por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validar ID (UUID ou CUID)
    const idValidation = z.string().min(1);
    if (!idValidation.safeParse(id).success) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const condominio = await prisma.condominio.findUnique({
      where: { id },
      include: {
        torres: {
          orderBy: { nome: 'asc' },
          include: {
            _count: {
              select: {
                unidades: true,
              },
            },
          },
        },
        _count: {
          select: {
            torres: true,
            perfisUsuario: true,
            solicitacoesCadastro: true,
          },
        },
      },
    });

    if (!condominio) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(condominio);
  } catch (error) {
    console.error('Erro ao buscar condomínio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/condominios/[id] - Atualizar condomínio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validar ID (UUID ou CUID)
    const idValidation = z.string().min(1);
    if (!idValidation.safeParse(id).success) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar se o condomínio existe
    const condominioExistente = await prisma.condominio.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            torres: true,
            perfisUsuario: true,
          },
        },
      },
    });

    if (!condominioExistente) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const usuario = await prisma.usuario.findUnique({
      where: { id: (session.user as any).id },
      include: { perfis: true },
    });

    const isAdmin = usuario?.perfis.some(
      (perfil) => perfil.tipo === 'administrador_mestre' || perfil.tipo === 'administrador_condominio'
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem atualizar condomínios.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validar dados de entrada
    const validatedData = atualizarCondominioSchema.parse(body);

    // Verificar se o nome já existe (se estiver sendo alterado)
    if (validatedData.nome && validatedData.nome !== condominioExistente.nome) {
      const nomeExistente = await prisma.condominio.findFirst({
        where: {
          nome: {
            equals: validatedData.nome,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (nomeExistente) {
        return NextResponse.json(
          { error: 'Já existe um condomínio com este nome' },
          { status: 409 }
        );
      }
    }

    // Atualizar condomínio
    const condominio = await prisma.condominio.update({
      where: { id },
      data: validatedData,
      include: {
        _count: {
          select: {
            torres: true,
            perfisUsuario: true,
          },
        },
      },
    });

    return NextResponse.json(condominio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar condomínio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/condominios/[id] - Excluir condomínio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validar ID (UUID ou CUID)
    const idValidation = z.string().min(1);
    if (!idValidation.safeParse(id).success) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar se o condomínio existe
    const condominioExistente = await prisma.condominio.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            torres: true,
            perfisUsuario: true,
          },
        },
      },
    });

    if (!condominioExistente) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const usuario = await prisma.usuario.findUnique({
      where: { id: (session.user as any).id },
      include: { perfis: true },
    });

    const isAdminMaster = usuario?.perfis.some(
      (perfil) => perfil.tipo === 'administrador_mestre'
    );

    if (!isAdminMaster) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores mestres podem excluir condomínios.' },
        { status: 403 }
      );
    }

    // Verificar se há dependências
    const temDependencias = 
      condominioExistente._count.torres > 0 ||
      condominioExistente._count.perfisUsuario > 0;

    if (temDependencias) {
      return NextResponse.json(
        { 
          error: 'Não é possível excluir o condomínio pois existem torres ou usuários associados.',
          details: {
            torres: condominioExistente._count.torres,
            perfisUsuario: condominioExistente._count.perfisUsuario,
          },
        },
        { status: 409 }
      );
    }

    // Excluir condomínio
    await prisma.condominio.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Condomínio excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir condomínio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}