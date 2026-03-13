import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { middlewareEstrutura } from '../../../lib/auth-middleware';

// Schema de validação para vaga
const vagaSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório'),
  tipo: z.enum(['COBERTA', 'DESCOBERTA', 'DEFICIENTE', 'IDOSO', 'VISITANTE']),
  unidadeId: z.string().min(1, 'Unidade é obrigatória'),
  condominioId: z.string().min(1, 'Condomínio é obrigatório'),
  proprietarioId: z.string().optional()
});

/**
 * GET /api/vagas - Lista vagas
 * Query params: condominioId, unidadeId, tipo, status (opcionais)
 */
type VagaListagem = Prisma.VagaGetPayload<{
  include: {
    unidade: {
      select: {
        id: true;
        numero: true;
        proprietario: true;
        torre: {
          select: {
            id: true;
            nome: true;
            tipo: true;
          };
        };
      };
    };
    condominio: {
      select: {
        id: true;
        nome: true;
      };
    };
    proprietario: {
      select: {
        id: true;
        nome: true;
        email: true;
      };
    };
    configuracaoLocacao: {
      select: {
        id: true;
        vagaId: true;
        disponivel: true;
        tiposPermitidos: true;
        valorHora: true;
        valorDiaria: true;
        valorMensal: true;
        valorAnual: true;
        criadoEm: true;
        atualizadoEm: true;
      };
    };
  };
}>;

const vagaInclude = {
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
      id: true,
      vagaId: true,
      disponivel: true,
      tiposPermitidos: true,
      valorHora: true,
      valorDiaria: true,
      valorMensal: true,
      valorAnual: true,
      criadoEm: true,
      atualizadoEm: true
    }
  }
} satisfies Prisma.VagaInclude;

const decimalToNumber = (valor: Prisma.Decimal | null | undefined) =>
  valor?.toNumber() ?? null;

const formatarVagaListagem = (vaga: VagaListagem) => ({
  id: vaga.id,
  numero: vaga.numero,
  tipo: vaga.tipo,
  unidadeId: vaga.unidadeId,
  condominioId: vaga.condominioId,
  proprietarioId: vaga.proprietarioId,
  ocupada: !!vaga.proprietarioId,
  unidade: vaga.unidade,
  condominio: vaga.condominio,
  proprietario: vaga.proprietario,
  configuracaoLocacao: vaga.configuracaoLocacao
    ? {
        id: vaga.configuracaoLocacao.id,
        vagaId: vaga.configuracaoLocacao.vagaId,
        disponivel: vaga.configuracaoLocacao.disponivel,
        tiposPermitidos: vaga.configuracaoLocacao.tiposPermitidos,
        valorHora: decimalToNumber(vaga.configuracaoLocacao.valorHora),
        valorDiaria: decimalToNumber(vaga.configuracaoLocacao.valorDiaria),
        valorMensal: decimalToNumber(vaga.configuracaoLocacao.valorMensal),
        valorAnual: decimalToNumber(vaga.configuracaoLocacao.valorAnual),
        criadoEm: vaga.configuracaoLocacao.criadoEm.toISOString(),
        atualizadoEm: vaga.configuracaoLocacao.atualizadoEm.toISOString()
      }
    : null,
  criadoEm: vaga.criadoEm.toISOString(),
  atualizadoEm: vaga.atualizadoEm.toISOString()
});

export async function GET(request: NextRequest) {
  return middlewareEstrutura(request, async (req, usuario, condominioId) => {
    try {
      const { searchParams } = new URL(req.url);
      const unidadeId = searchParams.get('unidadeId');
      const tipo = searchParams.get('tipo');
      const status = searchParams.get('status');

      // O middleware já validou o acesso ao condomínio
      const where: Record<string, unknown> = {
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
        include: vagaInclude,
        orderBy: {
          numero: 'asc'
        }
      });

      return NextResponse.json(vagas.map(formatarVagaListagem));
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
        },
        select: {
          id: true,
          numero: true,
          usuarioId: true
        }
      });

      if (!unidade) {
        return NextResponse.json(
          { error: 'Unidade não encontrada ou não pertence ao condomínio especificado' },
          { status: 404 }
        );
      }

      // Se não foi informado proprietário, usar o morador da unidade
      let proprietarioId = validatedData.proprietarioId;
      console.log('🔍 DEBUG - Unidade:', { id: unidade.id, numero: unidade.numero, usuarioId: unidade.usuarioId });
      console.log('🔍 DEBUG - proprietarioId antes:', proprietarioId);
      if (!proprietarioId && unidade.usuarioId) {
        proprietarioId = unidade.usuarioId;
        console.log('✅ DEBUG - Usando usuarioId da unidade:', proprietarioId);
      } else if (!proprietarioId) {
        console.log('⚠️ DEBUG - Unidade não tem usuarioId e nenhum proprietário foi informado');
      }
      console.log('🔍 DEBUG - proprietarioId final:', proprietarioId);

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

      // Verificar se o proprietário informado existe e é morador ativo do condomínio (se fornecido)
      if (proprietarioId) {
        console.log('🔍 DEBUG - Verificando proprietário:', proprietarioId);
        const proprietario = await prisma.usuario.findUnique({
          where: { id: proprietarioId },
          include: {
            perfis: {
              where: {
                condominioId: condominioId
              },
              select: { id: true, tipo: true, ativo: true }
            }
          }
        });

        console.log('🔍 DEBUG - Proprietário encontrado:', proprietario);
        console.log('🔍 DEBUG - Perfis do proprietário:', proprietario?.perfis);

        if (!proprietario) {
          return NextResponse.json(
            { error: 'Proprietário não encontrado' },
            { status: 400 }
          );
        }

        // Verificar se tem algum perfil ativo no condomínio (não precisa ser morador)
        const temPerfilAtivoNoCondominio = proprietario.perfis.some(p => p.ativo);
        if (!temPerfilAtivoNoCondominio) {
          return NextResponse.json(
            { error: 'Proprietário não tem perfil ativo neste condomínio' },
            { status: 400 }
          );
        }
      }

      const novaVaga = await prisma.vaga.create({
        data: {
          numero: validatedData.numero,
          tipo: validatedData.tipo,
          unidadeId: validatedData.unidadeId,
          condominioId: condominioId!,
          proprietarioId: proprietarioId || null,
          configuracaoLocacao: {
            create: {
              disponivel: false,
              tiposPermitidos: []
            }
          }
        },
        include: vagaInclude
      });

      return NextResponse.json(formatarVagaListagem(novaVaga), { status: 201 });
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
