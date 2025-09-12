import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ehAdministradorMestre } from '@/lib/auth';
import { z } from 'zod';

const filtrosSchema = z.object({
  busca: z.string().optional(),
  tipo: z.enum(['ADMINISTRADOR_MESTRE', 'ADMINISTRADOR_CONDOMINIO', 'SINDICO', 'MORADOR']).optional(),
  ativo: z.enum(['true', 'false']).optional(),
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(20),
});

/**
 * GET /api/admin/usuarios
 * Lista todos os usuários do sistema (apenas para administrador mestre)
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

    // Validar parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const filtrosValidados = filtrosSchema.parse({
      busca: searchParams.get('busca'),
      tipo: searchParams.get('tipo'),
      ativo: searchParams.get('ativo'),
      pagina: searchParams.get('pagina'),
      limite: searchParams.get('limite'),
    });

    // Construir filtros para o Prisma
    const where: any = {};
    
    if (filtrosValidados.busca) {
      where.OR = [
        { nome: { contains: filtrosValidados.busca, mode: 'insensitive' } },
        { email: { contains: filtrosValidados.busca, mode: 'insensitive' } },
      ];
    }

    // Filtro por tipo de perfil
    if (filtrosValidados.tipo) {
      where.perfis = {
        some: {
          tipo: filtrosValidados.tipo,
        },
      };
    }

    // Filtro por status ativo
    if (filtrosValidados.ativo !== undefined) {
      const ativo = filtrosValidados.ativo === 'true';
      where.perfis = {
        ...where.perfis,
        some: {
          ...where.perfis?.some,
          ativo,
        },
      };
    }

    // Buscar usuários com paginação
    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        include: {
          perfis: {
            include: {
              condominio: {
                select: {
                  id: true,
                  nome: true,
                },
              },
            },
          },
        },
        orderBy: {
          nome: 'asc',
        },
        skip: (filtrosValidados.pagina - 1) * filtrosValidados.limite,
        take: filtrosValidados.limite,
      }),
      prisma.usuario.count({ where }),
    ]);

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    
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
 * POST /api/admin/usuarios
 * Cria um novo usuário (apenas para administrador mestre)
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
        { erro: 'Acesso negado. Apenas administradores mestres podem criar usuários.' },
        { status: 403 }
      );
    }

    const dados = await request.json();
    
    // Validar dados de entrada (implementar schema de validação)
    // TODO: Implementar criação de usuário
    
    return NextResponse.json(
      { erro: 'Funcionalidade não implementada ainda' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}