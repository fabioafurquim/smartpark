import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { middlewareEstrutura } from '@/lib/auth-middleware';

// Schema de validação para vaga
const vagaSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório'),
  tipo: z.enum(['COBERTA', 'DESCOBERTA', 'DEFICIENTE', 'IDOSO', 'VISITANTE'], {
    errorMap: () => ({ message: 'Tipo deve ser COBERTA, DESCOBERTA, DEFICIENTE, IDOSO ou VISITANTE' })
  }),
  condominioId: z.string().min(1, 'Condomínio é obrigatório'),
  unidadeId: z.string().min(1, 'Unidade é obrigatória'),
  proprietarioId: z.string().optional()
});

/**
 * GET /api/vagas - Lista vagas
 * Query params: condominioId, unidadeId, tipo, status (opcionais)
 */
export const GET = middlewareEstrutura(async (req, usuario, condominioId) => {
  try {
    const { searchParams } = new URL(req.url);
    const unidadeId = searchParams.get('unidadeId');
    const tipo = searchParams.get('tipo');
    const status = searchParams.get('status');

    // O middleware já validou o acesso ao condomínio
    let where: any = {
      condominioId: condominioId
    };

    if (unidadeId) where.unidadeId = unidadeId;
    if (tipo) where.tipo = tipo;
    
    // Filtro por status baseado no proprietarioId
    if (status) {
      if (status === 'OCUPADA') {
        where.proprietarioId = { not: null };
      } else if (status === 'LIVRE') {
        where.proprietarioId = null;
      }
    }

    const vagas = await prisma.vaga.findMany({
      where,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        unidade: {
          select: {
            id: true,
            numero: true,
            proprietario: true,
            torre: {
              select: {
                id: true,
                nome: true,
                tipo: true
              }
            }
          }
        }
      },
      orderBy: [
        { unidade: { torre: { nome: 'asc' } } },
        { unidade: { numero: 'asc' } },
        { numero: 'asc' }
      ]
    });

    const vagasFormatadas = vagas.map(vaga => ({
      id: vaga.id,
      numero: vaga.numero,
      tipo: vaga.tipo,
      ocupada: !!vaga.proprietarioId, // Vaga ocupada se tem proprietário
      condominioId: vaga.condominioId,
      unidadeId: vaga.unidadeId,
      proprietarioId: vaga.proprietarioId,
      condominio: vaga.condominio,
      unidade: vaga.unidade,
      createdAt: vaga.createdAt.toISOString()
    }));

    return NextResponse.json(vagasFormatadas);
  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/vagas - Cria nova vaga
 */
export const POST = middlewareEstrutura(async (req, usuario, condominioId) => {
  try {
    const body = await req.json();
    const validatedData = vagaSchema.parse(body);

    // Verificar se o usuário tem acesso ao condomínio (já validado pelo middleware)
    // O middleware já garante que o usuário tem acesso ao condomínio especificado

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

    // Verificar se a unidade existe e pertence ao condomínio
    const unidade = await prisma.unidade.findFirst({
      where: {
        id: validatedData.unidadeId,
        condominioId: validatedData.condominioId
      }
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada ou não pertence ao condomínio selecionado' },
        { status: 404 }
      );
    }

    // Verificar se já existe vaga com mesmo número no condomínio
    const vagaExistente = await prisma.vaga.findFirst({
      where: {
        numero: validatedData.numero,
        condominioId: validatedData.condominioId
      }
    });

    if (vagaExistente) {
      return NextResponse.json(
        { error: 'Já existe uma vaga com este número neste condomínio' },
        { status: 400 }
      );
    }

    const novaVaga = await prisma.vaga.create({
      data: validatedData,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        unidade: {
          select: {
            id: true,
            numero: true,
            proprietario: true,
            torre: {
              select: {
                id: true,
                nome: true,
                tipo: true
              }
            }
          }
        }
      }
    });

    const vagaFormatada = {
      id: novaVaga.id,
      numero: novaVaga.numero,
      tipo: novaVaga.tipo,
      ocupada: !!novaVaga.proprietarioId,
      condominioId: novaVaga.condominioId,
      unidadeId: novaVaga.unidadeId,
      proprietarioId: novaVaga.proprietarioId,
      condominio: novaVaga.condominio,
      unidade: novaVaga.unidade,
      createdAt: novaVaga.createdAt.toISOString()
    };

    return NextResponse.json(vagaFormatada, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar vaga:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});