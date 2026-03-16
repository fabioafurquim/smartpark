import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo')?.trim().toUpperCase();

    if (!codigo) {
      return NextResponse.json(
        { error: 'Código do condomínio é obrigatório' },
        { status: 400 }
      );
    }

    const condominio = await prisma.condominio.findUnique({
      where: {
        codigoUnico: codigo,
      },
      select: {
        id: true,
        nome: true,
        codigoUnico: true,
        ativo: true,
        torres: {
          orderBy: [{ nome: 'asc' }],
          select: {
            id: true,
            nome: true,
            tipo: true,
            unidades: {
              orderBy: [{ andar: 'asc' }, { numero: 'asc' }],
              select: {
                id: true,
                numero: true,
                andar: true,
                tipo: true,
                usuarioId: true,
                _count: {
                  select: {
                    vagas: true,
                  },
                },
                solicitacoesCadastro: {
                  where: {
                    status: 'pendente',
                  },
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!condominio || !condominio.ativo) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: condominio.id,
      nome: condominio.nome,
      codigoUnico: condominio.codigoUnico,
      torres: condominio.torres
        .map((torre) => ({
          id: torre.id,
          nome: torre.nome,
          tipo: torre.tipo,
          unidades: torre.unidades
            .filter(
              (unidade) => !unidade.usuarioId && unidade.solicitacoesCadastro.length === 0
            )
            .map((unidade) => ({
              id: unidade.id,
              numero: unidade.numero,
              andar: unidade.andar,
              tipo: unidade.tipo,
              totalVagas: unidade._count.vagas,
              disponivelParaVinculo: true,
              statusVinculo: 'disponivel' as const,
            })),
        }))
        .filter((torre) => torre.unidades.length > 0),
    });
  } catch (error) {
    console.error('Erro ao consultar condominio para cadastro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
