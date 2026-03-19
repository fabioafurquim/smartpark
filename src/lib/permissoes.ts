import type { TipoPerfilUsuario } from '@/types';

export type PermissaoSistema =
  | 'visualizarPerfil'
  | 'gerenciarUsuarios'
  | 'gerenciarEstrutura'
  | 'vincularMoradorUnidade'
  | 'vincularVagaUnidade'
  | 'configurarVagasLocacao'
  | 'aprovarSolicitacoes'
  | 'gerenciarReservas'
  | 'registrarEmprestimoManual'
  | 'monitorarLocacoes'
  | 'registrarEventosPortaria'
  | 'visualizarRelatorios'
  | 'configurarSistema'
  | 'gerenciarCondominios'
  | 'gerenciarPermissoesPerfis';

export interface PermissaoDefinicao {
  chave: PermissaoSistema;
  grupo: 'acesso' | 'pessoas' | 'estrutura' | 'operacao' | 'analise' | 'administracao';
  titulo: string;
  descricao: string;
  personalizavel: boolean;
}

export type MapaPermissoes = Record<PermissaoSistema, boolean>;

export const PERFIS_PERSONALIZAVEIS: TipoPerfilUsuario[] = [
  'administrador_condominio',
  'sindico',
  'porteiro',
  'morador',
];

export const PERFIL_LABELS: Record<TipoPerfilUsuario, string> = {
  administrador_mestre: 'Administrador mestre',
  administrador_condominio: 'Administrador do condominio',
  sindico: 'Sindico',
  porteiro: 'Porteiro',
  morador: 'Morador',
};

export const PERMISSOES_CATALOGO: PermissaoDefinicao[] = [
  {
    chave: 'visualizarPerfil',
    grupo: 'acesso',
    titulo: 'Acessar o proprio perfil',
    descricao: 'Permite entrar no sistema e consultar os dados pessoais da conta.',
    personalizavel: false,
  },
  {
    chave: 'gerenciarUsuarios',
    grupo: 'pessoas',
    titulo: 'Gerenciar usuarios',
    descricao: 'Criar, editar, ativar, inativar e excluir usuarios do condominio.',
    personalizavel: true,
  },
  {
    chave: 'aprovarSolicitacoes',
    grupo: 'pessoas',
    titulo: 'Aprovar solicitacoes de cadastro',
    descricao: 'Analisar e liberar o vinculo de moradores com unidades.',
    personalizavel: true,
  },
  {
    chave: 'gerenciarEstrutura',
    grupo: 'estrutura',
    titulo: 'Gerenciar estrutura completa',
    descricao: 'Criar, editar e excluir torres, unidades e vagas do condominio.',
    personalizavel: true,
  },
  {
    chave: 'vincularMoradorUnidade',
    grupo: 'estrutura',
    titulo: 'Vincular morador a unidade',
    descricao: 'Associar ou transferir o morador responsavel por uma unidade.',
    personalizavel: true,
  },
  {
    chave: 'vincularVagaUnidade',
    grupo: 'estrutura',
    titulo: 'Vincular vaga a unidade',
    descricao: 'Associar ou transferir uma vaga entre unidades do mesmo condominio.',
    personalizavel: true,
  },
  {
    chave: 'configurarVagasLocacao',
    grupo: 'estrutura',
    titulo: 'Publicar vaga para emprestimo',
    descricao: 'Definir disponibilidade e modalidades de uso das vagas publicadas.',
    personalizavel: true,
  },
  {
    chave: 'gerenciarReservas',
    grupo: 'operacao',
    titulo: 'Solicitar e acompanhar emprestimos',
    descricao: 'Usar as telas de locacao e acompanhar os proprios emprestimos.',
    personalizavel: true,
  },
  {
    chave: 'registrarEmprestimoManual',
    grupo: 'operacao',
    titulo: 'Registrar emprestimo manual',
    descricao: 'Criar um emprestimo para outro morador a partir do painel operacional.',
    personalizavel: true,
  },
  {
    chave: 'monitorarLocacoes',
    grupo: 'operacao',
    titulo: 'Monitorar emprestimos e veiculos',
    descricao: 'Consultar o painel operacional com vagas, placas, periodos e historico.',
    personalizavel: true,
  },
  {
    chave: 'registrarEventosPortaria',
    grupo: 'operacao',
    titulo: 'Registrar eventos de portaria',
    descricao: 'Lancar entrada, saida e observacoes operacionais nas locacoes.',
    personalizavel: true,
  },
  {
    chave: 'visualizarRelatorios',
    grupo: 'analise',
    titulo: 'Visualizar indicadores',
    descricao: 'Consultar metricas e indicadores operacionais do condominio.',
    personalizavel: true,
  },
  {
    chave: 'configurarSistema',
    grupo: 'administracao',
    titulo: 'Configurar operacao local',
    descricao: 'Acessar ajustes locais do condominio e configuracoes administrativas.',
    personalizavel: true,
  },
  {
    chave: 'gerenciarCondominios',
    grupo: 'administracao',
    titulo: 'Gerenciar condominios',
    descricao: 'Criar e administrar condominios no escopo global do sistema.',
    personalizavel: false,
  },
  {
    chave: 'gerenciarPermissoesPerfis',
    grupo: 'administracao',
    titulo: 'Personalizar perfis',
    descricao: 'Editar a matriz de permissoes por perfil em cada condominio.',
    personalizavel: false,
  },
];

