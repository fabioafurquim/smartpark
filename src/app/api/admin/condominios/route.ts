import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ehAdministradorMestre } from '@/lib/auth';
import { z } from 'zod';

const filtrosSchema = z.object({
  busca: z.string().optional(),
  ativo: z.enum(['true', 'false']).optional(),
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(10),
});

/**
 * GET /api/admin/condominios
 * Lista todos os condomínios (apenas para administrador mestre)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem acessar esta funcionalidade.' },
        { status: 403 }
      );
    }

    // Extrair e validar parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const filtrosValidados = filtrosSchema.parse({
      busca: searchParams.get('busca'),
      ativo: searchParams.get('ativo'),
      pagina: searchParams.get('pagina'),
      limite: searchParams.get('limite'),
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
            ocupada: true,
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
        { erro: 'Parâmetros inválidos', detalhes: error.errors },
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
 * POST /api/admin/condominios
 * Cria um novo condomínio (apenas para administrador mestre)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { erro: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!ehAdministradorMestre(session)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas administradores mestres podem criar condomínios.' },
        { status: 403 }
      );
    }

    // TODO: Implementar criação de condomínio
    return NextResponse.json(
      { erro: 'Funcionalidade não implementada' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Erro ao criar condomínio:', error);
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}