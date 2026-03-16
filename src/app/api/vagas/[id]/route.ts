import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions, temPermissao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';

const tipoLocacaoValues = ['HORA', 'DIARIA', 'MENSAL', 'ANUAL'] as const;

const decimalField = z.coerce
  .number()
  .min(0, 'Valor nao pode ser negativo')
  .nullable()
  .optional();

const configuracaoLocacaoSchema = z
  .object({
    disponivel: z.boolean(),
    tiposPermitidos: z.array(z.enum(tipoLocacaoValues)).default([]),
    valorHora: decimalField,
    valorDiaria: decimalField,
    valorMensal: decimalField,
    valorAnual: decimalField,
  })
  .superRefine((data, ctx) => {
    if (data.disponivel && data.tiposPermitidos.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione ao menos um tipo de locacao ao disponibilizar a vaga',
        path: ['tiposPermitidos'],
      });
    }

    const tipoPorCampo: Record<string, (typeof tipoLocacaoValues)[number]> = {
      valorHora: 'HORA',
      valorDiaria: 'DIARIA',
      valorMensal: 'MENSAL',
      valorAnual: 'ANUAL',
    };

    (['valorHora', 'valorDiaria', 'valorMensal', 'valorAnual'] as const).forEach(
      (campo) => {
        const valor = data[campo];

        if (valor !== undefined && valor !== null) {
          const tipoNecessario = tipoPorCampo[campo];

          if (!data.tiposPermitidos.includes(tipoNecessario)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Inclua o tipo ${tipoNecessario.toLowerCase()} em tiposPermitidos para definir ${campo}`,
              path: ['tiposPermitidos'],
            });
          }
        }
      }
    );
  });

const updateVagaSchema = z.object({
  numero: z.string().min(1, 'Numero e obrigatorio').optional(),
  tipo: z
    .enum(['COBERTA', 'DESCOBERTA', 'DEFICIENTE', 'IDOSO', 'VISITANTE'])
    .optional(),
  unidadeId: z.string().min(1, 'Unidade e obrigatoria').optional(),
  proprietarioId: z
    .string()
    .min(1, 'Proprietario e obrigatorio')
    .nullable()
    .optional(),
  configuracaoLocacao: configuracaoLocacaoSchema.optional(),
});

type UpdateVagaPayload = z.infer<typeof updateVagaSchema>;
type ConfiguracaoLocacaoPayload = UpdateVagaPayload['configuracaoLocacao'];

const vagaInclude = Prisma.validator<Prisma.VagaInclude>()({
  condominio: {
    select: {
      id: true,
      nome: true,
    },
  },
  unidade: {
    select: {
      id: true,
      numero: true,
      proprietario: true,
      contato: true,
      torre: {
        select: {
          id: true,
          nome: true,
          tipo: true,
        },
      },
    },
  },
  proprietario: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
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
      atualizadoEm: true,
    },
  },
});

const vagaArgs = Prisma.validator<Prisma.VagaDefaultArgs>()({ include: vagaInclude });

type VagaComRelacionamentos = Prisma.VagaGetPayload<typeof vagaArgs>;

const toDecimalOrNull = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? null : new Prisma.Decimal(valor);

const toDecimalOrUndefined = (valor: number | null | undefined) =>
  valor === undefined ? undefined : toDecimalOrNull(valor);

const decimalToNumber = (valor: Prisma.Decimal | null | undefined) =>
  valor?.toNumber() ?? null;

const formatarConfiguracaoLocacao = (
  configuracao: VagaComRelacionamentos['configuracaoLocacao']
) => {
  if (!configuracao) {
    return null;
  }

  return {
    id: configuracao.id,
    vagaId: configuracao.vagaId,
    disponivel: configuracao.disponivel,
    tiposPermitidos: configuracao.tiposPermitidos,
    valorHora: decimalToNumber(configuracao.valorHora),
    valorDiaria: decimalToNumber(configuracao.valorDiaria),
    valorMensal: decimalToNumber(configuracao.valorMensal),
    valorAnual: decimalToNumber(configuracao.valorAnual),
    criadoEm: configuracao.criadoEm.toISOString(),
    atualizadoEm: configuracao.atualizadoEm.toISOString(),
  };
};

const atualizarConfiguracaoLocacao = async (
  vagaId: string,
  configuracao: ConfiguracaoLocacaoPayload
) => {
  if (configuracao === undefined) {
    return;
  }

  await prisma.configuracaoLocacaoVaga.upsert({
    where: { vagaId },
    create: {
      vaga: { connect: { id: vagaId } },
      disponivel: configuracao.disponivel,
      tiposPermitidos: configuracao.tiposPermitidos,
      valorHora: toDecimalOrNull(configuracao.valorHora),
      valorDiaria: toDecimalOrNull(configuracao.valorDiaria),
      valorMensal: toDecimalOrNull(configuracao.valorMensal),
      valorAnual: toDecimalOrNull(configuracao.valorAnual),
    },
    update: {
      disponivel: configuracao.disponivel,
      tiposPermitidos: configuracao.tiposPermitidos,
      valorHora: toDecimalOrUndefined(configuracao.valorHora),
      valorDiaria: toDecimalOrUndefined(configuracao.valorDiaria),
      valorMensal: toDecimalOrUndefined(configuracao.valorMensal),
      valorAnual: toDecimalOrUndefined(configuracao.valorAnual),
    },
  });
};

const formatarVaga = (vaga: VagaComRelacionamentos | null) => {
  if (!vaga) {
    return null;
  }

  return {
    id: vaga.id,
    numero: vaga.numero,
    tipo: vaga.tipo,
    condominioId: vaga.condominioId,
    unidadeId: vaga.unidadeId,
    proprietarioId: vaga.proprietarioId,
    condominio: vaga.condominio,
    unidade: vaga.unidade,
    proprietario: vaga.proprietario,
    configuracaoLocacao: formatarConfiguracaoLocacao(vaga.configuracaoLocacao),
    criadoEm: vaga.criadoEm.toISOString(),
    atualizadoEm: vaga.atualizadoEm.toISOString(),
  };
};

const buscarVagaOuErro = async (id: string) =>
  prisma.vaga.findUnique({
    where: { id },
    ...vagaArgs,
  });

const validarPermissaoEstrutura = (usuario: UsuarioSessao, condominioId: string) => {
  if (!temPermissao(usuario, 'gerenciarEstrutura', condominioId)) {
    return NextResponse.json(
      { error: 'Acesso negado ao condominio especificado' },
      { status: 403 }
    );
  }

  return null;
};

const obterResumoMovimentacoesVaga = async (vagaId: string) => {
  const [locacoesAtivas, reservasAtivas, totalLocacoes, totalReservas, solicitacoesCadastro] =
    await Promise.all([
    prisma.locacao.count({
      where: {
        vagaId,
        status: {
          in: ['PENDENTE', 'ATIVA'],
        },
      },
    }),
    prisma.reserva.count({
      where: {
        vagaId,
        status: {
          in: ['ativa', 'confirmada', 'ATIVA', 'CONFIRMADA'],
        },
      },
    }),
    prisma.locacao.count({
      where: {
        vagaId,
      },
    }),
    prisma.reserva.count({
      where: {
        vagaId,
      },
    }),
    prisma.solicitacaoCadastro.count({
      where: {
        vagaId,
      },
    }),
  ]);

  return {
    locacoesAtivas,
    reservasAtivas,
    totalLocacoes,
    totalReservas,
    solicitacoesCadastro,
    possuiMovimentacaoAtiva: locacoesAtivas > 0 || reservasAtivas > 0,
    possuiHistorico: totalLocacoes > 0 || totalReservas > 0,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const vaga = await buscarVagaOuErro(id);

    if (!vaga) {
      return NextResponse.json({ error: 'Vaga nao encontrada' }, { status: 404 });
    }

    const respostaPermissao = validarPermissaoEstrutura(usuario, vaga.condominioId);
    if (respostaPermissao) {
      return respostaPermissao;
    }

    return NextResponse.json(formatarVaga(vaga));
  } catch (error) {
    console.error('Erro ao buscar vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateVagaSchema.parse(body);

    const vagaExistente = await prisma.vaga.findUnique({
      where: { id },
      select: {
        id: true,
        numero: true,
        condominioId: true,
        unidadeId: true,
        proprietarioId: true,
      },
    });

    if (!vagaExistente) {
      return NextResponse.json({ error: 'Vaga nao encontrada' }, { status: 404 });
    }

    const respostaPermissao = validarPermissaoEstrutura(
      usuario,
      vagaExistente.condominioId
    );
    if (respostaPermissao) {
      return respostaPermissao;
    }

    if (validatedData.numero && validatedData.numero !== vagaExistente.numero) {
      const vagaComMesmoNumero = await prisma.vaga.findFirst({
        where: {
          numero: validatedData.numero,
          condominioId: vagaExistente.condominioId,
          id: { not: id },
        },
      });

      if (vagaComMesmoNumero) {
        return NextResponse.json(
          { error: 'Ja existe uma vaga com este numero neste condominio' },
          { status: 400 }
        );
      }
    }

    let unidadeIdAtualizada = vagaExistente.unidadeId;

    if (validatedData.unidadeId && validatedData.unidadeId !== vagaExistente.unidadeId) {
      const unidade = await prisma.unidade.findFirst({
        where: {
          id: validatedData.unidadeId,
          condominioId: vagaExistente.condominioId,
        },
        select: {
          id: true,
          usuarioId: true,
        },
      });

      if (!unidade) {
        return NextResponse.json(
          { error: 'Unidade nao encontrada ou fora do condominio desta vaga' },
          { status: 400 }
        );
      }

      const resumoMovimentacoes = await obterResumoMovimentacoesVaga(id);
      if (resumoMovimentacoes.possuiMovimentacaoAtiva) {
        return NextResponse.json(
          {
            error:
              'Nao e possivel alterar a unidade de uma vaga com locacoes ou reservas ativas',
          },
          { status: 400 }
        );
      }

      unidadeIdAtualizada = unidade.id;
    }

    let proprietarioIdAtualizado = vagaExistente.proprietarioId;

    if (validatedData.proprietarioId !== undefined) {
      if (validatedData.proprietarioId === null) {
        proprietarioIdAtualizado = null;
      } else {
        const proprietario = await prisma.usuario.findUnique({
          where: { id: validatedData.proprietarioId },
          include: {
            perfis: {
              where: {
                condominioId: vagaExistente.condominioId,
                tipo: 'morador',
                ativo: true,
              },
            },
          },
        });

        if (!proprietario || proprietario.perfis.length === 0) {
          return NextResponse.json(
            {
              error: 'Proprietario informado nao e um morador ativo deste condominio',
            },
            { status: 400 }
          );
        }

        proprietarioIdAtualizado = validatedData.proprietarioId;
      }
    } else if (unidadeIdAtualizada !== vagaExistente.unidadeId) {
      const unidadeAtualizada = await prisma.unidade.findUnique({
        where: { id: unidadeIdAtualizada },
        select: { usuarioId: true },
      });

      proprietarioIdAtualizado = unidadeAtualizada?.usuarioId ?? null;
    }

    const vagaAtualizada = await prisma.vaga.update({
      where: { id },
      data: {
        numero: validatedData.numero,
        tipo: validatedData.tipo,
        unidadeId: unidadeIdAtualizada,
        proprietarioId: proprietarioIdAtualizado,
      },
      ...vagaArgs,
    });

    if (validatedData.configuracaoLocacao !== undefined) {
      await atualizarConfiguracaoLocacao(vagaAtualizada.id, validatedData.configuracaoLocacao);
    }

    const vagaComRelacionamentos = await buscarVagaOuErro(vagaAtualizada.id);

    return NextResponse.json(formatarVaga(vagaComRelacionamentos));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const vaga = await prisma.vaga.findUnique({
      where: { id },
      select: {
        id: true,
        condominioId: true,
      },
    });

    if (!vaga) {
      return NextResponse.json({ error: 'Vaga nao encontrada' }, { status: 404 });
    }

    const respostaPermissao = validarPermissaoEstrutura(usuario, vaga.condominioId);
    if (respostaPermissao) {
      return respostaPermissao;
    }

    const resumoMovimentacoes = await obterResumoMovimentacoesVaga(id);

    if (resumoMovimentacoes.possuiMovimentacaoAtiva) {
      return NextResponse.json(
        {
          error: 'Nao e possivel excluir esta vaga',
          details:
            'Esta vaga possui locacoes ou reservas em andamento. Finalize ou cancele a movimentacao antes de tentar excluir.',
        },
        { status: 400 }
      );
    }

    if (resumoMovimentacoes.possuiHistorico || resumoMovimentacoes.solicitacoesCadastro > 0) {
      return NextResponse.json(
        {
          error: 'Nao e possivel excluir esta vaga',
          details: `Historico encontrado: ${resumoMovimentacoes.totalLocacoes} locacao(oes), ${resumoMovimentacoes.totalReservas} reserva(s) e ${resumoMovimentacoes.solicitacoesCadastro} solicitacao(oes).`,
        },
        { status: 400 }
      );
    }

    await prisma.vaga.delete({ where: { id } });

    return NextResponse.json(
      { message: 'Vaga excluida com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir vaga:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
