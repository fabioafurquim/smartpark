import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsuarioSessao } from '@/types';

/**
 * GET /api/minhas-vagas
 * Retorna as vagas da unidade associada ao usuário logado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;

    // Buscar unidade associada ao usuário
    const unidade = await prisma.unidade.findFirst({
      where: {
        usuarioId: usuario.id,
      },
      include: {
        vagas: {
          include: {
            configuracaoLocacao: true,
          },
          orderBy: {
            numero: 'asc',
          },
        },
      },
    });

    if (!unidade) {
      return NextResponse.json(
        { erro: 'Nenhuma unidade associada ao seu usuário' },
        { status: 404 }
      );
    }

    // Formatar vagas
    const vagasFormatadas = unidade.vagas.map((vaga) => ({
      id: vaga.id,
      numero: vaga.numero,
      tipo: vaga.tipo,
      unidadeId: vaga.unidadeId,
      condominioId: vaga.condominioId,
      proprietarioId: vaga.proprietarioId,
      configuracaoLocacao: vaga.configuracaoLocacao
        ? {
            id: vaga.configuracaoLocacao.id,
            disponivel: vaga.configuracaoLocacao.disponivel,
            tiposPermitidos: vaga.configuracaoLocacao.tiposPermitidos,
            valorHora: vaga.configuracaoLocacao.valorHora
              ? parseFloat(vaga.configuracaoLocacao.valorHora.toString())
              : undefined,
            valorDiaria: vaga.configuracaoLocacao.valorDiaria
              ? parseFloat(vaga.configuracaoLocacao.valorDiaria.toString())
              : undefined,
            valorMensal: vaga.configuracaoLocacao.valorMensal
              ? parseFloat(vaga.configuracaoLocacao.valorMensal.toString())
              : undefined,
            valorAnual: vaga.configuracaoLocacao.valorAnual
              ? parseFloat(vaga.configuracaoLocacao.valorAnual.toString())
              : undefined,
          }
        : undefined,
    }));

    return NextResponse.json({
      id: unidade.id,
      numero: unidade.numero,
      andar: unidade.andar,
      tipo: unidade.tipo,
      vagas: vagasFormatadas,
    });
  } catch (error) {
    console.error('Erro ao buscar minhas vagas:', error);
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
