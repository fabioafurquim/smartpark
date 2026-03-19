import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ehAdministradorMestre, temPermissao } from '@/lib/auth';
import { UsuarioSessao } from '@/types';

export const TIPOS_PERFIL_USUARIO = [
  'administrador_mestre',
  'administrador_condominio',
  'sindico',
  'porteiro',
  'morador',
] as const;

export type TipoPerfilUsuarioInput = (typeof TIPOS_PERFIL_USUARIO)[number];

export const filtrosAdminUsuariosSchema = z.object({
  busca: z.string().optional(),
  tipo: z.enum(TIPOS_PERFIL_USUARIO).optional(),
  ativo: z.enum(['true', 'false']).optional(),
  condominioId: z.string().optional(),
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(200).default(20),
});

export const perfilUsuarioInputSchema = z.object({
  condominioId: z.string().min(1, 'ID do condominio e obrigatorio'),
  tipo: z.enum(TIPOS_PERFIL_USUARIO),
  ativo: z.boolean().optional(),
  permissoes: z.record(z.string(), z.boolean()).optional(),
  unidadeId: z.string().optional().nullable(),
});

export const criarUsuarioAdminSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email invalido'),
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  perfis: z.array(perfilUsuarioInputSchema).min(1, 'Ao menos um perfil deve ser informado'),
});

export const atualizarUsuarioAdminSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').optional(),
  email: z.string().email('Email invalido').optional(),
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').optional(),
  perfis: z.array(perfilUsuarioInputSchema).min(1).optional(),
});

export function obterCondominiosGerenciaveis(usuario: UsuarioSessao) {
  if (ehAdministradorMestre(usuario)) {
    return null;
  }

  return Array.from(
    new Set(
      usuario.perfis
        .filter((perfil) => temPermissao(usuario, 'gerenciarUsuarios', perfil.condominioId))
        .map((perfil) => perfil.condominioId)
    )
  );
}

export function usuarioPodeGerenciarUsuarios(usuario: UsuarioSessao) {
  if (ehAdministradorMestre(usuario)) {
    return true;
  }

  return usuario.perfis.some((perfil) =>
    temPermissao(usuario, 'gerenciarUsuarios', perfil.condominioId)
  );
}

export function validarEscopoPerfis(
  usuario: UsuarioSessao,
  perfis: Array<z.infer<typeof perfilUsuarioInputSchema>>
) {
  if (ehAdministradorMestre(usuario)) {
    return;
  }

  const condominiosGerenciaveis = obterCondominiosGerenciaveis(usuario) || [];

  for (const perfil of perfis) {
    if (perfil.tipo === 'administrador_mestre') {
      throw new Error('Apenas administradores mestres podem atribuir este perfil');
    }

    if (!condominiosGerenciaveis.includes(perfil.condominioId)) {
      throw new Error('Voce so pode gerenciar usuarios do seu condominio');
    }
  }
}

export function usuarioPodeGerenciarUsuarioAlvo(
  usuario: UsuarioSessao,
  perfisAlvo: Array<{ tipo: string; condominioId: string }>
) {
  if (ehAdministradorMestre(usuario)) {
    return true;
  }

  if (perfisAlvo.some((perfil) => perfil.tipo === 'administrador_mestre')) {
    return false;
  }

  const condominiosGerenciaveis = obterCondominiosGerenciaveis(usuario) || [];

  return perfisAlvo.every((perfil) => condominiosGerenciaveis.includes(perfil.condominioId));
}

export async function validarCondominiosExistentes(
  tx: Prisma.TransactionClient,
  perfis: Array<z.infer<typeof perfilUsuarioInputSchema>>
) {
  const condominioIds = Array.from(new Set(perfis.map((perfil) => perfil.condominioId)));

  const condominios = await tx.condominio.findMany({
    where: {
      id: {
        in: condominioIds,
      },
    },
    select: {
      id: true,
    },
  });

  const idsEncontrados = new Set(condominios.map((condominio) => condominio.id));
  const idsInvalidos = condominioIds.filter((id) => !idsEncontrados.has(id));

  if (idsInvalidos.length > 0) {
    throw new Error('Condominio informado nao foi encontrado');
  }
}

