import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsuarioSessao } from '@/types';
import { calcularValorLocacao } from '@/lib/locacao-utils';
import { registrarEventoLocacao } from '@/lib/locacao-eventos';

const criarLocacaoSchema = z.object({
  vagaId: z.string().min(1, 'ID da vaga é obrigatório'),
  dataInicio: z.string().datetime('Data de início inválida'),
  dataFim: z.string().datetime('Data de fim inválida'),
  tipoLocacao: z.enum(['HORA', 'DIARIA', 'MENSAL', 'ANUAL']),
  placaVeiculo: z
    .string()
    .min(7, 'Informe a placa do veículo')
    .max(8, 'Placa inválida')
    .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')),
  modeloVeiculo: z.string().min(2, 'Informe o modelo do veículo').max(100),
});

const includeLocacaoBase = {
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
          id: true,
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
  eventos: {
    orderBy: {
      criadoEm: 'desc' as const,
    },
    take: 5,
    select: {
      id: true,
      tipo: true,
      titulo: true,
      descricao: true,
      criadoEm: true,
      usuario: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
      return NextResponse.json({ error: 'Vaga não encontrada' }, { status: 404 });
    }

    const usuarioPodeAcessarCondominio = usuario.perfis.some(
      (perfil) => perfil.condominioId === vaga.condominioId
    );

    if (!usuarioPodeAcessarCondominio) {
      return NextResponse.json(
        { error: 'Você não pode solicitar vagas fora do seu condomínio' },
        { status: 403 }
      );
    }

    if (!vaga.configuracaoLocacao?.disponivel) {
      return NextResponse.json(
        { error: 'Vaga não está disponível para locação' },
        { status: 400 }
      );
    }

    if (!vaga.configuracaoLocacao.tiposPermitidos.includes(dados.tipoLocacao)) {
      return NextResponse.json(
        { error: `Modalidade ${dados.tipoLocacao} não permitida para esta vaga` },
        { status: 400 }
      );
    }

    if (!vaga.proprietarioId) {
      return NextResponse.json(
        { error: 'Vaga não possui proprietário associado' },
        { status: 400 }
      );
    }

    if (vaga.proprietarioId === usuario.id) {
      return NextResponse.json(
        { error: 'Você não pode solicitar a locação da própria vaga' },
        { status: 400 }
      );
    }

    const dataInicio = new Date(dados.dataInicio);
    const dataFim = new Date(dados.dataFim);

    if (dataInicio >= dataFim) {
      return NextResponse.json(
        { error: 'A data de início deve ser anterior à data de fim' },
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
        { error: 'Já existe uma locação neste período para esta vaga' },
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
        { error: 'Não foi possível calcular o valor desta locação' },
        { status: 400 }
      );
    }

    const nomeSolicitante = usuario.nome || session.user.name || 'Um morador';

    const locacao = await prisma.$transaction(async (tx) => {
      const data: Prisma.LocacaoUncheckedCreateInput = {
        vagaId: dados.vagaId,
        locatarioId: usuario.id,
        proprietarioId: vaga.proprietarioId!,
        dataInicio,
        dataFim,
        tipoLocacao: dados.tipoLocacao,
        valor,
        placaVeiculo: dados.placaVeiculo,
        modeloVeiculo: dados.modeloVeiculo,
        status: 'PENDENTE',
        statusPagamento: 'PENDENTE',
      };

      const locacaoCriada = await tx.locacao.create({
        data,
      });

      await registrarEventoLocacao(tx, {
        locacaoId: locacaoCriada.id,
        tipo: 'SOLICITACAO_CRIADA',
        titulo: 'Pedido enviado',
        descricao: `${nomeSolicitante} solicitou a vaga ${vaga.numero} para o veículo ${dados.modeloVeiculo} (${dados.placaVeiculo}).`,
        usuarioId: usuario.id,
      });

      await registrarEventoLocacao(tx, {
        locacaoId: locacaoCriada.id,
        tipo: 'PAGAMENTO_FUTURO',
        titulo: 'Pagamento será tratado fora do app',
        descricao:
          'Nesta fase piloto, o SmartPark registra a locação e deixa o pagamento preparado para a próxima etapa do produto.',
        usuarioId: usuario.id,
      });

      await tx.notificacao.create({
        data: {
          usuarioId: vaga.proprietarioId!,
          tipo: 'LOCACAO_SOLICITADA',
          titulo: 'Nova solicitação de locação',
          mensagem: `${nomeSolicitante} solicitou a locação da vaga ${vaga.numero} para o veículo ${dados.modeloVeiculo} (${dados.placaVeiculo}). Valor calculado: R$ ${valor.toFixed(2)}.`,
          locacaoId: locacaoCriada.id,
        },
      });

      return tx.locacao.findUniqueOrThrow({
        where: { id: locacaoCriada.id },
        include: includeLocacaoBase,
      });
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
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    const where: Prisma.LocacaoWhereInput = {};

    if (tipo === 'locatario') {
      where.locatarioId = usuario.id;
    } else if (tipo === 'proprietario') {
      where.proprietarioId = usuario.id;
    } else {
      where.OR = [{ locatarioId: usuario.id }, { proprietarioId: usuario.id }];
    }

    const locacoes = await prisma.locacao.findMany({
      where,
      include: includeLocacaoBase,
      orderBy: {
        criadoEm: 'desc',
      },
    });

    return NextResponse.json(locacoes);
  } catch (error) {
    console.error('Erro ao buscar locações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
