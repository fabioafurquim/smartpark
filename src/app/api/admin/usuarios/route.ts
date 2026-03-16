import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { ehAdministradorMestre } from '../../../../lib/auth';
import { z } from 'zod';
import { hash } from 'bcryptjs';

const filtrosSchema = z.object({
  busca: z.string().optional(),
  tipo: z
    .enum([
      'administrador_mestre',
      'administrador_condominio',
      'sindico',
      'porteiro',
      'morador',
    ])
    .optional(),
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
    if (!session?.user || !(session.user as any).id) {
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

    // Validar parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const filtrosValidados = filtrosSchema.parse({
      busca: searchParams.get('busca') || undefined,
      tipo: searchParams.get('tipo') || undefined,
      ativo: searchParams.get('ativo') || undefined,
      pagina: searchParams.get('pagina') || undefined,
      limite: searchParams.get('limite') || undefined,
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
          tipo: {
            equals: filtrosValidados.tipo,
            mode: 'insensitive',
          },
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

    return NextResponse.json({
      usuarios,
      total,
      pagina: filtrosValidados.pagina,
      limite: filtrosValidados.limite,
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    
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
 * POST /api/admin/usuarios
 * Cria um novo usuário (apenas para administrador mestre)
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
        { erro: 'Acesso negado. Apenas administradores mestres podem criar usuários.' },
        { status: 403 }
      );
    }

    const dados = await request.json();

    // Schema de validação para criação de usuário
    const criarUsuarioSchema = z.object({
      nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
      email: z.string().email('Email inválido'),
      senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
      perfis: z.array(
        z.object({
          condominioId: z.string().min(1, 'ID do condomínio é obrigatório'),
          tipo: z.enum([
            'administrador_mestre',
            'administrador_condominio',
            'sindico',
            'porteiro',
            'morador',
          ]),
          ativo: z.boolean().optional(),
          permissoes: z.record(z.string(), z.boolean()).optional(),
        })
      ).min(1, 'Ao menos um perfil deve ser informado'),
    });

    const dadosValidados = criarUsuarioSchema.parse(dados);

    // Verificar existência dos condomínios informados nos perfis
    const condominioIds = Array.from(new Set(dadosValidados.perfis.map(p => p.condominioId)));
    const condominios = await prisma.condominio.findMany({
      where: { id: { in: condominioIds } },
      select: { id: true }
    });
    const encontrados = new Set(condominios.map(c => c.id));
    const naoEncontrados = condominioIds.filter(id => !encontrados.has(id));
    if (naoEncontrados.length > 0) {
      return NextResponse.json(
        { erro: 'Condomínio(s) inválido(s)', detalhes: naoEncontrados },
        { status: 400 }
      );
    }

    // Hash da senha
    const senhaHash = await hash(dadosValidados.senha, 10);

    // Criar usuário com perfis
    const usuarioCriado = await prisma.usuario.create({
      data: {
        nome: dadosValidados.nome,
        email: dadosValidados.email,
        senha: senhaHash,
        perfis: {
          create: dadosValidados.perfis.map((p) => ({
            condominioId: p.condominioId,
            tipo: p.tipo,
            ativo: p.ativo ?? true,
            permissoes: p.permissoes ? (p.permissoes as any) : undefined,
          })),
        },
      },
      include: {
        perfis: {
          include: {
            condominio: {
              select: { id: true, nome: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      mensagem: 'Usuário criado com sucesso',
      usuario: usuarioCriado,
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    // Tratar erro de email duplicado
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: error.issues },
        { status: 400 }
      );
    }
    if (typeof error === 'object' && error && (error as any).code === 'P2002') {
      return NextResponse.json(
        { erro: 'Email já está em uso' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
