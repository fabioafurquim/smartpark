// Tipos principais do sistema SmartPark

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  perfis?: PerfilUsuario[];
}

export interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  telefone?: string;
  email?: string;
  codigoUnico: string;
  logoUrl?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  torres?: Torre[];
}

export interface Torre {
  id: string;
  nome: string;
  descricao?: string;
  condominioId: string;
  criadoEm: Date;
  atualizadoEm: Date;
  condominio?: Condominio;
  unidades?: Unidade[];
}

export interface Unidade {
  id: string;
  numero: string;
  andar?: string;
  torreId: string;
  criadoEm: Date;
  atualizadoEm: Date;
  torre?: Torre;
  vagas?: Vaga[];
}

export interface Vaga {
  id: string;
  numero: string;
  tipo: 'comum' | 'deficiente' | 'idoso';
  unidadeId: string;
  proprietarioId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  unidade?: Unidade;
  proprietario?: Usuario;
}

export interface PerfilUsuario {
  id: string;
  usuarioId: string;
  condominioId: string;
  tipo: TipoPerfilUsuario;
  permissoes?: Record<string, boolean>;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  usuario?: Usuario;
  condominio?: Condominio;
}

export interface SolicitacaoCadastro {
  id: string;
  usuarioId: string;
  condominioId: string;
  unidadeId?: string;
  vagaId?: string;
  status: StatusSolicitacao;
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  usuario?: Usuario;
  condominio?: Condominio;
  unidade?: Unidade;
  vaga?: Vaga;
}

export interface ConfiguracaoSistema {
  id: string;
  administradorMestreConfigurado: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Enums e tipos auxiliares
export type TipoPerfilUsuario = 
  | 'administrador_mestre'
  | 'administrador_condominio'
  | 'sindico'
  | 'morador';

export type StatusSolicitacao = 
  | 'pendente'
  | 'aprovado'
  | 'rejeitado';

export type TipoVaga = 
  | 'comum'
  | 'deficiente'
  | 'idoso';

// Tipos para formulários
export interface FormularioUsuario {
  nome: string;
  email: string;
  senha?: string;
}

export interface ConfiguracaoInicialForm {
  nomeEmpresa: string;
  emailContato: string;
  telefoneContato?: string;
  nomeAdmin: string;
  emailAdmin: string;
  senhaAdmin: string;
  confirmarSenhaAdmin: string;
}

export interface FormularioCondominio {
  nome: string;
  endereco: string;
  telefone?: string;
  email?: string;
  logoUrl?: string;
}

export interface FormularioTorre {
  nome: string;
  descricao?: string;
  condominioId: string;
}

export interface FormularioUnidade {
  numero: string;
  andar?: string;
  torreId: string;
}

export interface FormularioVaga {
  numero: string;
  tipo: TipoVaga;
  unidadeId: string;
}

export interface FormularioSolicitacaoCadastro {
  codigoCondominio: string;
  unidadeId: string;
  vagaId?: string;
}

// Tipos para API responses
export interface ApiResponse<T = unknown> {
  sucesso: boolean;
  dados?: T;
  mensagem?: string;
  erro?: string;
}

export interface PaginacaoResponse<T> {
  dados: T[];
  total: number;
  pagina: number;
  totalPaginas: number;
  itensPorPagina: number;
}

// Tipos para autenticação (NextAuth)
export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  perfis: {
    id: string;
    tipo: TipoPerfilUsuario;
    condominioId: string;
    condominio: {
      id: string;
      nome: string;
      codigoUnico: string;
    };
  }[];
}

// Tipos para notificações
export interface NotificacaoEmail {
  para: string;
  assunto: string;
  conteudo: string;
  template?: string;
  dados?: Record<string, unknown>;
}

// Tipos para dashboard
export interface EstatisticasDashboard {
  totalCondominios: number;
  totalUsuarios?: number;
  usuariosAtivos: number;
  totalVagas: number;
  vagasOcupadas: number;
  vagasDisponiveis: number;
  ocupacaoAtual: number;
  solicitacoesPendentes: number;
  alertasAtivos: number;
  manutencoesProgramadas: number;
}

// Tipos para permissões
export interface Permissoes {
  gerenciarCondominios: boolean;
  gerenciarUsuarios: boolean;
  gerenciarEstrutura: boolean;
  aprovarSolicitacoes: boolean;
  visualizarRelatorios: boolean;
  configurarSistema: boolean;
}

// Tipos para filtros e busca
export interface FiltrosBusca {
  termo?: string;
  status?: string;
  tipo?: string;
  condominioId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  pagina?: number;
  itensPorPagina?: number;
}

// Tipos para componentes
export interface OpcaoSelect {
  valor: string;
  rotulo: string;
  desabilitado?: boolean;
}

export interface ItemMenu {
  id: string;
  rotulo: string;
  icone: string;
  href: string;
  permissaoNecessaria?: keyof Permissoes;
  subItens?: ItemMenu[];
}

// Tipos para modais
export interface PropsModal {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
  tamanho?: 'sm' | 'md' | 'lg' | 'xl';
}

// Tipos para tabelas
export interface ColunaTabela<T = Record<string, unknown>> {
  chave: keyof T | string;
  rotulo: string;
  renderizar?: (valor: unknown, item: T) => React.ReactNode;
  ordenavel?: boolean;
  largura?: string;
}

export interface TabelaProps<T = Record<string, unknown>> {
  dados: T[];
  colunas: ColunaTabela<T>[];
  carregando?: boolean;
  aoClicarLinha?: (item: T) => void;
  paginacao?: {
    paginaAtual: number;
    totalPaginas: number;
    aoMudarPagina: (pagina: number) => void;
  };
}
