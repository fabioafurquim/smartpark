import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsuarioSessao } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const condominiosUsuario = Array.from(
      new Set(usuario.perfis.map((perfil) => perfil.condominioId))
    );

    if (condominiosUsuario.length === 0) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const condominioId = searchParams.get('condominioId');
    const condominioIdsFiltrados =
      condominioId && condominiosUsuario.includes(condominioId)
        ? [condominioId]
        : condominiosUsuario;

    const vagas = await prisma.vaga.findMany({
      where: {
        condominioId: {
          in: condominioIdsFiltrados,
        },
        proprietarioId: {
          not: null,
        },
        NOT: {
          proprietarioId: usuario.id,
        },
        configuracaoLocacao: {
          disponivel: true,
        },
      },
      include: {
        unidade: {
          select: {
            id: true,
            numero: true,
            andar: true,
            torre: {
              select: {
                id: true,
                nome: true,
                tipo: true,
              },
            },
          },
        },
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
        proprietario: {
          select: {
            id: true,
            nome: true,
          },
        },
        configuracaoLocacao: {
          select: {
            disponivel: true,
            tiposPermitidos: true,
            valorHora: true,
            valorDiaria: true,
            valorMensal: true,
            valorAnual: true,
          },
        },
      },
      orderBy: [{ unidade: { torre: { nome: 'asc' } } }, { unidade: { numero: 'asc' } }, { numero: 'asc' }],
    });

    return NextResponse.json(vagas);
  } catch (error) {
    console.error('Erro ao buscar vagas disponiveis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
