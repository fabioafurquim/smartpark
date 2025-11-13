import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { middlewareEstrutura } from '../../../lib/auth-middleware';
import { UsuarioSessao } from '../../../types';

// Schema de validação para unidade
const unidadeSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório'),
  tipo: z.enum(['APARTAMENTO', 'SALA_COMERCIAL', 'LOJA', 'COBERTURA']),
  proprietario: z.string().min(1, 'Proprietário é obrigatório'),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  torreId: z.string().min(1, 'Torre é obrigatória'),
  condominioId: z.string().min(1, 'Condomínio é obrigatório')
});

/**
 * GET /api/unidades - Lista unidades
 * Query params: condominioId, torreId (opcionais)
 */
export async function GET(request: NextRequest) {
  return middlewareEstrutura(request, async (req, usuario: UsuarioSessao, condominioId?: string) => {
    try {
      const { searchParams } = new URL(req.url);
      const torreId = searchParams.get('torreId');

      const where: any = {};
      // O condominioId já vem validado pelo middleware
      if (condominioId) where.condominioId = condominioId;
      if (torreId) where.torreId = torreId;

      const unidades = await prisma.unidade.findMany({
        where,
        include: {
          condominio: {
            select: {
              id: true,
              nome: true
            }
          },
          torre: {
            select: {
              id: true,
              nome: true,
              tipo: true
            }
          },
          _count: {
            select: {
              vagas: true
            }
          }
        },
        orderBy: [
          { torre: { nome: 'asc' } },
          { andar: 'asc' },
          { numero: 'asc' }
        ]
      });

      // Transformar dados para incluir totalVagas
      const unidadesFormatadas = unidades.map(unidade => ({
        id: unidade.id,
        numero: unidade.numero,
        andar: unidade.andar,
        tipo: unidade.tipo,
        proprietario: unidade.proprietario,
        condominioId: unidade.condominioId,
        torreId: unidade.torreId,
        condominio: unidade.condominio,
        torre: unidade.torre,
        totalVagas: unidade._count.vagas,
        criadoEm: unidade.criadoEm,
        atualizadoEm: unidade.atualizadoEm
      }));

      return NextResponse.json(unidadesFormatadas);
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/unidades - Cria nova unidade
 */
export async function POST(request: NextRequest) {
  return middlewareEstrutura(request, async (req, usuario: UsuarioSessao, condominioId?: string) => {
    try {
      const body = await req.json();
      const validatedData = unidadeSchema.parse(body);

      // Garantir que o condominioId do body corresponde ao permitido pelo middleware
      if (condominioId && validatedData.condominioId !== condominioId) {
        return NextResponse.json(
          { error: 'Condomínio especificado não corresponde às suas permissões' },
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

      // Verificar se a torre existe e pertence ao condomínio
      const torre = await prisma.torre.findFirst({
        where: {
          id: validatedData.torreId,
          condominioId: validatedData.condominioId
        }
      });

      if (!torre) {
        return NextResponse.json(
          { error: 'Torre/Bloco não encontrada ou não pertence ao condomínio selecionado' },
          { status: 404 }
        );
      }

      // Verificar se já existe unidade com mesmo número na torre
      const unidadeExistente = await prisma.unidade.findFirst({
        where: {
          numero: validatedData.numero,
          torreId: validatedData.torreId
        }
      });

      if (unidadeExistente) {
        return NextResponse.json(
          { error: 'Já existe uma unidade com este número nesta torre/bloco' },
          { status: 400 }
        );
      }

      const novaUnidade = await prisma.unidade.create({
        data: validatedData,
        include: {
          condominio: {
            select: {
              id: true,
              nome: true
            }
          },
          torre: {
            select: {
              id: true,
              nome: true,
              tipo: true
            }
          },
          _count: {
            select: {
              vagas: true
            }
          }
        }
      });

      const unidadeFormatada = {
        id: novaUnidade.id,
        numero: novaUnidade.numero,
        andar: novaUnidade.andar,
        tipo: novaUnidade.tipo,
        proprietario: novaUnidade.proprietario,
        condominioId: novaUnidade.condominioId,
        torreId: novaUnidade.torreId,
        condominio: novaUnidade.condominio,
        torre: novaUnidade.torre,
        totalVagas: novaUnidade._count.vagas,
        criadoEm: novaUnidade.criadoEm,
        atualizadoEm: novaUnidade.atualizadoEm
      };

      return NextResponse.json(unidadeFormatada, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Erro ao criar unidade:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  });
}
