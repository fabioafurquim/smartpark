import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ehAdministradorMestre } from '@/lib/auth';
import { criarCondominioSchema } from '@/lib/validations/condominio';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().uuid('ID do condomínio deve ser um UUID válido'),
});

/**
 * GET /api/admin/condominios/[id]
 * Busca um condomínio específico por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem acessar esta funcionalidade.' },
        { status: 403 }
      );
    }

    // Validar parâmetros
    const { id } = paramsSchema.parse(await params);

    // Buscar condomínio com estatísticas detalhadas
    const condominio = await prisma.condominio.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vagas: true,
            perfisUsuario: {
              where: {
                ativo: true,
              },
            },
          },
        },
        vagas: {
          where: {
            proprietarioId: { not: null }, // Vagas ocupadas são aquelas com proprietário
          },
          select: {
            id: true,
          },
        },
        perfisUsuario: {
          where: {
            ativo: true,
          },
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!condominio) {
      return NextResponse.json(
        { erro: 'Condomínio não encontrado' },
        { status: 404 }
      );
    }

    // Formatar dados para resposta
    const condominioFormatado = {
      id: condominio.id,
      nome: condominio.nome,
      endereco: condominio.endereco,
      telefone: condominio.telefone,
      email: condominio.email,
      totalVagas: condominio._count.vagas,
      vagasOcupadas: condominio.vagas.length,
      totalUsuarios: condominio._count.perfisUsuario,
      ativo: condominio.ativo,
      criadoEm: condominio.criadoEm.toISOString(),
      atualizadoEm: condominio.atualizadoEm.toISOString(),
      usuarios: condominio.perfisUsuario.map((perfil) => ({
        id: perfil.usuario.id,
        nome: perfil.usuario.nome,
        email: perfil.usuario.email,
        tipo: perfil.tipo,
      })),
    };

    return NextResponse.json(condominioFormatado);
  } catch (error) {
    console.error('Erro ao buscar condomínio:', error);
    
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
 * PUT /api/admin/condominios/[id]
 * Atualiza um condomínio existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem editar condomínios.' },
        { status: 403 }
      );
    }

    // Validar parâmetros
    const { id } = paramsSchema.parse(await params);

    // Verificar se o condomínio existe
    const condominioExistente = await prisma.condominio.findUnique({
      where: { id },
    });

    if (!condominioExistente) {
      return NextResponse.json(
        { erro: 'Condomínio não encontrado' },
        { status: 404 }
      );
    }

    // Validar dados da requisição
    const body = await request.json();
    const validacao = criarCondominioSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: validacao.error.issues 
        },
        { status: 400 }
      );
    }

    const { nome, endereco, telefone, email, logoUrl } = validacao.data;

    // Verificar se já existe outro condomínio com o mesmo nome (exceto o atual)
    const condominioComMesmoNome = await prisma.condominio.findFirst({
      where: {
        nome,
        id: { not: id },
      },
    });

    if (condominioComMesmoNome) {
      return NextResponse.json(
        { erro: 'Já existe um condomínio com este nome' },
        { status: 409 }
      );
    }

    // Verificar se já existe outro condomínio com o mesmo email (exceto o atual)
    const condominioComMesmoEmail = await prisma.condominio.findFirst({
      where: {
        email,
        id: { not: id },
      },
    });

    if (condominioComMesmoEmail) {
      return NextResponse.json(
        { erro: 'Já existe um condomínio com este email' },
        { status: 409 }
      );
    }

    // Atualizar o condomínio
    const condominioAtualizado = await prisma.condominio.update({
      where: { id },
      data: {
        nome,
        endereco,
        telefone,
        email,
        logoUrl,
        atualizadoEm: new Date(),
      },
      select: {
        id: true,
        nome: true,
        endereco: true,
        telefone: true,
        email: true,
        logoUrl: true,
        codigoUnico: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return NextResponse.json(condominioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar condomínio:', error);
    
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
 * DELETE /api/admin/condominios/[id]
 * Exclui um condomínio (apenas para administrador mestre)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem excluir condomínios.' },
        { status: 403 }
      );
    }

    // Validar parâmetros
    const { id } = paramsSchema.parse(await params);

    // Verificar se o condomínio existe
    const condominio = await prisma.condominio.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            perfisUsuario: true,
            vagas: true,
          },
        },
      },
    });

    if (!condominio) {
      return NextResponse.json(
        { erro: 'Condomínio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se há usuários ou vagas associadas
    if (condominio._count.perfisUsuario > 0) {
      return NextResponse.json(
        { 
          erro: 'Não é possível excluir condomínio com usuários associados',
          detalhes: `O condomínio possui ${condominio._count.perfisUsuario} usuário(s) associado(s)`,
        },
        { status: 400 }
      );
    }

    if (condominio._count.vagas > 0) {
      return NextResponse.json(
        { 
          erro: 'Não é possível excluir condomínio com vagas cadastradas',
          detalhes: `O condomínio possui ${condominio._count.vagas} vaga(s) cadastrada(s)`,
        },
        { status: 400 }
      );
    }

    // Excluir condomínio
    await prisma.condominio.delete({
      where: { id },
    });

    return NextResponse.json(
      { mensagem: 'Condomínio excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir condomínio:', error);
    
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
