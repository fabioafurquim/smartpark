import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import {
  PERMISSOES_CATALOGO,
  PERFIS_PERSONALIZAVEIS,
  PERFIL_LABELS,
  combinarPermissoesPerfil,
  obterPermissoesPadraoPerfil,
  type PermissaoSistema,
} from './permissoes';

export async function listarConfiguracoesPermissaoCondominio(condominioId: string) {
  const condominio = await prisma.condominio.findUnique({
    where: { id: condominioId },
    select: {
      id: true,
      nome: true,
      modalidade: true,
      configuracoesPermissaoPerfil: {
        select: {
          id: true,
          tipoPerfil: true,
          permissoes: true,
        },
      },
    },
  });

  if (!condominio) {
    return null;
  }

  return {
    condominio: {
      id: condominio.id,
      nome: condominio.nome,
      modalidade: condominio.modalidade,
    },
    perfis: PERFIS_PERSONALIZAVEIS.map((tipoPerfil) => {
      const configuracao = condominio.configuracoesPermissaoPerfil.find(
        (item) => item.tipoPerfil === tipoPerfil
      );
      const permissoesSalvas =
        (configuracao?.permissoes as Partial<Record<PermissaoSistema, boolean>> | null) ?? null;

      return {
        tipoPerfil,
        rotulo: PERFIL_LABELS[tipoPerfil],
        configuracaoId: configuracao?.id || null,
        permissoesPadrao: obterPermissoesPadraoPerfil(tipoPerfil),
        permissoesCustomizadas: permissoesSalvas,
        permissoesEfetivas: combinarPermissoesPerfil(tipoPerfil, permissoesSalvas, null),
      };
    }),
    catalogo: PERMISSOES_CATALOGO.filter((permissao) => permissao.personalizavel),
  };
}

export async function salvarConfiguracaoPermissaoPerfil(params: {
  condominioId: string;
  tipoPerfil: string;
  permissoes: Partial<Record<PermissaoSistema, boolean>>;
}) {
  const { condominioId, tipoPerfil, permissoes } = params;

  return prisma.configuracaoPermissaoPerfil.upsert({
    where: {
      condominioId_tipoPerfil: {
        condominioId,
        tipoPerfil,
      },
    },
    create: {
      condominioId,
      tipoPerfil,
      permissoes: permissoes as Prisma.InputJsonValue,
    },
    update: {
      permissoes: permissoes as Prisma.InputJsonValue,
    },
  });
}

export async function resetarConfiguracaoPermissaoPerfil(
  condominioId: string,
  tipoPerfil: string
) {
  return prisma.configuracaoPermissaoPerfil.deleteMany({
    where: {
      condominioId,
      tipoPerfil,
    },
  });
}
