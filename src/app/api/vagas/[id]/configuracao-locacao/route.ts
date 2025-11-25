import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { UsuarioSessao } from '@/types';

const configuracaoSchema = z.object({
  disponivel: z.boolean(),
  tiposPermitidos: z.array(z.enum(['HORA', 'DIARIA', 'MENSAL', 'ANUAL'])),
  valorHora: z.number().positive().nullable().optional(),
  valorDiaria: z.number().positive().nullable().optional(),
  valorMensal: z.number().positive().nullable().optional(),
  valorAnual: z.number().positive().nullable().optional(),
});

/**
 * POST /api/vagas/[id]/configuracao-locacao
 * Salva ou atualiza a configuração de locação de uma vaga
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;
    const { id: vagaId } = await params;

    // Buscar vaga
    const vaga = await prisma.vaga.findUnique({
      where: { id: vagaId },
      include: {
        unidade: {
          select: {
            usuarioId: true,
          },
        },
      },
    });

    if (!vaga) {
      return NextResponse.json(
        { erro: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o usuário é o proprietário da unidade
    if (vaga.unidade.usuarioId !== usuario.id) {
      return NextResponse.json(
        { erro: 'Você não tem permissão para configurar esta vaga' },
        { status: 403 }
      );
    }

    const dados = await request.json();
    const dadosValidados = configuracaoSchema.parse(dados);

    // Buscar ou criar configuração de locação
    let configuracao = await prisma.configuracaoLocacaoVaga.findUnique({
      where: { vagaId },
    });

    if (configuracao) {
      // Atualizar
      configuracao = await prisma.configuracaoLocacaoVaga.update({
        where: { vagaId },
        data: {
          disponivel: dadosValidados.disponivel,
          tiposPermitidos: dadosValidados.tiposPermitidos,
          valorHora: dadosValidados.valorHora || null,
          valorDiaria: dadosValidados.valorDiaria || null,
          valorMensal: dadosValidados.valorMensal || null,
          valorAnual: dadosValidados.valorAnual || null,
        },
      });
    } else {
      // Criar
      configuracao = await prisma.configuracaoLocacaoVaga.create({
        data: {
          vagaId,
          disponivel: dadosValidados.disponivel,
          tiposPermitidos: dadosValidados.tiposPermitidos,
          valorHora: dadosValidados.valorHora || null,
          valorDiaria: dadosValidados.valorDiaria || null,
          valorMensal: dadosValidados.valorMensal || null,
          valorAnual: dadosValidados.valorAnual || null,
        },
      });
    }

    return NextResponse.json({
      mensagem: 'Configuração de locação salva com sucesso',
      configuracao: {
        id: configuracao.id,
        disponivel: configuracao.disponivel,
        tiposPermitidos: configuracao.tiposPermitidos,
        valorHora: configuracao.valorHora
          ? parseFloat(configuracao.valorHora.toString())
          : null,
        valorDiaria: configuracao.valorDiaria
          ? parseFloat(configuracao.valorDiaria.toString())
          : null,
        valorMensal: configuracao.valorMensal
          ? parseFloat(configuracao.valorMensal.toString())
          : null,
        valorAnual: configuracao.valorAnual
          ? parseFloat(configuracao.valorAnual.toString())
          : null,
      },
    });
  } catch (error) {
    console.error('Erro ao salvar configuração de locação:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
