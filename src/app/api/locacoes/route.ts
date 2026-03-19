import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions, temPermissao } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsuarioSessao } from '@/types';
import { registrarEventoLocacao } from '@/lib/locacao-eventos';
import { condominioUsaEmprestimo } from '@/lib/condominio-modalidade';

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
  locatarioId: z.string().min(1).optional(),
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
          modalidade: true,
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
    where: {
      tipo: {
        not: 'PAGAMENTO_DESATIVADO_PILOTO',
      },
    },
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
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
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
        condominio: {
          select: {
            id: true,
            nome: true,
            modalidade: true,
          },
        },
      },
    });

    if (!vaga) {
      return NextResponse.json({ error: 'Vaga nao encontrada' }, { status: 404 });
    }

    const usuarioPodeAcessarCondominio = usuario.perfis.some(
      (perfil) => perfil.condominioId === vaga.condominioId
    );

    if (!usuarioPodeAcessarCondominio) {
      return NextResponse.json(
        { error: 'Voce nao pode registrar uso em outro condominio' },
        { status: 403 }
      );
    }

    if (!vaga.configuracaoLocacao?.disponivel) {
      return NextResponse.json(
        { error: 'Vaga nao esta disponivel para emprestimo neste momento' },
        { status: 400 }
      );
    }

    if (!vaga.configuracaoLocacao.tiposPermitidos.includes(dados.tipoLocacao)) {
      return NextResponse.json(
        { error: `Modalidade ${dados.tipoLocacao} nao permitida para esta vaga` },
        { status: 400 }
      );
    }

    if (!vaga.proprietarioId) {
      return NextResponse.json(
        { error: 'Vaga nao possui responsavel associado' },
        { status: 400 }
      );
    }

    const condominioId = vaga.condominioId;
    const registrandoParaOutroUsuario =
      !!dados.locatarioId && dados.locatarioId !== usuario.id;

    if (
      registrandoParaOutroUsuario &&
      !temPermissao(usuario, 'registrarEmprestimoManual', condominioId)
    ) {
      return NextResponse.json(
        { error: 'Voce nao tem permissao para registrar emprestimos para outros moradores' },
        { status: 403 }
      );
    }

    const locatarioId = dados.locatarioId || usuario.id;

    if (vaga.proprietarioId === locatarioId) {
      return NextResponse.json(
        { error: 'Nao e possivel registrar emprestimo para o proprio dono da vaga' },
        { status: 400 }
      );
    }

    const locatario = await prisma.usuario.findUnique({
      where: {
        id: locatarioId,
      },
      include: {
        perfis: {
          where: {
            condominioId,
            ativo: true,
          },
        },
      },
    });

    if (!locatario) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    if (!locatario.perfis.some((perfil) => perfil.tipo === 'morador')) {
      return NextResponse.json(
        { error: 'O usuario informado nao possui perfil de morador neste condominio' },
        { status: 400 }
      );
    }

    const dataInicio = new Date(dados.dataInicio);
    const dataFim = new Date(dados.dataFim);

    if (dataInicio >= dataFim) {
      return NextResponse.json(
        { error: 'A data de inicio deve ser anterior a data de fim' },
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
        { error: 'Ja existe um uso registrado neste periodo para esta vaga' },
        { status: 400 }
      );
    }

    const nomeSolicitante = locatario.nome || session.user.name || 'Morador';
    const descricaoOperacao = condominioUsaEmprestimo(vaga.condominio.modalidade)
      ? 'emprestimo'
      : 'uso da vaga';
    const criadoPorGestor = registrandoParaOutroUsuario;
    const valorCalculado = 0;

    const locacao = await prisma.$transaction(async (tx) => {
      const data: Prisma.LocacaoUncheckedCreateInput = {
        vagaId: dados.vagaId,
        locatarioId,
        proprietarioId: vaga.proprietarioId!,
        dataInicio,
        dataFim,
        tipoLocacao: dados.tipoLocacao,
        valor: valorCalculado,
        placaVeiculo: dados.placaVeiculo,
        modeloVeiculo: dados.modeloVeiculo,
        status: 'ATIVA',
        statusPagamento: 'PENDENTE',
        pagamentoObservacao: null,
      };

      const locacaoCriada = await tx.locacao.create({
        data,
      });

      await registrarEventoLocacao(tx, {
        locacaoId: locacaoCriada.id,
        tipo: criadoPorGestor ? 'EMPRESTIMO_REGISTRADO_GESTAO' : 'EMPRESTIMO_CONFIRMADO',
        titulo: criadoPorGestor ? 'Emprestimo registrado pela administracao' : 'Emprestimo confirmado automaticamente',
        descricao: criadoPorGestor
          ? `${usuario.nome} registrou o ${descricaoOperacao} da vaga ${vaga.numero} para ${nomeSolicitante}, veiculo ${dados.modeloVeiculo} (${dados.placaVeiculo}).`
          : `${nomeSolicitante} confirmou o ${descricaoOperacao} da vaga ${vaga.numero} para o veiculo ${dados.modeloVeiculo} (${dados.placaVeiculo}).`,
        usuarioId: usuario.id,
      });

      await tx.notificacao.createMany({
        data: [
          {
            usuarioId: vaga.proprietarioId!,
            tipo: 'EMPRESTIMO_REGISTRADO',
            titulo: 'Sua vaga foi utilizada',
            mensagem: `${nomeSolicitante} registrou o ${descricaoOperacao} da vaga ${vaga.numero} para o veiculo ${dados.modeloVeiculo} (${dados.placaVeiculo}).`,
            locacaoId: locacaoCriada.id,
          },
          {
            usuarioId: locatarioId,
            tipo: 'EMPRESTIMO_CONFIRMADO',
            titulo: 'Emprestimo confirmado',
            mensagem: `O ${descricaoOperacao} da vaga ${vaga.numero} foi confirmado para o periodo selecionado.`,
            locacaoId: locacaoCriada.id,
          },
        ],
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
        { error: error.issues[0]?.message || 'Dados invalidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao criar locacao:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
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
    console.error('Erro ao buscar locacoes:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
