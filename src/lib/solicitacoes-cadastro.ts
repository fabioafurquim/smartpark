import { UsuarioSessao } from '@/types';
import { ehAdministradorMestre, temPermissao } from '@/lib/auth';

export function podeGerenciarSolicitacoes(usuario: UsuarioSessao): boolean {
  return ehAdministradorMestre(usuario) || temPermissao(usuario, 'aprovarSolicitacoes');
}

export function obterCondominiosGerenciados(usuario: UsuarioSessao): string[] | null {
  if (ehAdministradorMestre(usuario)) {
    return null;
  }

  const condominios = usuario.perfis
    .filter(
      (perfil) =>
        perfil.tipo === 'administrador_condominio' || perfil.tipo === 'sindico'
    )
    .map((perfil) => perfil.condominioId);

  return Array.from(new Set(condominios));
}
