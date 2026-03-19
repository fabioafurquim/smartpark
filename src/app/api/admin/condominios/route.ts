import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { ehAdministradorMestre } from '../../../../lib/auth';
import { z } from 'zod';
import { criarCondominioSchema, filtrosCondominioSchema } from '../../../../lib/validations/condominio';

// Remover o schema local já que agora usamos o centralizado

/**
 * GET /api/admin/condominios
 * Lista todos os condomínios (apenas para administrador mestre)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem acessar esta funcionalidade.' },
        { status: 403 }
      );
    }

    // Extrair e validar parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const filtrosValidados = filtrosCondominioSchema.parse({
      busca: searchParams.get('busca') || undefined,
      ativo: searchParams.get('ativo') || undefined,
      pagina: searchParams.get('pagina') || undefined,
      limite: searchParams.get('limite') || undefined,
    });

    // Construir filtros para o Prisma
    const where: any = {};

    if (filtrosValidados.busca) {
      where.OR = [
        {
          nome: {
            contains: filtrosValidados.busca,
            mode: 'insensitive',
          },
        },
        {
          endereco: {
            contains: filtrosValidados.busca,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (filtrosValidados.ativo) {
      where.ativo = filtrosValidados.ativo === 'true';
    }

    // Buscar condomínios com estatísticas
    const condominios = await prisma.condominio.findMany({
      where,
      include: {
        _count: {
          select: {
            vagas: true,
            perfisUsuario: {
              where: {
                ativo: true,
              },
            },
          },
        },
        vagas: {
          where: {
            reservas: {
              some: {
                status: 'ATIVA',
              },
            },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
      skip: (filtrosValidados.pagina - 1) * filtrosValidados.limite,
      take: filtrosValidados.limite,
    });

    // Formatar dados para resposta
    const condominiosFormatados = condominios.map((condominio) => ({
      id: condominio.id,
      nome: condominio.nome,
      endereco: condominio.endereco,
      telefone: condominio.telefone,
      email: condominio.email,
      modalidade: condominio.modalidade,
      totalVagas: condominio._count.vagas,
      vagasOcupadas: condominio.vagas.length,
      totalUsuarios: condominio._count.perfisUsuario,
      ativo: condominio.ativo,
      criadoEm: condominio.criadoEm.toISOString(),
    }));

    return NextResponse.json(condominiosFormatados);
  } catch (error) {
    console.error('Erro ao buscar condomínios:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Parâmetros inválidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint POST para criar um novo condomínio
 * Apenas administradores mestres podem criar condomínios
 */

/**
 * POST /api/admin/condominios
 * Cria um novo condomínio (apenas para administrador mestre)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session.user as any)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem criar condomínios.' },
        { status: 403 }
      );
    }

    // Extrair e validar dados do corpo da requisição
    const dados = await request.json();
    const dadosValidados = criarCondominioSchema.parse(dados);

    // Gerar código único para o condomínio
    const codigoUnico = await gerarCodigoUnico();

    // Criar o condomínio no banco de dados
    const novoCondominio = await prisma.condominio.create({
      data: {
        nome: dadosValidados.nome,
        endereco: dadosValidados.endereco,
        telefone: dadosValidados.telefone || null,
        email: dadosValidados.email || null,
        logoUrl: dadosValidados.logoUrl || null,
        codigoUnico,
        modalidade: dadosValidados.modalidade,
        ativo: true
      },
      select: {
        id: true,
        nome: true,
        endereco: true,
        telefone: true,
        email: true,
        modalidade: true,
        codigoUnico: true,
        logoUrl: true,
        ativo: true,
        atualizadoEm: true
      }
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Condomínio criado com sucesso',
      condominio: novoCondominio
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar condomínio:', error);

    // Tratar erros de validação do Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          erro: 'Dados inválidos',
          detalhes: error.issues.map(err => ({
            campo: err.path.join('.'),
            mensagem: err.message
          }))
        },
        { status: 400 }
      );
    }

    // Tratar erro de código único duplicado
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { erro: 'Erro interno: código único duplicado. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Gera um código único para o condomínio
 */
async function gerarCodigoUnico(): Promise<string> {
  let tentativas = 0;
  const maxTentativas = 10;

  while (tentativas < maxTentativas) {
    // Gerar código de 6 caracteres alfanuméricos
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Verificar se já existe
    const existente = await prisma.condominio.findUnique({
      where: { codigoUnico: codigo }
    });

    if (!existente) {
      return codigo;
    }

    tentativas++;
  }

  // Se não conseguir gerar um código único, usar timestamp
  return `COND${Date.now().toString().slice(-6)}`;
}
