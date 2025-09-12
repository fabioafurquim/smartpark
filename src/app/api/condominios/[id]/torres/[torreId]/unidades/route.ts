import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para criação de unidade
const createUnidadeSchema = z.object({
  numero: z.string().min(1, 'Número da unidade é obrigatório'),
  andar: z.number().int().min(0, 'Andar deve ser um número inteiro não negativo').optional(),
  area: z.number().positive('Área deve ser um número positivo').optional(),
  quartos: z.number().int().min(0, 'Número de quartos deve ser um inteiro não negativo').optional(),
  banheiros: z.number().int().min(0, 'Número de banheiros deve ser um inteiro não negativo').optional(),
  observacoes: z.string().optional()
});

/**
 * GET /api/condominios/[id]/torres/[torreId]/unidades
 * Lista todas as unidades de uma torre/bloco
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string }> }
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

    const { id: condominioId, torreId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1)
    }).safeParse({ condominioId, torreId });

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

    // Verificar se a torre existe
    const torre = await prisma.torre.findFirst({
      where: {
        id: torreId,
        condominioId: condominioId
      }
    });

    if (!torre) {
      return NextResponse.json(
        { error: 'Torre/Bloco não encontrado' },
        { status: 404 }
      );
    }

    // Buscar unidades da torre
    const unidades = await prisma.unidade.findMany({
      where: {
        torreId: torreId
      },
      include: {
        _count: {
          select: {
            vagas: true
          }
        }
      },
      orderBy: [
        { andar: 'asc' },
        { numero: 'asc' }
      ]
    });

    return NextResponse.json({
      torre: {
        id: torre.id,
        nome: torre.nome,
        tipo: torre.tipo
      },
      unidades,
      total: unidades.length
    });

  } catch (error) {
    console.error('Erro ao buscar unidades:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/condominios/[id]/torres/[torreId]/unidades
 * Cria uma nova unidade na torre/bloco
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; torreId: string }> }
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

    const { id: condominioId, torreId } = await params;

    // Validar IDs
    const idsValidation = z.object({
      condominioId: z.string().min(1),
      torreId: z.string().min(1)
    }).safeParse({ condominioId, torreId });

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

    // Verificar se a torre existe
    const torre = await prisma.torre.findFirst({
      where: {
        id: torreId,
        condominioId: condominioId
      }
    });

    if (!torre) {
      return NextResponse.json(
        { error: 'Torre/Bloco não encontrado' },
        { status: 404 }
      );
    }

    // Validar dados da requisição
    const body = await request.json();
    const validation = createUnidadeSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const dadosUnidade = validation.data;

    // Verificar se já existe uma unidade com o mesmo número na torre
    const unidadeExistente = await prisma.unidade.findFirst({
      where: {
        torreId: torreId,
        numero: dadosUnidade.numero
      }
    });

    if (unidadeExistente) {
      return NextResponse.json(
        { error: `Já existe uma unidade com o número "${dadosUnidade.numero}" nesta ${torre.tipo}` },
        { status: 409 }
      );
    }

    // Criar a unidade
    const novaUnidade = await prisma.unidade.create({
      data: {
        ...dadosUnidade,
        torreId: torreId
      },
      include: {
        _count: {
          select: {
            vagas: true
          }
        }
      }
    });

    return NextResponse.json(novaUnidade, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}