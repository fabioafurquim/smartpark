import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsuarioSessao } from '@/types';
import { calcularValorLocacao } from '@/lib/locacao-utils';

const criarLocacaoSchema = z.object({
  vagaId: z.string().min(1, 'ID da vaga e obrigatorio'),
  dataInicio: z.string().datetime('Data de inicio invalida'),
  dataFim: z.string().datetime('Data de fim invalida'),
  tipoLocacao: z.enum(['HORA', 'DIARIA', 'MENSAL', 'ANUAL']),
  placaVeiculo: z
    .string()
    .min(7, 'Informe a placa do veiculo')
    .max(8, 'Placa invalida')
    .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')),
  modeloVeiculo: z.string().min(2, 'Informe o modelo do veiculo').max(100),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const body = await request.json();
    const dados = criarLocacaoSchema.parse(body);

    const vaga = await prisma.vaga.findUnique({
      where: {
        id: dados.vagaId,
      },
      include: {
        configuracaoLocacao: true,
        proprietario: true,
        unidade: true,
      },
    });

    if (!vaga) {
      return NextResponse.json(
        { error: 'Vaga nao encontrada' },
        { status: 404 }
      );
    }

    const usuarioPodeAcessarCondominio = usuario.perfis.some(
      (perfil) => perfil.condominioId === vaga.condominioId
    );

    if (!usuarioPodeAcessarCondominio) {
      return NextResponse.json(
        { error: 'Voce nao pode solicitar vagas fora do seu condominio' },
        { status: 403 }
      );
    }

    if (!vaga.configuracaoLocacao?.disponivel) {
      return NextResponse.json(
        { error: 'Vaga nao esta disponivel para locacao' },
        { status: 400 }
      );
    }

    if (!vaga.configuracaoLocacao.tiposPermitidos.includes(dados.tipoLocacao)) {
      return NextResponse.json(
        { error: `Tipo de locacao ${dados.tipoLocacao} nao permitido para esta vaga` },
        { status: 400 }
      );
    }

    if (!vaga.proprietarioId) {
      return NextResponse.json(
        { error: 'Vaga nao possui proprietario associado' },
        { status: 400 }
      );
    }

    if (vaga.proprietarioId === usuario.id) {
      return NextResponse.json(
        { error: 'Voce nao pode solicitar a locacao da propria vaga' },
        { status: 400 }
      );
    }

    const dataInicio = new Date(dados.dataInicio);
    const dataFim = new Date(dados.dataFim);

    if (dataInicio >= dataFim) {
      return NextResponse.json(
        { error: 'Data de inicio deve ser anterior a data de fim' },
        { status: 400 }
      );
    }

    const locacaoExistente = await prisma.locacao.findFirst({
      where: {
        vagaId: dados.vagaId,
        status: {
          in: ['PENDENTE', 'ATIVA'],
        },
        AND: [{ dataInicio: { lte: dataFim } }, { dataFim: { gte: dataInicio } }],
      },
    });

    if (locacaoExistente) {
      return NextResponse.json(
        { error: 'Ja existe uma locacao neste periodo para esta vaga' },
        { status: 400 }
      );
    }

    const valor = calcularValorLocacao(dados.tipoLocacao, dataInicio, dataFim, {
      valorHora: vaga.configuracaoLocacao.valorHora
        ? Number(vaga.configuracaoLocacao.valorHora)
        : null,
      valorDiaria: vaga.configuracaoLocacao.valorDiaria
        ? Number(vaga.configuracaoLocacao.valorDiaria)
        : null,
      valorMensal: vaga.configuracaoLocacao.valorMensal
        ? Number(vaga.configuracaoLocacao.valorMensal)
        : null,
      valorAnual: vaga.configuracaoLocacao.valorAnual
        ? Number(vaga.configuracaoLocacao.valorAnual)
        : null,
    });

    if (valor == null) {
      return NextResponse.json(
        { error: 'Nao foi possivel calcular o valor desta locacao' },
        { status: 400 }
      );
    }

    const data: Prisma.LocacaoUncheckedCreateInput = {
      vagaId: dados.vagaId,
      locatarioId: usuario.id,
      proprietarioId: vaga.proprietarioId,
      dataInicio,
      dataFim,
      tipoLocacao: dados.tipoLocacao,
      valor,
      placaVeiculo: dados.placaVeiculo,
      modeloVeiculo: dados.modeloVeiculo,
      status: 'PENDENTE',
    };

    const locacao = await prisma.locacao.create({
      data,
      include: {
        vaga: {
          include: {
            unidade: true,
            condominio: true,
          },
        },
        locatario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        proprietario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    await prisma.notificacao.create({
      data: {
        usuarioId: vaga.proprietarioId,
        tipo: 'LOCACAO_SOLICITADA',
        titulo: 'Nova solicitacao de locacao',
        mensagem: `${usuario.nome} solicitou a locacao da vaga ${vaga.numero} para o veiculo ${dados.modeloVeiculo} (${dados.placaVeiculo}). Valor calculado: R$ ${valor.toFixed(2)}.`,
        locacaoId: locacao.id,
      },
    });

    return NextResponse.json(locacao, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao criar locacao:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    const where: Record<string, unknown> = {};

    if (tipo === 'locatario') {
      where.locatarioId = usuario.id;
    } else if (tipo === 'proprietario') {
      where.proprietarioId = usuario.id;
    } else {
      where.OR = [{ locatarioId: usuario.id }, { proprietarioId: usuario.id }];
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
                    nome: true,
                  },
                },
              },
            },
            condominio: {
              select: {
                nome: true,
              },
            },
          },
        },
        locatario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        proprietario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'desc',
      },
    });

    return NextResponse.json(locacoes);
  } catch (error) {
    console.error('Erro ao buscar locacoes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
