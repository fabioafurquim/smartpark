import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const usuarioId = (session.user as { id: string }).id;

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioId,
      },
      include: {
        perfis: {
          where: {
            ativo: true,
          },
        },
        solicitacoesCadastro: {
          orderBy: {
            criadoEm: 'desc',
          },
          take: 1,
          include: {
            condominio: {
              select: {
                id: true,
                nome: true,
                codigoUnico: true,
              },
            },
            unidade: {
              select: {
                id: true,
                numero: true,
                andar: true,
                torre: {
                  select: {
                    id: true,
                    nome: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario nao encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      possuiPerfisAtivos: usuario.perfis.length > 0,
      solicitacao: usuario.solicitacoesCadastro[0] || null,
    });
  } catch (error) {
    console.error('Erro ao consultar status do cadastro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
