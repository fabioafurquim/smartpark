import { UsuarioSessao } from '@/types';
import {
  ehAdministradorCondominio,
  ehAdministradorMestre,
  ehSindico,
} from '@/lib/auth';

export interface ReservaAccessScope {
  isAdminMestre: boolean;
  managedCondominioIds: string[];
  memberCondominioIds: string[];
  ownOnlyCondominioIds: string[];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function getReservaAccessScope(usuario: UsuarioSessao): ReservaAccessScope {
  const memberCondominioIds = unique(
    usuario.perfis.map((perfil) => perfil.condominioId)
  );

  const managedCondominioIds = unique(
    memberCondominioIds.filter(
      (condominioId) =>
        ehAdministradorCondominio(usuario, condominioId) ||
        ehSindico(usuario, condominioId)
    )
  );

  return {
    isAdminMestre: ehAdministradorMestre(usuario),
    managedCondominioIds,
    memberCondominioIds,
    ownOnlyCondominioIds: memberCondominioIds.filter(
      (condominioId) => !managedCondominioIds.includes(condominioId)
    ),
  };
}

export function canAccessCondominio(
  scope: ReservaAccessScope,
  condominioId: string
) {
  return scope.isAdminMestre || scope.memberCondominioIds.includes(condominioId);
}

export function canManageCondominio(
  scope: ReservaAccessScope,
  condominioId: string
) {
  return scope.isAdminMestre || scope.managedCondominioIds.includes(condominioId);
}

export function buildReservaScopeWhere(
  scope: ReservaAccessScope,
  usuarioId: string,
  baseWhere: Record<string, unknown> = {},
  condominioId?: string
) {
  if (scope.isAdminMestre) {
    return baseWhere;
  }

  const scopeConditions: Array<Record<string, unknown>> = [];

  if (condominioId) {
    if (canManageCondominio(scope, condominioId)) {
      scopeConditions.push({});
    } else {
      scopeConditions.push({ usuarioId });
    }
  } else {
    if (scope.managedCondominioIds.length > 0) {
      scopeConditions.push({
        condominioId: { in: scope.managedCondominioIds },
      });
    }

    if (scope.ownOnlyCondominioIds.length > 0) {
      scopeConditions.push({
        condominioId: { in: scope.ownOnlyCondominioIds },
        usuarioId,
      });
    }
  }

  if (scopeConditions.length === 0) {
    return {
      AND: [baseWhere, { usuarioId }],
    };
  }

  return {
    AND: [baseWhere, { OR: scopeConditions }],
  };
}
