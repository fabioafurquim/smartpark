import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { middlewareEstrutura } from '../../../lib/auth-middleware';

// Schema de validação para vaga
const vagaSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório'),
  tipo: z.enum(['COBERTA', 'DESCOBERTA', 'DEFICIENTE', 'IDOSO', 'VISITANTE']),
  unidadeId: z.string().min(1, 'Unidade é obrigatória'),
  condominioId: z.string().min(1, 'Condomínio é obrigatório')
});

/**
 * GET /api/vagas - Lista vagas
 * Query params: condominioId, unidadeId, tipo, status (opcionais)
 */
export async function GET(request: NextRequest) {
  return middlewareEstrutura(request, async (req, usuario, condominioId) => {
    try {
      const { searchParams } = new URL(req.url);
      const unidadeId = searchParams.get('unidadeId');
      const tipo = searchParams.get('tipo');
      const status = searchParams.get('status');

      // O middleware já validou o acesso ao condomínio
      let where: any = {
        condominioId: condominioId
      };

      if (unidadeId) {
        where.unidadeId = unidadeId;
      }

      if (tipo) {
        where.tipo = tipo;
      }

      if (status) {
        where.status = status;
      }

      const vagas = await prisma.vaga.findMany({
        where,
        include: {
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
          },
          condominio: {
            select: {
              id: true,
              nome: true
            }
          }
        },
        orderBy: {
          numero: 'asc'
        }
      });

      const vagasFormatadas = vagas.map(vaga => ({
        id: vaga.id,
        numero: vaga.numero,
        tipo: vaga.tipo,
        ocupada: !!vaga.proprietarioId,
        unidade: vaga.unidade,
        condominio: vaga.condominio,
        criadoEm: vaga.criadoEm.toISOString(),
        atualizadoEm: vaga.atualizadoEm.toISOString()
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
}

/**
 * POST /api/vagas - Cria nova vaga
 */
export async function POST(request: NextRequest) {
  return middlewareEstrutura(request, async (req, usuario, condominioId) => {
    try {
      const body = await req.json();
      const validatedData = vagaSchema.parse(body);

      // Verificar se o usuário tem acesso ao condomínio (já validado pelo middleware)
      // O middleware já garante que o usuário tem acesso ao condomínio especificado

      // Verificar se a unidade existe e pertence ao condomínio
      const unidade = await prisma.unidade.findFirst({
        where: {
          id: validatedData.unidadeId,
          condominioId: condominioId
        }
      });

      if (!unidade) {
        return NextResponse.json(
          { error: 'Unidade não encontrada ou não pertence ao condomínio especificado' },
          { status: 404 }
        );
      }

      // Verificar se já existe vaga com mesmo número na unidade
      const vagaExistente = await prisma.vaga.findFirst({
        where: {
          numero: validatedData.numero,
          unidadeId: validatedData.unidadeId
        }
      });

      if (vagaExistente) {
        return NextResponse.json(
          { error: 'Já existe uma vaga com este número nesta unidade' },
          { status: 400 }
        );
      }

      const novaVaga = await prisma.vaga.create({
        data: {
          numero: validatedData.numero,
          tipo: validatedData.tipo,
          unidadeId: validatedData.unidadeId,
          condominioId: condominioId!
        },
        include: {
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
          },
          condominio: {
            select: {
              id: true,
              nome: true
            }
          }
        }
      });

      const vagaFormatada = {
        id: novaVaga.id,
        numero: novaVaga.numero,
        tipo: novaVaga.tipo,
        ocupada: !!novaVaga.proprietarioId,
        unidade: (novaVaga as any).unidade,
        condominio: (novaVaga as any).condominio,
        criadoEm: novaVaga.criadoEm.toISOString(),
        atualizadoEm: novaVaga.atualizadoEm.toISOString()
      };

      return NextResponse.json(vagaFormatada, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: error.issues },
          { status: 400 }
        );
      }
      console.error('Erro ao criar vaga:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  });
}