import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions, temPermissao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';
import { UsuarioSessao } from '../../../../types';

// Schema de validação para atualização de vaga
const tipoLocacaoValues = ['HORA', 'DIARIA', 'MENSAL', 'ANUAL'] as const;

const decimalField = z.coerce.number()
  .min(0, 'Valor não pode ser negativo')
  .nullable()
  .optional();

const configuracaoLocacaoSchema = z.object({
  disponivel: z.boolean(),
  tiposPermitidos: z.array(z.enum(tipoLocacaoValues)).default([]),
  valorHora: decimalField,
  valorDiaria: decimalField,
  valorMensal: decimalField,
  valorAnual: decimalField
}).superRefine((data, ctx) => {
  if (data.disponivel && data.tiposPermitidos.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione ao menos um tipo de locação ao disponibilizar a vaga',
      path: ['tiposPermitidos']
    });
  }

  const tipoPorCampo: Record<string, typeof tipoLocacaoValues[number]> = {
    valorHora: 'HORA',
    valorDiaria: 'DIARIA',
    valorMensal: 'MENSAL',
    valorAnual: 'ANUAL'
  };

  (['valorHora', 'valorDiaria', 'valorMensal', 'valorAnual'] as const).forEach((campo) => {
    const valor = data[campo];
    if (valor !== undefined && valor !== null) {
      const tipoNecessario = tipoPorCampo[campo];
      if (!data.tiposPermitidos.includes(tipoNecessario)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Inclua o tipo ${tipoNecessario.toLowerCase()} em tiposPermitidos para definir ${campo}`,
          path: ['tiposPermitidos']
        });
      }
    }
  });
});

const updateVagaSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório').optional(),
  tipo: z.enum(['COBERTA', 'DESCOBERTA', 'DEFICIENTE', 'IDOSO', 'VISITANTE']).optional(),
  observacoes: z.string().optional(),
  proprietarioId: z.string().min(1, 'Proprietário é obrigatório').nullable().optional(),
  configuracaoLocacao: configuracaoLocacaoSchema.optional()
});

type UpdateVagaPayload = z.infer<typeof updateVagaSchema>;
type ConfiguracaoLocacaoPayload = UpdateVagaPayload['configuracaoLocacao'];

const vagaInclude = Prisma.validator<Prisma.VagaInclude>()({
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
      contato: true,
      torre: {
        select: {
          id: true,
          nome: true,
          tipo: true
        }
      }
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
    atualizadoEm: configuracao.atualizadoEm.toISOString()
  };
};

const atualizarConfiguracaoLocacao = async (
  vagaId: string,
  configuracao: ConfiguracaoLocacaoPayload
) => {
  if (configuracao === undefined) {
    return;
  }

  if (configuracao === null) {
    await prisma.configuracaoLocacaoVaga.deleteMany({ where: { vagaId } });
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
      valorAnual: toDecimalOrNull(configuracao.valorAnual)
    },
    update: {
      disponivel: configuracao.disponivel,
      tiposPermitidos: configuracao.tiposPermitidos,
      valorHora: toDecimalOrUndefined(configuracao.valorHora),
      valorDiaria: toDecimalOrUndefined(configuracao.valorDiaria),
      valorMensal: toDecimalOrUndefined(configuracao.valorMensal),
      valorAnual: toDecimalOrUndefined(configuracao.valorAnual)
    }
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
    condominio: vaga.condominio,
    unidade: vaga.unidade,
    proprietario: vaga.proprietario,
    configuracaoLocacao: formatarConfiguracaoLocacao(vaga.configuracaoLocacao),
    criadoEm: vaga.criadoEm.toISOString(),
    atualizadoEm: vaga.atualizadoEm.toISOString()
  };
};

/**
 * GET /api/vagas/[id] - Busca vaga específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const vaga = await prisma.vaga.findUnique({
      where: { id },
      ...vagaArgs
    });

    if (!vaga) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    if (!temPermissao(usuario, 'gerenciarEstrutura', vaga.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condomínio especificado' },
        { status: 403 }
      );
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

/**
 * PUT /api/vagas/[id] - Atualiza vaga
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateVagaSchema.parse(body);

    // Verificar se a vaga existe
    const vagaExistente = await prisma.vaga.findUnique({
      where: { id }
    });

    if (!vagaExistente) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    if (!temPermissao(usuario, 'gerenciarEstrutura', vagaExistente.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condomínio especificado' },
        { status: 403 }
      );
    }

    // Se está alterando o número, verificar duplicatas no mesmo condomínio
    if (validatedData.numero && validatedData.numero !== vagaExistente.numero) {
      const vagaComMesmoNumero = await prisma.vaga.findFirst({
        where: {
          numero: validatedData.numero,
          condominioId: vagaExistente.condominioId,
          id: { not: id }
        }
      });

      if (vagaComMesmoNumero) {
        return NextResponse.json(
          { error: 'Já existe uma vaga com este número neste condomínio' },
          { status: 400 }
        );
      }
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
                ativo: true
              }
            }
          }
        });

        if (!proprietario || proprietario.perfis.length === 0) {
          return NextResponse.json(
            { error: 'Proprietário informado não é um morador ativo deste condomínio' },
            { status: 400 }
          );
        }

        proprietarioIdAtualizado = validatedData.proprietarioId;
      }
    }

    const { configuracaoLocacao, ...dadosVaga } = validatedData;

    const vagaAtualizada = await prisma.vaga.update({
      where: { id },
      data: {
        ...dadosVaga,
        proprietarioId: proprietarioIdAtualizado ?? undefined
      },
      ...vagaArgs
    });

    await atualizarConfiguracaoLocacao(vagaAtualizada.id, configuracaoLocacao);

    const vagaComRelacionamentos = await prisma.vaga.findUnique({
      where: { id: vagaAtualizada.id },
      ...vagaArgs
    });

    return NextResponse.json(formatarVaga(vagaComRelacionamentos));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
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

/**
 * DELETE /api/vagas/[id] - Remove vaga
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const { id } = await params;
    
    // Verificar se a vaga existe
    const vaga = await prisma.vaga.findUnique({
      where: { id }
    });

    if (!vaga) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    if (!temPermissao(usuario, 'gerenciarEstrutura', vaga.condominioId)) {
      return NextResponse.json(
        { error: 'Acesso negado ao condomínio especificado' },
        { status: 403 }
      );
    }

    // Verificar se há reservas ativas para esta vaga
    const reservasAtivas = await prisma.reserva.count({
      where: {
        vagaId: id,
        status: {
          in: ['ativa', 'confirmada', 'ATIVA', 'CONFIRMADA']
        }
      }
    });

    if (reservasAtivas > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível excluir vaga com reservas ativas',
          details: 'Cancele ou finalize as reservas antes de excluir a vaga' 
        },
        { status: 400 }
      );
    }

    await prisma.vaga.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Vaga excluída com sucesso' },
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