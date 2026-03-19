import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { criarCondominioSchema } from '../../../lib/validations/condominio';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';
import { UsuarioSessao } from '../../../types';
import { ehAdministradorMestre, obterCondominiosUsuario } from '../../../lib/auth';
import { gerarCodigoCondominioUnico } from '../../../lib/condominio-codigo.server';

// GET /api/condominios - Listar condomínios
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || !token.perfis) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario: UsuarioSessao = {
      id: token.sub!,
      nome: token.name || '',
      email: token.email || '',
      perfis: token.perfis as any[]
    };

    // Obter condomínios permitidos para o usuário
    let condominiosPermitidos: string[] = [];
    if (ehAdministradorMestre(usuario)) {
      // Admin mestre pode ver todos os condomínios
      condominiosPermitidos = [];
    } else {
      // Usuário comum só vê seus condomínios
      const condominiosUsuario = obterCondominiosUsuario(usuario);
      condominiosPermitidos =
        condominiosUsuario === 'TODOS_CONDOMINIOS'
          ? []
          : condominiosUsuario.map((condominio) => condominio.id);
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const ativo = searchParams.get('ativo');

    const skip = (page - 1) * limit;

    // Construir filtros com base nos condomínios permitidos
    const where: any = {};
    
    // Se não é admin mestre, filtrar por condomínios permitidos
    if (condominiosPermitidos.length > 0) {
      where.id = {
        in: condominiosPermitidos
      };
    }
    
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { endereco: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (ativo !== null && ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    // Buscar condomínios com paginação
    const [condominios, total] = await Promise.all([
      prisma.condominio.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
        include: {
          _count: {
            select: {
              torres: true,
              perfisUsuario: true,
            }
          }
        }
      }),
      prisma.condominio.count({ where }),
    ]);

    return NextResponse.json({
      condominios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar condomínios:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/condominios - Criar condomínio
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || !token.perfis) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario: UsuarioSessao = {
      id: token.sub!,
      nome: token.name || '',
      email: token.email || '',
      perfis: token.perfis as any[]
    };

    // Verificar se é admin mestre (só admin mestre pode criar condomínios)
    if (!ehAdministradorMestre(usuario)) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores mestres podem criar condomínios.' },
        { status: 403 }
      );
    }
    try {
      const body = await request.json();
      
      // Validar dados de entrada
      const validatedData = criarCondominioSchema.parse(body);

      // Verificar se já existe um condomínio com o mesmo nome
      const condominioExistente = await prisma.condominio.findFirst({
        where: {
          nome: {
            equals: validatedData.nome,
            mode: 'insensitive'
          }
        }
      });

      if (condominioExistente) {
        return NextResponse.json(
          { error: 'Já existe um condomínio com este nome' },
          { status: 400 }
        );
      }

      // Gerar código único para o condomínio
      const codigoUnico = await gerarCodigoCondominioUnico();

      // Criar condomínio
      const novoCondominio = await prisma.condominio.create({
        data: {
          nome: validatedData.nome,
          endereco: validatedData.endereco,
          telefone: validatedData.telefone,
          email: validatedData.email,
          codigoUnico,
          modalidade: validatedData.modalidade,
          ativo: true,
        },
        include: {
          _count: {
            select: {
              torres: true,
              perfisUsuario: true,
            }
          }
        }
      });

      return NextResponse.json(novoCondominio, { status: 201 });
    } catch (error) {
      console.error('Erro ao criar condomínio:', error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
          error: 'Dados inválidos',
          details: error.issues
        },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  } catch (authError) {
    console.error('Erro de autenticação:', authError);
    return NextResponse.json(
      { error: 'Erro de autenticação' },
      { status: 401 }
    );
  }
}
