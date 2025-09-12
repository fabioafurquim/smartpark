import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para criação de vaga
const createVagaSchema = z.object({
  numero: z.string().min(1, 'Número da vaga é obrigatório'),
  tipo: z.enum(['carro', 'moto', 'bicicleta', 'deficiente'], {
    errorMap: () => ({ message: 'Tipo deve ser: carro, moto, bicicleta ou deficiente' })
  }),
  localizacao: z.string().optional(),
  observacoes: z.string().optional()
});

/**
 * GET /api/condominios/[id]/torres/[torreId]/unidades/[unidadeId]/vagas
 * Lista todas as vagas de uma unidade
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string; unidadeId: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId, torreId, unidadeId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1),
      unidadeId: z.string().min(1)
    }).safeParse({ condominioId, torreId, unidadeId });

    if (!idsValidation.success) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem acesso ao condomínio
    const condominio = await prisma.condominio.findFirst({
      where: {
        id: condominioId,
        ativo: true,
        perfisUsuario: {
          some: {
            usuarioId: session.user.id,
            ativo: true
          }
        }
      }
    });

    if (!condominio) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    // Verificar se a unidade existe
    const unidade = await prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        torreId: torreId,
        torre: {
          condominioId: condominioId
        }
      },
      include: {
        torre: {
          select: {
            id: true,
            nome: true,
            tipo: true
          }
        }
      }
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    // Buscar vagas da unidade
    const vagas = await prisma.vaga.findMany({
      where: {
        unidadeId: unidadeId
      },
      orderBy: {
        numero: 'asc'
      }
    });

    return NextResponse.json({
      unidade: {
        id: unidade.id,
        numero: unidade.numero,
        torre: unidade.torre
      },
      vagas,
      total: vagas.length
    });

  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/condominios/[id]/torres/[torreId]/unidades/[unidadeId]/vagas
 * Cria uma nova vaga para a unidade
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string; unidadeId: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId, torreId, unidadeId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1),
      unidadeId: z.string().min(1)
    }).safeParse({ condominioId, torreId, unidadeId });

    if (!idsValidation.success) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem acesso de administrador
    const condominio = await prisma.condominio.findFirst({
      where: {
        id: condominioId,
        ativo: true,
        perfisUsuario: {
          some: {
            usuarioId: session.user.id,
            tipo: {
              in: ['administrador_mestre', 'administrador_condominio', 'sindico']
            },
            ativo: true
          }
        }
      }
    });

    if (!condominio) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    // Verificar se a unidade existe
    const unidade = await prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        torreId: torreId,
        torre: {
          condominioId: condominioId
        }
      }
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    // Validar dados da requisição
    const body = await request.json();
    const validation = createVagaSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const dadosVaga = validation.data;

    // Verificar se já existe uma vaga com o mesmo número na unidade
    const vagaExistente = await prisma.vaga.findFirst({
      where: {
        unidadeId: unidadeId,
        numero: dadosVaga.numero
      }
    });

    if (vagaExistente) {
      return NextResponse.json(
        { error: `Já existe uma vaga com o número "${dadosVaga.numero}" nesta unidade` },
        { status: 409 }
      );
    }

    // Criar a vaga
    const novaVaga = await prisma.vaga.create({
      data: {
        ...dadosVaga,
        unidadeId: unidadeId
      }
    });

    return NextResponse.json(novaVaga, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}