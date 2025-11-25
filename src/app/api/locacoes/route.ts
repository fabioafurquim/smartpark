import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { UsuarioSessao } from '../../../types';

const criarLocacaoSchema = z.object({
  vagaId: z.string().min(1, 'ID da vaga é obrigatório'),
  dataInicio: z.string().datetime('Data de início inválida'),
  dataFim: z.string().datetime('Data de fim inválida'),
  tipoLocacao: z.enum(['HORA', 'DIARIA', 'MENSAL', 'ANUAL']),
  valor: z.number().positive('Valor deve ser positivo')
});

/**
 * POST /api/locacoes
 * Criar nova locação
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const body = await request.json();
    const validatedData = criarLocacaoSchema.parse(body);

    // Buscar vaga
    const vaga = await prisma.vaga.findUnique({
      where: { id: validatedData.vagaId },
      include: {
        configuracaoLocacao: true,
        proprietario: true,
        unidade: true
      }
    });

    if (!vaga) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se vaga está disponível
    if (!vaga.configuracaoLocacao?.disponivel) {
      return NextResponse.json(
        { error: 'Vaga não está disponível para locação' },
        { status: 400 }
      );
    }

    // Verificar se o tipo de locação é permitido
    if (!vaga.configuracaoLocacao.tiposPermitidos.includes(validatedData.tipoLocacao)) {
      return NextResponse.json(
        { error: `Tipo de locação ${validatedData.tipoLocacao} não permitido para esta vaga` },
        { status: 400 }
      );
    }

    // Verificar se não há conflito de datas
    const dataInicio = new Date(validatedData.dataInicio);
    const dataFim = new Date(validatedData.dataFim);

    if (dataInicio >= dataFim) {
      return NextResponse.json(
        { error: 'Data de início deve ser anterior à data de fim' },
        { status: 400 }
      );
    }

    const locacaoExistente = await prisma.locacao.findFirst({
      where: {
        vagaId: validatedData.vagaId,
        status: { in: ['PENDENTE', 'ATIVA'] },
        AND: [
          { dataInicio: { lte: dataFim } },
          { dataFim: { gte: dataInicio } }
        ]
      }
    });

    if (locacaoExistente) {
      return NextResponse.json(
        { error: 'Já existe uma locação neste período para esta vaga' },
        { status: 400 }
      );
    }

    // Verificar se vaga tem proprietário
    if (!vaga.proprietarioId) {
      return NextResponse.json(
        { error: 'Vaga não possui proprietário associado' },
        { status: 400 }
      );
    }

    // Criar locação
    const locacao = await prisma.locacao.create({
      data: {
        vagaId: validatedData.vagaId,
        locatarioId: usuario.id,
        proprietarioId: vaga.proprietarioId,
        dataInicio,
        dataFim,
        tipoLocacao: validatedData.tipoLocacao,
        valor: validatedData.valor,
        status: 'PENDENTE'
      },
      include: {
        vaga: {
          include: {
            unidade: true,
            condominio: true
          }
        },
        locatario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        proprietario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      }
    });

    // Criar notificação para o proprietário
    await prisma.notificacao.create({
      data: {
        usuarioId: vaga.proprietarioId,
        tipo: 'LOCACAO_SOLICITADA',
        titulo: 'Nova Solicitação de Locação',
        mensagem: `${usuario.nome} solicitou a locação da sua vaga ${vaga.numero}. Valor: R$ ${validatedData.valor.toFixed(2)}`,
        locacaoId: locacao.id
      }
    });

    return NextResponse.json(locacao, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao criar locação:', error);
    const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: mensagemErro },
      { status: 500 }
    );
  }
}

/**
 * GET /api/locacoes
 * Listar locações do usuário logado
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

    const usuario = session.user as UsuarioSessao;
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'locatario' ou 'proprietario'

    const where: any = {};

    if (tipo === 'locatario') {
      where.locatarioId = usuario.id;
    } else if (tipo === 'proprietario') {
      where.proprietarioId = usuario.id;
    } else {
      // Retornar ambas
      where.OR = [
        { locatarioId: usuario.id },
        { proprietarioId: usuario.id }
      ];
    }

    const locacoes = await prisma.locacao.findMany({
      where,
      include: {
        vaga: {
          include: {
            unidade: {
              select: {
                numero: true,
                torre: {
                  select: {
                    nome: true
                  }
                }
              }
            },
            condominio: {
              select: {
                nome: true
              }
            }
          }
        },
        locatario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        proprietario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      },
      orderBy: { criadoEm: 'desc' }
    });

    return NextResponse.json(locacoes);
  } catch (error) {
    console.error('Erro ao buscar locações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