export async function validarUnidadesDosPerfis(
  tx: Prisma.TransactionClient,
  perfis: Array<z.infer<typeof perfilUsuarioInputSchema>>,
  usuarioId?: string
) {
  const perfisMorador = perfis.filter((perfil) => perfil.tipo === 'morador');

  for (const perfil of perfis) {
    if (perfil.tipo !== 'morador' && perfil.unidadeId) {
      throw new Error('Somente perfis de morador podem ser vinculados a uma unidade');
    }
  }

  const chavesPorCondominio = new Set<string>();
  for (const perfil of perfisMorador) {
    if (!perfil.unidadeId) {
      continue;
    }

    const chave = `${perfil.condominioId}:morador`;
    if (chavesPorCondominio.has(chave)) {
      throw new Error('Informe apenas uma unidade por condominio para o perfil de morador');
    }
    chavesPorCondominio.add(chave);

    const unidade = await tx.unidade.findUnique({
      where: {
        id: perfil.unidadeId,
      },
      select: {
        id: true,
        numero: true,
        condominioId: true,
        usuarioId: true,
      },
    });

    if (!unidade || unidade.condominioId !== perfil.condominioId) {
      throw new Error('A unidade informada nao pertence ao condominio selecionado');
    }

    if (unidade.usuarioId && unidade.usuarioId !== usuarioId) {
      throw new Error(`A unidade ${unidade.numero} ja possui um morador responsavel`);
    }
  }
}

async function unidadeTemMovimentacoesAtivas(
  tx: Prisma.TransactionClient,
  unidadeId: string
) {
  const [locacoesAtivas, reservasAtivas] = await Promise.all([
    tx.locacao.count({
      where: {
        vaga: { unidadeId },
        status: { in: ['PENDENTE', 'ATIVA'] },
      },
    }),
    tx.reserva.count({
      where: {
        vaga: { unidadeId },
        status: { in: ['ativa', 'confirmada', 'ATIVA', 'CONFIRMADA'] },
      },
    }),
  ]);

  return locacoesAtivas > 0 || reservasAtivas > 0;
}

export async function sincronizarVinculosUnidadeDoUsuario(
  tx: Prisma.TransactionClient,
  usuarioId: string,
  perfis: Array<z.infer<typeof perfilUsuarioInputSchema>>,
  usuarioSessao: UsuarioSessao
) {
  const condominiosEscopo = ehAdministradorMestre(usuarioSessao)
    ? Array.from(new Set(perfis.map((perfil) => perfil.condominioId)))
    : obterCondominiosGerenciaveis(usuarioSessao) || [];

  if (condominiosEscopo.length === 0) {
    return;
  }

  const unidadesAtuais = await tx.unidade.findMany({
    where: {
      usuarioId,
      condominioId: {
        in: condominiosEscopo,
      },
    },
    select: {
      id: true,
      condominioId: true,
    },
  });

  const unidadeDesejadaPorCondominio = new Map<string, string>();
  for (const perfil of perfis) {
    if (perfil.tipo === 'morador' && perfil.unidadeId) {
      unidadeDesejadaPorCondominio.set(perfil.condominioId, perfil.unidadeId);
    }
  }

  for (const unidadeAtual of unidadesAtuais) {
    const unidadeDesejada = unidadeDesejadaPorCondominio.get(unidadeAtual.condominioId);
    if (unidadeDesejada === unidadeAtual.id) {
      continue;
    }

    if (await unidadeTemMovimentacoesAtivas(tx, unidadeAtual.id)) {
      throw new Error(
        'Nao e possivel alterar o morador responsavel de uma unidade com movimentacoes ativas'
      );
    }

    await tx.unidade.update({
      where: { id: unidadeAtual.id },
      data: { usuarioId: null },
    });

    await tx.vaga.updateMany({
      where: {
        unidadeId: unidadeAtual.id,
        proprietarioId: usuarioId,
      },
      data: {
        proprietarioId: null,
      },
    });
  }

  for (const [condominioId, unidadeId] of unidadeDesejadaPorCondominio.entries()) {
    const unidadeAtual = unidadesAtuais.find((unidade) => unidade.condominioId === condominioId);
    if (unidadeAtual?.id === unidadeId) {
      continue;
    }

    const unidadeDestino = await tx.unidade.findUnique({
      where: { id: unidadeId },
      select: {
        id: true,
        usuarioId: true,
      },
    });

    if (!unidadeDestino) {
      throw new Error('A unidade selecionada nao foi encontrada');
    }

    if (unidadeDestino.usuarioId && unidadeDestino.usuarioId !== usuarioId) {
      throw new Error('A unidade selecionada ja possui um morador responsavel');
    }

    await tx.unidade.update({
      where: { id: unidadeId },
      data: {
        usuarioId,
      },
    });

    await tx.vaga.updateMany({
      where: {
        unidadeId,
      },
      data: {
        proprietarioId: usuarioId,
      },
    });
  }
}

export function usuarioPodeRegistrarEmprestimoParaOutroMorador(
  usuario: UsuarioSessao,
  condominioId: string
) {
  return temPermissao(usuario, 'registrarEmprestimoManual', condominioId);
}
