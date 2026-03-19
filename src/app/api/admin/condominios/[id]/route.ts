import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, ehAdministradorMestre } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { criarCondominioSchema } from '@/lib/validations/condominio';

const paramsSchema = z.object({
  id: z.string().min(1, 'ID do condominio invalido'),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        {
          erro: 'Acesso negado. Apenas administradores mestres podem acessar esta funcionalidade.',
        },
        { status: 403 }
      );
    }

    const { id } = paramsSchema.parse(await params);

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
            proprietarioId: { not: null },
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
      return NextResponse.json({ erro: 'Condominio nao encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      id: condominio.id,
      nome: condominio.nome,
      endereco: condominio.endereco,
      telefone: condominio.telefone,
      email: condominio.email,
      codigoUnico: condominio.codigoUnico,
      modalidade: condominio.modalidade,
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
    });
  } catch (error) {
    console.error('Erro ao buscar condominio:', error);

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
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem editar condominios.' },
        { status: 403 }
      );
    }

    const { id } = paramsSchema.parse(await params);

    const condominioExistente = await prisma.condominio.findUnique({
      where: { id },
    });

    if (!condominioExistente) {
      return NextResponse.json({ erro: 'Condominio nao encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const validacao = criarCondominioSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.issues },
        { status: 400 }
      );
    }

    const { nome, endereco, telefone, email, logoUrl, modalidade } = validacao.data;

    const condominioComMesmoNome = await prisma.condominio.findFirst({
      where: {
        nome,
        id: { not: id },
      },
    });

    if (condominioComMesmoNome) {
      return NextResponse.json(
        { erro: 'Ja existe um condominio com este nome' },
        { status: 409 }
      );
    }

    if (email) {
      const condominioComMesmoEmail = await prisma.condominio.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (condominioComMesmoEmail) {
        return NextResponse.json(
          { erro: 'Ja existe um condominio com este email' },
          { status: 409 }
        );
      }
    }

    const condominioAtualizado = await prisma.condominio.update({
      where: { id },
      data: {
        nome,
        endereco,
        telefone: telefone || null,
        email: email || null,
        logoUrl: logoUrl || null,
        modalidade,
      },
      select: {
        id: true,
        nome: true,
        endereco: true,
        telefone: true,
        email: true,
        logoUrl: true,
        modalidade: true,
        codigoUnico: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return NextResponse.json(condominioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar condominio:', error);

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
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem excluir condominios.' },
        { status: 403 }
      );
    }

    const { id } = paramsSchema.parse(await params);

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
      return NextResponse.json({ erro: 'Condominio nao encontrado' }, { status: 404 });
    }

    if (condominio._count.perfisUsuario > 0) {
      return NextResponse.json(
        {
          erro: 'Nao e possivel excluir condominio com usuarios associados',
          detalhes: `O condominio possui ${condominio._count.perfisUsuario} usuario(s) associado(s)`,
        },
        { status: 400 }
      );
    }

    if (condominio._count.vagas > 0) {
      return NextResponse.json(
        {
          erro: 'Nao e possivel excluir condominio com vagas cadastradas',
          detalhes: `O condominio possui ${condominio._count.vagas} vaga(s) cadastrada(s)`,
        },
        { status: 400 }
      );
    }

    await prisma.condominio.delete({
      where: { id },
    });

    return NextResponse.json({ mensagem: 'Condominio excluido com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir condominio:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Parametros invalidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}
