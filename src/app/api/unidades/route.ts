import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { middlewareEstrutura, middlewareEstruturaOperacional } from '../../../lib/auth-middleware';
import { UsuarioSessao } from '../../../types';

// Schema de validação para unidade
const unidadeSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório'),
  tipo: z.enum(['APARTAMENTO', 'SALA_COMERCIAL', 'LOJA', 'COBERTURA']),
  proprietario: z.string().min(1).optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  torreId: z.string().min(1, 'Torre é obrigatória'),
  condominioId: z.string().min(1, 'Condomínio é obrigatório'),
  usuarioId: z.string().optional().nullable(),
  andar: z.number().optional(),
  contato: z.string().optional()
});

/**
 * GET /api/unidades - Lista unidades
 * Query params: condominioId, torreId (opcionais)
 */
export async function GET(request: NextRequest) {
  return middlewareEstruturaOperacional(request, async (req, usuario: UsuarioSessao, condominioId?: string) => {
    try {
      const { searchParams } = new URL(req.url);
      const torreId = searchParams.get('torreId');

      const where: any = {};
      // O condominioId já vem validado pelo middleware
      if (condominioId) where.condominioId = condominioId;
      if (torreId) where.torreId = torreId;

      const unidadesComRelacoes = await prisma.unidade.findMany({
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
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true
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
      const unidadesFormatadas = unidadesComRelacoes.map(unidade => ({
        id: unidade.id,
        numero: unidade.numero,
        andar: unidade.andar,
        tipo: unidade.tipo,
        proprietario: unidade.proprietario,
        contato: unidade.contato,
        condominioId: unidade.condominioId,
        torreId: unidade.torreId,
        usuarioId: unidade.usuarioId,
        usuario: unidade.usuario,
        condominio: unidade.condominio,
        torre: unidade.torre,
        totalVagas: unidade._count.vagas,
        criadoEm: unidade.criadoEm.toISOString(),
        atualizadoEm: unidade.atualizadoEm.toISOString()
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
        console.error('🔴 Unidade duplicada encontrada:', {
          numero: validatedData.numero,
          torreId: validatedData.torreId,
          unidadeExistenteId: unidadeExistente.id,
          unidadeExistenteCondominioId: unidadeExistente.condominioId
        });
        return NextResponse.json(
          { 
            error: 'Já existe uma unidade com este número nesta torre/bloco',
            details: `Unidade ${unidadeExistente.numero} já existe na torre`
          },
          { status: 400 }
        );
      }

      // Validar usuarioId se fornecido
      if (validatedData.usuarioId) {
        const usuario = await prisma.usuario.findUnique({
          where: { id: validatedData.usuarioId }
        });

        if (!usuario) {
          return NextResponse.json(
            { error: 'Usuário não encontrado' },
            { status: 404 }
          );
        }

        // Verificar se o usuário tem perfil de morador no condomínio
        const perfilMorador = await prisma.perfilUsuario.findFirst({
          where: {
            usuarioId: validatedData.usuarioId,
            condominioId: validatedData.condominioId,
            tipo: 'morador'
          }
        });

        if (!perfilMorador) {
          return NextResponse.json(
            { error: 'Usuário não é um morador deste condomínio' },
            { status: 400 }
          );
        }
      }

      const novaUnidade = await prisma.unidade.create({
        data: {
          numero: validatedData.numero,
          tipo: validatedData.tipo,
          proprietario: validatedData.proprietario,
          contato: validatedData.contato,
          torreId: validatedData.torreId,
          condominioId: validatedData.condominioId,
          usuarioId: validatedData.usuarioId || null,
          andar: validatedData.andar || 0
        },
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
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true
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
        contato: novaUnidade.contato,
        condominioId: novaUnidade.condominioId,
        torreId: novaUnidade.torreId,
        usuarioId: novaUnidade.usuarioId,
        usuario: novaUnidade.usuario,
        condominio: novaUnidade.condominio,
        torre: novaUnidade.torre,
        totalVagas: novaUnidade._count.vagas,
        criadoEm: novaUnidade.criadoEm.toISOString(),
        atualizadoEm: novaUnidade.atualizadoEm.toISOString()
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
