import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { z } from 'zod';

// Schema de validação para criação de torre/bloco
const createTorreSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  tipo: z.enum(['torre', 'bloco'])
});

/**
 * GET /api/condominios/[id]/torres
 * Lista todas as torres/blocos de um condomínio
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId } = await params;

    // Validar ID do condomínio
    const idValidation = z.string().min(1).safeParse(condominioId);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'ID do condomínio inválido' },
        { status: 400 }
      );
    }

    // Verificar se o condomínio existe e se o usuário tem acesso
    const condominio = await prisma.condominio.findFirst({
      where: {
        id: condominioId,
        ativo: true,
        perfisUsuario: {
          some: {
            usuarioId: (session.user as any).id,
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

    // Buscar torres/blocos do condomínio
    const torres = await prisma.torre.findMany({
      where: {
        condominioId: condominioId
      },
      include: {
        _count: {
          select: {
            unidades: true
          }
        }
      },
      orderBy: {
        nome: 'asc'
      }
    });

    return NextResponse.json({
      torres
    });

  } catch (error) {
    console.error('Erro ao buscar torres:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/condominios/[id]/torres
 * Cria uma nova torre/bloco
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: condominioId } = await params;

    // Validar ID do condomínio
    const idValidation = z.string().min(1).safeParse(condominioId);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'ID do condomínio inválido' },
        { status: 400 }
      );
    }

    // Verificar se o condomínio existe e se o usuário tem acesso de administrador
    const condominio = await prisma.condominio.findFirst({
      where: {
        id: condominioId,
        ativo: true,
        perfisUsuario: {
          some: {
            usuarioId: (session.user as any).id,
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

    // Validar dados da requisição
    const body = await request.json();
    const validation = createTorreSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const { nome, descricao, tipo } = validation.data;

    // Verificar se já existe uma torre/bloco com o mesmo nome no condomínio
    const torreExistente = await prisma.torre.findFirst({
      where: {
        condominioId: condominioId,
        nome: nome
      }
    });

    if (torreExistente) {
      return NextResponse.json(
        { error: `Já existe um(a) ${tipo} com este nome neste condomínio` },
        { status: 409 }
      );
    }

    // Criar a torre/bloco
    const novaTorre = await prisma.torre.create({
      data: {
        nome,
        descricao,
        tipo,
        condominioId
      },
      include: {
        _count: {
          select: {
            unidades: true
          }
        }
      }
    });

    return NextResponse.json(novaTorre, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar torre:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}