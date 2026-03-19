import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  criarUsuarioAdminSchema,
  filtrosAdminUsuariosSchema,
  obterCondominiosGerenciaveis,
  sincronizarVinculosUnidadeDoUsuario,
  usuarioPodeGerenciarUsuarios,
  validarCondominiosExistentes,
  validarEscopoPerfis,
  validarUnidadesDosPerfis,
} from '@/lib/usuarios-admin';
import { UsuarioSessao } from '@/types';
import { ehAdministradorMestre } from '@/lib/auth';
import { z } from 'zod';

function construirWhereUsuarios(
  usuario: UsuarioSessao,
  filtros: z.infer<typeof filtrosAdminUsuariosSchema>
): Prisma.UsuarioWhereInput {
  const where: Prisma.UsuarioWhereInput = {};
  const condominiosGerenciaveis = obterCondominiosGerenciaveis(usuario);

  const and: Prisma.UsuarioWhereInput[] = [];

  if (filtros.busca) {
    and.push({
      OR: [
        { nome: { contains: filtros.busca, mode: 'insensitive' } },
        { email: { contains: filtros.busca, mode: 'insensitive' } },
      ],
    });
  }

  const perfisWhere: Prisma.PerfilUsuarioWhereInput = {};

  if (!ehAdministradorMestre(usuario)) {
    perfisWhere.condominioId = { in: condominiosGerenciaveis || [] };
  }

  if (filtros.condominioId) {
    perfisWhere.condominioId = filtros.condominioId;
  }

  if (filtros.tipo) {
    perfisWhere.tipo = filtros.tipo;
  }

  if (filtros.ativo !== undefined) {
    perfisWhere.ativo = filtros.ativo === 'true';
  }

  if (Object.keys(perfisWhere).length > 0) {
    and.push({
      perfis: {
        some: perfisWhere,
      },
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

function construirIncludeUsuarios(usuario: UsuarioSessao) {
  const condominiosGerenciaveis = obterCondominiosGerenciaveis(usuario);
  const filtroEscopo = ehAdministradorMestre(usuario)
    ? undefined
    : {
        condominioId: {
          in: condominiosGerenciaveis || [],
        },
      };

  return {
    perfis: {
      where: filtroEscopo,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    },
    unidades: {
      where: filtroEscopo,
      select: {
        id: true,
        numero: true,
        condominioId: true,
        torre: {
          select: {
            id: true,
            nome: true,
          },
        },
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: [{ condominio: { nome: 'asc' } }, { numero: 'asc' }],
    },
  } satisfies Prisma.UsuarioInclude;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;

    if (!usuarioPodeGerenciarUsuarios(usuario)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Voce nao pode gerenciar usuarios.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filtros = filtrosAdminUsuariosSchema.parse({
      busca: searchParams.get('busca') || undefined,
      tipo: searchParams.get('tipo') || undefined,
      ativo: searchParams.get('ativo') || undefined,
      condominioId: searchParams.get('condominioId') || undefined,
      pagina: searchParams.get('pagina') || undefined,
      limite: searchParams.get('limite') || undefined,
    });

    const condominiosGerenciaveis = obterCondominiosGerenciaveis(usuario);
    if (
      filtros.condominioId &&
      !ehAdministradorMestre(usuario) &&
      !condominiosGerenciaveis?.includes(filtros.condominioId)
    ) {
      return NextResponse.json(
        { erro: 'Voce nao pode consultar usuarios deste condominio' },
        { status: 403 }
      );
    }

    const where = construirWhereUsuarios(usuario, filtros);
    const include = construirIncludeUsuarios(usuario);

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        include,
        orderBy: {
          nome: 'asc',
        },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
      }),
      prisma.usuario.count({ where }),
    ]);

    return NextResponse.json({
      usuarios,
      total,
      pagina: filtros.pagina,
      limite: filtros.limite,
    });
  } catch (error) {
    console.error('Erro ao buscar usuarios:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Parametros invalidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as { id?: string }).id) {
      return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;

    if (!usuarioPodeGerenciarUsuarios(usuario)) {
      return NextResponse.json(
        { erro: 'Acesso negado. Voce nao pode criar usuarios.' },
        { status: 403 }
      );
    }

    const dados = criarUsuarioAdminSchema.parse(await request.json());
    validarEscopoPerfis(usuario, dados.perfis);

    const usuarioCriado = await prisma.$transaction(async (tx) => {
      await validarCondominiosExistentes(tx, dados.perfis);
      await validarUnidadesDosPerfis(tx, dados.perfis);

      const senhaHash = await hash(dados.senha, 10);

      const novoUsuario = await tx.usuario.create({
        data: {
          nome: dados.nome,
          email: dados.email,
          senha: senhaHash,
          perfis: {
            create: dados.perfis.map((perfil) => ({
              condominioId: perfil.condominioId,
              tipo: perfil.tipo,
              ativo: perfil.ativo ?? true,
              permissoes: perfil.permissoes ? (perfil.permissoes as Prisma.InputJsonValue) : undefined,
            })),
          },
        },
      });

      await sincronizarVinculosUnidadeDoUsuario(tx, novoUsuario.id, dados.perfis, usuario);

      return tx.usuario.findUniqueOrThrow({
        where: { id: novoUsuario.id },
        include: construirIncludeUsuarios(usuario),
      });
    });

    return NextResponse.json(
      {
        mensagem: 'Usuario criado com sucesso',
        usuario: usuarioCriado,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar usuario:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && !('code' in error)) {
      return NextResponse.json({ erro: error.message }, { status: 400 });
    }

    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ erro: 'Email ja esta em uso' }, { status: 409 });
    }

    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}