export const TODAS_PERMISSOES = PERMISSOES_CATALOGO.map((item) => item.chave);

const mapaBasePermissoes = TODAS_PERMISSOES.reduce((acc, permissao) => {
  acc[permissao] = false;
  return acc;
}, {} as MapaPermissoes);

export const PERMISSOES_PADRAO_POR_PERFIL: Record<TipoPerfilUsuario, MapaPermissoes> = {
  administrador_mestre: {
    ...mapaBasePermissoes,
    visualizarPerfil: true,
    gerenciarUsuarios: true,
    gerenciarEstrutura: true,
    vincularMoradorUnidade: true,
    vincularVagaUnidade: true,
    configurarVagasLocacao: true,
    aprovarSolicitacoes: true,
    gerenciarReservas: true,
    registrarEmprestimoManual: true,
    monitorarLocacoes: true,
    registrarEventosPortaria: true,
    visualizarRelatorios: true,
    configurarSistema: true,
    gerenciarCondominios: true,
    gerenciarPermissoesPerfis: true,
  },
  administrador_condominio: {
    ...mapaBasePermissoes,
    visualizarPerfil: true,
    gerenciarUsuarios: true,
    gerenciarEstrutura: true,
    vincularMoradorUnidade: true,
    vincularVagaUnidade: true,
    configurarVagasLocacao: true,
    aprovarSolicitacoes: true,
    gerenciarReservas: true,
    registrarEmprestimoManual: true,
    monitorarLocacoes: true,
    registrarEventosPortaria: true,
    visualizarRelatorios: true,
    configurarSistema: true,
  },
  sindico: {
    ...mapaBasePermissoes,
    visualizarPerfil: true,
    gerenciarUsuarios: true,
    gerenciarEstrutura: true,
    vincularMoradorUnidade: true,
    vincularVagaUnidade: true,
    configurarVagasLocacao: true,
    aprovarSolicitacoes: true,
    gerenciarReservas: true,
    registrarEmprestimoManual: true,
    monitorarLocacoes: true,
    registrarEventosPortaria: true,
    visualizarRelatorios: true,
    configurarSistema: true,
  },
  porteiro: {
    ...mapaBasePermissoes,
    visualizarPerfil: true,
    monitorarLocacoes: true,
    registrarEventosPortaria: true,
  },
  morador: {
    ...mapaBasePermissoes,
    visualizarPerfil: true,
    gerenciarReservas: true,
    configurarVagasLocacao: true,
  },
};

export function normalizarMapaPermissoes(
  permissoes?: Partial<Record<PermissaoSistema, boolean>> | null
): MapaPermissoes {
  const mapa = { ...mapaBasePermissoes };

  if (!permissoes) {
    return mapa;
  }

  for (const chave of TODAS_PERMISSOES) {
    if (typeof permissoes[chave] === 'boolean') {
      mapa[chave] = !!permissoes[chave];
    }
  }

  return mapa;
}

export function obterPermissoesPadraoPerfil(tipo: TipoPerfilUsuario): MapaPermissoes {
  return { ...PERMISSOES_PADRAO_POR_PERFIL[tipo] };
}

export function combinarPermissoesPerfil(
  tipo: TipoPerfilUsuario,
  configuracaoCondominio?: Partial<Record<PermissaoSistema, boolean>> | null,
  overridePerfil?: Partial<Record<PermissaoSistema, boolean>> | null
): MapaPermissoes {
  const base = obterPermissoesPadraoPerfil(tipo);
  const configuradas = normalizarMapaPermissoes(configuracaoCondominio);
  const override = normalizarMapaPermissoes(overridePerfil);

  const resultado = { ...base };

  for (const chave of TODAS_PERMISSOES) {
    if (typeof configuracaoCondominio?.[chave] === 'boolean') {
      resultado[chave] = configuradas[chave];
    }

    if (typeof overridePerfil?.[chave] === 'boolean') {
      resultado[chave] = override[chave];
    }
  }

  return resultado;
}

export function obterDefinicaoPermissao(permissao: PermissaoSistema) {
  return PERMISSOES_CATALOGO.find((item) => item.chave === permissao);
}
