import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { middlewareEstrutura } from '@/lib/auth-middleware';

// Schema de validação para torre/bloco
const torreSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['TORRE', 'BLOCO'], {
    errorMap: () => ({ message: 'Tipo deve ser TORRE ou BLOCO' })
  }),
  condominioId: z.string().min(1, 'Condomínio é obrigatório')
});

/**
 * GET /api/torres - Lista torres/blocos
 * Query params: condominioId (opcional)
 */
export async function GET(request: NextRequest) {
  return middlewareEstrutura(request, async (req, { usuario, condominiosPermitidos }) => {
    const { searchParams } = new URL(req.url);
    const condominioId = searchParams.get('condominioId');

    // Filtrar por condominios permitidos
    let where: any = {
      condominioId: {
        in: condominiosPermitidos
      }
    };

    // Se condominioId específico foi solicitado, verificar se está permitido
    if (condominioId) {
      if (!condominiosPermitidos.includes(condominioId)) {
        return NextResponse.json({ error: 'Acesso negado ao condomínio' }, { status: 403 });
      }
      where.condominioId = condominioId;
    }

    const torres = await prisma.torre.findMany({
      where,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
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

    // Transformar dados para incluir totalUnidades
    const torresFormatadas = torres.map(torre => ({
      id: torre.id,
      nome: torre.nome,
      tipo: torre.tipo,
      condominioId: torre.condominioId,
      condominio: torre.condominio,
      totalUnidades: torre._count.unidades,
      createdAt: torre.criadoEm.toISOString()
    }));

    return NextResponse.json(torresFormatadas);
  });
}

/**
 * POST /api/torres - Cria nova torre/bloco
 */
export async function POST(request: NextRequest) {
  return middlewareEstrutura(request, async (req, { usuario, condominiosPermitidos }) => {
    const body = await req.json();
    const validatedData = torreSchema.parse(body);

    // Verificar se o usuário tem acesso ao condomínio
    if (!condominiosPermitidos.includes(validatedData.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condomínio' },
        { status: 403 }
      );
    }

    // Verificar se o condomínio existe
    const condominio = await prisma.condominio.findUnique({
      where: { id: validatedData.condominioId }
    });

    if (!condominio) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe torre/bloco com mesmo nome no condomínio
    const torreExistente = await prisma.torre.findFirst({
      where: {
        nome: validatedData.nome,
        condominioId: validatedData.condominioId
      }
    });

    if (torreExistente) {
      return NextResponse.json(
        { error: 'Já existe uma torre/bloco com este nome neste condomínio' },
        { status: 400 }
      );
    }

    const novaTorre = await prisma.torre.create({
      data: validatedData,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        _count: {
          select: {
            unidades: true
          }
        }
      }
    });

    // Garantir que temos todos os campos necessários
    if (!novaTorre) {
      throw new Error('Falha ao criar torre');
    }

    const torreFormatada = {
      id: novaTorre.id,
      nome: novaTorre.nome,
      tipo: novaTorre.tipo,
      condominioId: novaTorre.condominioId,
      condominio: novaTorre.condominio,
      totalUnidades: novaTorre._count.unidades,
      createdAt: novaTorre.criadoEm.toISOString()
    };

    return NextResponse.json(torreFormatada, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Erro ao criar torre:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}