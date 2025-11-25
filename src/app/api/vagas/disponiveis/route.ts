import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

/**
 * GET /api/vagas/disponiveis
 * Lista vagas disponíveis para locação
 * Filtros: condominioId (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const condominioId = searchParams.get('condominioId');

    // Construir filtro
    const where: any = {
      proprietarioId: {
        not: null
      }
    };

    if (condominioId) {
      where.condominioId = condominioId;
    }

    // Buscar vagas disponíveis
    const vagas = await prisma.vaga.findMany({
      where,
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
                tipo: true
              }
            }
          }
        },
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        proprietario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        configuracaoLocacao: {
          select: {
            disponivel: true,
            tiposPermitidos: true,
            valorHora: true,
            valorDiaria: true,
            valorMensal: true,
            valorAnual: true
          }
        }
      },
      orderBy: [
        { condominio: { nome: 'asc' } },
        { unidade: { numero: 'asc' } },
        { numero: 'asc' }
      ]
    });

    return NextResponse.json(vagas);
  } catch (error) {
    console.error('Erro ao buscar vagas disponíveis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
