import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, temPermissao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';

const updateUnidadeSchema = z.object({
  numero: z.string().min(1, 'Numero e obrigatorio').optional(),
  andar: z.number().int().min(0, 'Andar deve ser um numero inteiro nao negativo').optional(),
  tipo: z.enum(['APARTAMENTO', 'SALA_COMERCIAL', 'LOJA', 'COBERTURA']).optional(),
  proprietario: z.string().optional(),
  contato: z.string().optional(),
  usuarioId: z.string().optional().nullable(),
});

const unidadeTemMovimentacoesAtivas = async (unidadeId: string) => {
  const [locacoesAtivas, reservasAtivas] = await Promise.all([
    prisma.locacao.count({
      where: {
        vaga: { unidadeId },
        status: { in: ['PENDENTE', 'ATIVA'] },
      },
    }),
    prisma.reserva.count({
      where: {
        vaga: { unidadeId },
        status: { in: ['ativa', 'confirmada', 'ATIVA', 'CONFIRMADA'] },
      },
    }),
  ]);

  return locacoesAtivas > 0 || reservasAtivas > 0;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;

    const unidade = await prisma.unidade.findUnique({
      where: { id },
      include: {
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
        torre: {
          select: {
            id: true,
            nome: true,
            tipo: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        vagas: {
          select: {
            id: true,
            numero: true,
            tipo: true,
          },
          orderBy: {
            numero: 'asc',
          },
        },
        _count: {
          select: {
            vagas: true,
          },
        },
      },
    });

    if (!unidade) {
      return NextResponse.json({ error: 'Unidade nao encontrada' }, { status: 404 });
    }

    if (!temPermissao(usuario, 'gerenciarEstrutura', unidade.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condominio especificado' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: unidade.id,
      numero: unidade.numero,
      andar: unidade.andar,
      tipo: unidade.tipo,
      proprietario: unidade.proprietario,
      contato: unidade.contato,
      condominioId: unidade.condominioId,
      torreId: unidade.torreId,
      usuarioId: unidade.usuarioId,
      usuario: unidade.usuario,
      condominio: unidade.condominio,
      torre: unidade.torre,
      vagas: unidade.vagas,
      totalVagas: unidade._count.vagas,
      criadoEm: unidade.criadoEm.toISOString(),
      atualizadoEm: unidade.atualizadoEm.toISOString(),
    });
  } catch (error) {
    console.error('Erro ao buscar unidade:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const body = await request.json();
    const validatedData = updateUnidadeSchema.parse(body);
    const { id } = await params;

    const unidadeExistente = await prisma.unidade.findUnique({
      where: { id },
    });

    if (!unidadeExistente) {
      return NextResponse.json({ error: 'Unidade nao encontrada' }, { status: 404 });
    }

    if (!temPermissao(usuario, 'gerenciarEstrutura', unidadeExistente.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condominio especificado' },
        { status: 403 }
      );
    }

    if (validatedData.usuarioId) {
      const usuarioAssociado = await prisma.usuario.findUnique({
        where: { id: validatedData.usuarioId },
        include: {
          perfis: {
            where: {
              condominioId: unidadeExistente.condominioId,
              tipo: 'morador',
              ativo: true,
            },
          },
        },
      });

      if (!usuarioAssociado) {
        return NextResponse.json(
          { error: 'Usuario selecionado nao foi encontrado' },
          { status: 404 }
        );
      }

      if (usuarioAssociado.perfis.length === 0) {
        return NextResponse.json(
          { error: 'Usuario selecionado nao e um morador ativo deste condominio' },
          { status: 400 }
        );
      }
    }

    if (validatedData.numero && validatedData.numero !== unidadeExistente.numero) {
      const unidadeComMesmoNumero = await prisma.unidade.findFirst({
        where: {
          numero: validatedData.numero,
          torreId: unidadeExistente.torreId,
          id: { not: id },
        },
      });

      if (unidadeComMesmoNumero) {
        return NextResponse.json(
          { error: 'Ja existe uma unidade com este numero nesta torre/bloco' },
          { status: 400 }
        );
      }
    }

    const usuarioMudou =
      validatedData.usuarioId !== undefined &&
      validatedData.usuarioId !== unidadeExistente.usuarioId;

    if (usuarioMudou) {
      const possuiMovimentacoesAtivas = await unidadeTemMovimentacoesAtivas(id);

      if (possuiMovimentacoesAtivas) {
        return NextResponse.json(
          {
            error:
              'Nao e possivel alterar o morador responsavel de uma unidade com locacoes ou reservas ativas',
          },
          { status: 400 }
        );
      }
    }

    const unidadeAtualizada = await prisma.unidade.update({
      where: { id },
      data: validatedData,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
        torre: {
          select: {
            id: true,
            nome: true,
            tipo: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        _count: {
          select: {
            vagas: true,
          },
        },
      },
    });

    if (usuarioMudou) {
      await prisma.vaga.updateMany({
        where: { unidadeId: id },
        data: { proprietarioId: unidadeAtualizada.usuarioId },
      });
    }

    return NextResponse.json({
      id: unidadeAtualizada.id,
      numero: unidadeAtualizada.numero,
      andar: unidadeAtualizada.andar,
      tipo: unidadeAtualizada.tipo,
      proprietario: unidadeAtualizada.proprietario,
      contato: unidadeAtualizada.contato,
      condominioId: unidadeAtualizada.condominioId,
      torreId: unidadeAtualizada.torreId,
      usuarioId: unidadeAtualizada.usuarioId,
      usuario: unidadeAtualizada.usuario,
      condominio: unidadeAtualizada.condominio,
      torre: unidadeAtualizada.torre,
      totalVagas: unidadeAtualizada._count.vagas,
      criadoEm: unidadeAtualizada.criadoEm.toISOString(),
      atualizadoEm: unidadeAtualizada.atualizadoEm.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar unidade:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const unidade = await prisma.unidade.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vagas: true,
          },
        },
      },
    });

    if (!unidade) {
      return NextResponse.json({ error: 'Unidade nao encontrada' }, { status: 404 });
    }

    if (unidade._count.vagas > 0) {
      return NextResponse.json(
        {
          error: 'Nao e possivel excluir unidade que possui vagas vinculadas',
          details: `Esta unidade possui ${unidade._count.vagas} vaga(s) vinculada(s)`,
        },
        { status: 400 }
      );
    }

    await prisma.unidade.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Unidade excluida com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao excluir unidade:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
