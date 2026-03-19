'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  Plus,
  Search,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { Layout } from '@/components';
import { TextActionModal } from '@/components/ui';
import { UsuarioSessao } from '@/types';
import { useToast } from '@/components/providers/ToastProvider';
import { temPermissao } from '@/lib/auth';

interface CondominioOpcao {
  id: string;
  nome: string;
}

interface LocacaoEvento {
  id: string;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  criadoEm: string;
  usuario?: {
    id: string;
    nome: string;
  } | null;
}

interface Locacao {
  id: string;
  dataInicio: string;
  dataFim: string;
  tipoLocacao: string;
  valor: number;
  status: string;
  statusPagamento: string;
  placaVeiculo: string | null;
  modeloVeiculo: string | null;
  vaga: {
    numero: string;
    unidade: {
      numero: string;
      torre: {
        nome: string;
      };
    };
    condominio: {
      id: string;
      nome: string;
    };
  };
  locatario: {
    id: string;
    nome: string;
    email: string;
  };
  proprietario: {
    id: string;
    nome: string;
    email: string;
  };
  eventos: LocacaoEvento[];
}

interface MoradorOpcao {
  id: string;
  nome: string;
  email: string;
}

interface VagaOpcao {
  id: string;
  numero: string;
  proprietario: {
    id: string;
    nome: string;
  };
  unidade: {
    numero: string;
    torre: {
      nome: string;
    };
  };
  configuracaoLocacao: {
    tiposPermitidos: string[];
  };
}

type TipoEventoPortaria = 'ENTRADA_PORTARIA' | 'SAIDA_PORTARIA' | 'OBSERVACAO_PORTARIA';

const STATUS_OPTIONS = [
  { value: 'ATIVA', label: 'Ativas' },
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'FINALIZADA', label: 'Finalizadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
  { value: 'TODAS', label: 'Todas' },
];

function formatarData(data: string) {
  return new Date(data).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'PENDENTE':
      return 'bg-yellow-100 text-yellow-800';
    case 'ATIVA':
      return 'bg-green-100 text-green-800';
    case 'CANCELADA':
      return 'bg-red-100 text-red-800';
    case 'FINALIZADA':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'PENDENTE':
      return <Clock className="h-4 w-4" />;
    case 'ATIVA':
      return <CheckCircle className="h-4 w-4" />;
    case 'CANCELADA':
      return <XCircle className="h-4 w-4" />;
    case 'FINALIZADA':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return null;
  }
}

export default function ReservasSindicoPage() {
  const { data: session } = useSession();
  const usuario = session?.user as UsuarioSessao | undefined;
  const { showToast } = useToast();

  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('ATIVA');
  const [filtroCondominio, setFiltroCondominio] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [condominios, setCondominios] = useState<CondominioOpcao[]>([]);
  const [erro, setErro] = useState('');
  const [acesso, setAcesso] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [modalEmprestimoAberto, setModalEmprestimoAberto] = useState(false);
  const [moradores, setMoradores] = useState<MoradorOpcao[]>([]);
  const [vagasDisponiveis, setVagasDisponiveis] = useState<VagaOpcao[]>([]);
  const [salvandoEmprestimo, setSalvandoEmprestimo] = useState(false);
  const [modalEventoPortaria, setModalEventoPortaria] = useState<{
    aberto: boolean;
    locacaoId: string;
    tipo: TipoEventoPortaria;
    placaVeiculo: string;
    vagaNumero: string;
  }>({
    aberto: false,
    locacaoId: '',
    tipo: 'ENTRADA_PORTARIA',
    placaVeiculo: '',
    vagaNumero: '',
  });
  const [formEmprestimo, setFormEmprestimo] = useState({
    locatarioId: '',
    vagaId: '',
    tipoLocacao: 'DIARIA',
    dataInicio: '',
    dataFim: '',
    placaVeiculo: '',
    modeloVeiculo: '',
  });

  const perfilPorteiro = useMemo(
    () => usuario?.perfis.some((perfil) => perfil.tipo === 'porteiro') ?? false,
    [usuario]
  );
  const perfilGestorLocal = useMemo(
    () =>
      usuario?.perfis.some((perfil) =>
        ['sindico', 'administrador_condominio'].includes(perfil.tipo)
      ) ?? false,
    [usuario]
  );
  const podeRegistrarEmprestimoManual = useMemo(
    () =>
      !!usuario &&
      !!filtroCondominio &&
      temPermissao(usuario, 'registrarEmprestimoManual', filtroCondominio),
    [filtroCondominio, usuario]
  );
  const podeRegistrarEventosPortaria = useMemo(
    () =>
      !!usuario &&
      !!filtroCondominio &&
      temPermissao(usuario, 'registrarEventosPortaria', filtroCondominio),
    [filtroCondominio, usuario]
  );

  useEffect(() => {
    const perfisOperacionais = (usuario?.perfis || []).filter((perfil) =>
      ['administrador_condominio', 'sindico', 'porteiro'].includes(perfil.tipo)
    );

    const condominiosDisponiveis = perfisOperacionais.flatMap((perfil) =>
      perfil.condominio ? [{ id: perfil.condominio.id, nome: perfil.condominio.nome }] : []
    );

    const unicos = Array.from(
      new Map(condominiosDisponiveis.map((condominio) => [condominio.id, condominio])).values()
    );

    setCondominios(unicos);

    if (!filtroCondominio && unicos.length > 0) {
      setFiltroCondominio(unicos[0].id);
    }
  }, [filtroCondominio, usuario]);

  const carregarDados = useCallback(async () => {
    if (!filtroCondominio) {
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro('');
      setAcesso(true);

      const response = await fetch(`/api/locacoes/condominio?condominioId=${filtroCondominio}`);

      if (response.ok) {
        const dados = await response.json();
        setLocacoes(dados);
        return;
      }

      if (response.status === 403) {
        setErro(
          'Acesso negado. Apenas administradores locais, síndicos e porteiros podem acompanhar as locações.'
        );
        setAcesso(false);
        return;
      }

      const data = await response.json().catch(() => null);
      setErro(data?.error || 'Erro ao carregar o monitoramento');
    } catch (error) {
      console.error('Erro ao carregar locações:', error);
      setErro('Erro ao carregar o monitoramento');
    } finally {
      setCarregando(false);
    }
  }, [filtroCondominio]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const carregarOpcoesEmprestimo = useCallback(async () => {
    if (!filtroCondominio || !perfilGestorLocal) {
      return;
    }

    const [usuariosResponse, vagasResponse] = await Promise.all([
      fetch(
        `/api/admin/usuarios?condominioId=${filtroCondominio}&tipo=morador&ativo=true&limite=200`
      ),
      fetch(`/api/vagas/disponiveis?condominioId=${filtroCondominio}&includeOwn=true`),
    ]);

    if (!usuariosResponse.ok) {
      throw new Error('Nao foi possivel carregar os moradores do condominio');
    }

    if (!vagasResponse.ok) {
      throw new Error('Nao foi possivel carregar as vagas publicadas');
    }

    const usuariosData = await usuariosResponse.json();
    const vagasData = await vagasResponse.json();

    setMoradores(
      (usuariosData.usuarios || []).map((usuarioItem: any) => ({
        id: usuarioItem.id,
        nome: usuarioItem.nome,
        email: usuarioItem.email,
      }))
    );
    setVagasDisponiveis(Array.isArray(vagasData) ? vagasData : []);
  }, [filtroCondominio, perfilGestorLocal]);

  const abrirModalEmprestimo = async () => {
    try {
      await carregarOpcoesEmprestimo();
      setFormEmprestimo({
        locatarioId: '',
        vagaId: '',
        tipoLocacao: 'DIARIA',
        dataInicio: '',
        dataFim: '',
        placaVeiculo: '',
        modeloVeiculo: '',
      });
      setModalEmprestimoAberto(true);
    } catch (error) {
      showToast({
        title: 'Falha ao preparar registro',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
        variant: 'error',
      });
    }
  };

  const vagaSelecionada = useMemo(
    () => vagasDisponiveis.find((vaga) => vaga.id === formEmprestimo.vagaId) || null,
    [formEmprestimo.vagaId, vagasDisponiveis]
  );

  useEffect(() => {
    if (
      vagaSelecionada &&
      !vagaSelecionada.configuracaoLocacao.tiposPermitidos.includes(formEmprestimo.tipoLocacao)
    ) {
      setFormEmprestimo((current) => ({
        ...current,
        tipoLocacao: vagaSelecionada.configuracaoLocacao.tiposPermitidos[0] || 'DIARIA',
      }));
    }
  }, [formEmprestimo.tipoLocacao, vagaSelecionada]);

  const registrarEmprestimoManual = async () => {
    if (
      !formEmprestimo.locatarioId ||
      !formEmprestimo.vagaId ||
      !formEmprestimo.dataInicio ||
      !formEmprestimo.dataFim ||
      !formEmprestimo.placaVeiculo.trim() ||
      !formEmprestimo.modeloVeiculo.trim()
    ) {
      showToast({
        title: 'Formulario incompleto',
        description: 'Preencha morador, vaga, periodo e veiculo antes de salvar.',
        variant: 'warning',
      });
      return;
    }

    setSalvandoEmprestimo(true);
    try {
      const response = await fetch('/api/locacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locatarioId: formEmprestimo.locatarioId,
          vagaId: formEmprestimo.vagaId,
          tipoLocacao: formEmprestimo.tipoLocacao,
          dataInicio: new Date(formEmprestimo.dataInicio).toISOString(),
          dataFim: new Date(formEmprestimo.dataFim).toISOString(),
          placaVeiculo: formEmprestimo.placaVeiculo,
          modeloVeiculo: formEmprestimo.modeloVeiculo,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Nao foi possivel registrar o emprestimo');
      }

      setModalEmprestimoAberto(false);
      await carregarDados();
      showToast({
        title: 'Emprestimo registrado',
        description: 'O uso da vaga foi registrado com sucesso no condominio.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Falha ao registrar emprestimo',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
        variant: 'error',
      });
    } finally {
      setSalvandoEmprestimo(false);
    }
  };

  const registrarEventoPortaria = async (
    locacaoId: string,
    tipo: TipoEventoPortaria,
    descricao?: string
  ) => {
    setProcessandoId(locacaoId);
    try {
      const response = await fetch(`/api/locacoes/${locacaoId}/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          descricao: descricao?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        showToast({
          title: 'Falha ao registrar evento',
          description: data?.error || 'Nao foi possivel registrar o evento.',
          variant: 'error',
        });
        return;
      }

      void carregarDados();
      showToast({
        title: 'Evento registrado',
        description: 'A movimentacao foi salva na trilha da locacao.',
        variant: 'success',
      });
      setModalEventoPortaria({
        aberto: false,
        locacaoId: '',
        tipo: 'ENTRADA_PORTARIA',
        placaVeiculo: '',
        vagaNumero: '',
      });
    } catch (error) {
      console.error('Erro ao registrar evento da portaria:', error);
      showToast({
        title: 'Falha ao registrar evento',
        description: 'Erro ao registrar o evento da portaria.',
        variant: 'error',
      });
    } finally {
      setProcessandoId(null);
    }
  };

  const abrirModalEventoPortaria = (locacao: Locacao, tipo: TipoEventoPortaria) => {
    setModalEventoPortaria({
      aberto: true,
      locacaoId: locacao.id,
      tipo,
      placaVeiculo: locacao.placaVeiculo || 'Sem placa informada',
      vagaNumero: locacao.vaga.numero,
    });
  };

  const configuracaoModalEvento = useMemo(() => {
    switch (modalEventoPortaria.tipo) {
      case 'ENTRADA_PORTARIA':
        return {
          titulo: 'Registrar entrada',
          descricao: `Registre a entrada do veiculo ${modalEventoPortaria.placaVeiculo} na vaga ${modalEventoPortaria.vagaNumero}.`,
          label: 'Detalhe opcional',
          placeholder: 'Ex.: portao liberado as 18h10.',
          helperText: 'Use este campo somente se precisar complementar o registro.',
          confirmarLabel: 'Salvar entrada',
          obrigatorio: false,
        };
      case 'SAIDA_PORTARIA':
        return {
          titulo: 'Registrar saida',
          descricao: `Registre a saida do veiculo ${modalEventoPortaria.placaVeiculo} da vaga ${modalEventoPortaria.vagaNumero}.`,
          label: 'Detalhe opcional',
          placeholder: 'Ex.: veiculo saiu acompanhado pelo morador.',
          helperText: 'Esse detalhe ajuda a manter a trilha da portaria completa.',
          confirmarLabel: 'Salvar saida',
          obrigatorio: false,
        };
      default:
        return {
          titulo: 'Adicionar observacao',
          descricao: `Escreva uma observacao operacional para a vaga ${modalEventoPortaria.vagaNumero}.`,
          label: 'Observacao da portaria',
          placeholder: 'Ex.: visitante informado na guarita para acesso temporario.',
          helperText: 'Esse campo e obrigatorio para registrar uma observacao manual.',
          confirmarLabel: 'Salvar observacao',
          obrigatorio: true,
        };
    }
  }, [modalEventoPortaria]);

  const locacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return locacoes.filter((locacao) => {
      const statusOk = filtroStatus === 'TODAS' || locacao.status === filtroStatus;
      const buscaOk =
        !termo ||
        locacao.placaVeiculo?.toLowerCase().includes(termo) ||
        locacao.modeloVeiculo?.toLowerCase().includes(termo) ||
        locacao.vaga.numero.toLowerCase().includes(termo) ||
        locacao.vaga.unidade.numero.toLowerCase().includes(termo) ||
        locacao.vaga.unidade.torre.nome.toLowerCase().includes(termo) ||
        locacao.locatario.nome.toLowerCase().includes(termo) ||
        locacao.proprietario.nome.toLowerCase().includes(termo);

      return statusOk && !!buscaOk;
    });
  }, [busca, filtroStatus, locacoes]);

  const stats = useMemo(
    () => ({
      total: locacoes.length,
      pendentes: locacoes.filter((locacao) => locacao.status === 'PENDENTE').length,
      ativas: locacoes.filter((locacao) => locacao.status === 'ATIVA').length,
      finalizadas: locacoes.filter((locacao) => locacao.status === 'FINALIZADA').length,
      canceladas: locacoes.filter((locacao) => locacao.status === 'CANCELADA').length,
      entradasHoje: locacoes.filter((locacao) =>
        locacao.eventos.some(
          (evento) =>
            evento.tipo === 'ENTRADA_PORTARIA' &&
            new Date(evento.criadoEm).toDateString() === new Date().toDateString()
        )
      ).length,
    }),
    [locacoes]
  );

  const locacoesAtivasAgora = useMemo(
    () => locacoesFiltradas.filter((locacao) => locacao.status === 'ATIVA').length,
    [locacoesFiltradas]
  );

  if (!acesso) {
    return (
      <Layout>
        <div className="flex items-center gap-3 rounded-[28px] border border-red-200 bg-red-50 p-6">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h2 className="font-bold text-red-900">Acesso negado</h2>
            <p className="text-red-700">{erro}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-amber-100 bg-[linear-gradient(135deg,_#fffbeb_0%,_#ffffff_60%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                {perfilPorteiro && !perfilGestorLocal
                  ? 'Uso diário da portaria'
                  : 'Gestão diária do condomínio'}
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                <Car className="h-7 w-7 text-amber-600" />
                {perfilPorteiro && !perfilGestorLocal
                  ? 'Monitoramento de veículos'
                  : 'Monitoramento de locações'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                {perfilPorteiro && !perfilGestorLocal
                  ? 'Consulte rapidamente placa, modelo, vaga, morador, período e os últimos eventos de cada locação.'
                  : 'Acompanhe os empréstimos do condomínio com foco em status, veículos e eventos operacionais.'}
              </p>
            </div>

            <div className="grid gap-3 lg:min-w-[380px]">
              {perfilGestorLocal && podeRegistrarEmprestimoManual && (
                <button
                  type="button"
                  onClick={() => void abrirModalEmprestimo()}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-amber-600 px-4 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar emprestimo
                </button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">Ativas agora</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{locacoesAtivasAgora}</p>
                </div>
                <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                  <p className="text-xs text-slate-500">Entradas hoje</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stats.entradasHoje}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
            <p className="text-xs text-yellow-700">Pendentes</p>
            <p className="mt-1 text-2xl font-bold text-yellow-900">{stats.pendentes}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
            <p className="text-xs text-green-700">Ativas</p>
            <p className="mt-1 text-2xl font-bold text-green-900">{stats.ativas}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-xs text-slate-700">Finalizadas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.finalizadas}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <p className="text-xs text-red-700">Canceladas</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{stats.canceladas}</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[0.7fr_0.7fr_1.2fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                <Building2 className="mr-1 inline h-4 w-4" />
                Condomínio
              </label>
              <select
                value={filtroCondominio}
                onChange={(event) => setFiltroCondominio(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {condominios.map((condominio) => (
                  <option key={condominio.id} value={condominio.id}>
                    {condominio.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                <Search className="mr-1 inline h-4 w-4" />
                Buscar por placa, modelo, vaga, unidade, locatário ou proprietário
              </label>
              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Ex.: ABC1D23, 102, João"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700" />
            <div>
              <p className="font-medium text-blue-900">Registro operacional completo</p>
              <p className="mt-1 text-sm text-blue-800">
                Cada locacao mostra a trilha de eventos operacionais para facilitar o
                acompanhamento pelo sindico, administrador local e portaria.
              </p>
            </div>
          </div>
        </section>

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-600" />
          </div>
        ) : locacoesFiltradas.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Car className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-lg text-slate-600">Nenhuma locação encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {locacoesFiltradas.map((locacao) => (
              <article
                key={locacao.id}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        Vaga {locacao.vaga.numero}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {locacao.vaga.unidade.torre.nome} • Unidade {locacao.vaga.unidade.numero}
                      </h3>
                      <p className="text-sm text-slate-600">{locacao.vaga.condominio.nome}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
                          locacao.status
                        )}`}
                      >
                        {getStatusIcon(locacao.status)}
                        {locacao.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl bg-slate-900 p-4 text-white">
                      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300">
                        <Car className="h-4 w-4" />
                        Veículo estacionado
                      </div>
                      <p className="text-2xl font-bold tracking-wider">
                        {locacao.placaVeiculo || 'SEM PLACA'}
                      </p>
                      <p className="text-sm text-slate-300">
                        {locacao.modeloVeiculo || 'Modelo não informado'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-4">
                      <div className="mb-1 flex items-center gap-1 text-sm text-blue-700">
                        <User className="h-4 w-4" />
                        Proprietário
                      </div>
                      <p className="font-medium text-slate-900">{locacao.proprietario.nome}</p>
                      <p className="text-xs text-slate-500">{locacao.proprietario.email}</p>
                    </div>

                    <div className="rounded-2xl bg-green-50 p-4">
                      <div className="mb-1 flex items-center gap-1 text-sm text-green-700">
                        <User className="h-4 w-4" />
                        Locatário
                      </div>
                      <p className="font-medium text-slate-900">{locacao.locatario.nome}</p>
                      <p className="text-xs text-slate-500">{locacao.locatario.email}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="mb-1 flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="h-4 w-4" />
                        Período
                      </div>
                      <p className="text-xs text-slate-900">{formatarData(locacao.dataInicio)}</p>
                      <p className="text-xs text-slate-500">até</p>
                      <p className="text-xs text-slate-900">{formatarData(locacao.dataFim)}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="mb-1 flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="h-4 w-4" />
                        Modalidade
                      </div>
                      <p className="font-medium text-slate-900">{locacao.tipoLocacao}</p>
                      <p className="text-xs text-slate-500">Uso registrado no condominio</p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Últimos registros</p>
                        <p className="text-xs text-slate-500">
                          Entrada, saída, observações e mudanças de etapa
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {locacao.eventos.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum registro recente.</p>
                      ) : (
                        locacao.eventos.map((evento) => (
                          <div
                            key={evento.id}
                            className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">{evento.titulo}</p>
                              <span className="text-xs text-slate-400">
                                {formatarData(evento.criadoEm)}
                              </span>
                            </div>
                            {evento.descricao && (
                              <p className="mt-1 text-sm text-slate-600">{evento.descricao}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {locacao.status === 'ATIVA' && podeRegistrarEventosPortaria && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        onClick={() => abrirModalEventoPortaria(locacao, 'ENTRADA_PORTARIA')}
                        disabled={processandoId === locacao.id}
                        className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Registrar entrada
                      </button>
                      <button
                        onClick={() => abrirModalEventoPortaria(locacao, 'SAIDA_PORTARIA')}
                        disabled={processandoId === locacao.id}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        Registrar saída
                      </button>
                      <button
                        onClick={() => abrirModalEventoPortaria(locacao, 'OBSERVACAO_PORTARIA')}
                        disabled={processandoId === locacao.id}
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        Adicionar observação
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {modalEmprestimoAberto && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]">
            <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
              <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Registrar emprestimo manual</h2>
                      <p className="text-sm text-slate-500">
                        Para moradores que pedem ajuda ao sindico ou ao administrador.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalEmprestimoAberto(false)}
                      className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <span className="sr-only">Fechar</span>
                      x
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto px-5 py-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Morador</label>
                      <select
                        value={formEmprestimo.locatarioId}
                        onChange={(event) =>
                          setFormEmprestimo((current) => ({
                            ...current,
                            locatarioId: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Selecione</option>
                        {moradores.map((morador) => (
                          <option key={morador.id} value={morador.id}>
                            {morador.nome} - {morador.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Vaga publicada</label>
                      <select
                        value={formEmprestimo.vagaId}
                        onChange={(event) =>
                          setFormEmprestimo((current) => ({
                            ...current,
                            vagaId: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Selecione</option>
                        {vagasDisponiveis.map((vaga) => (
                          <option key={vaga.id} value={vaga.id}>
                            {`${vaga.unidade.torre.nome} - Unidade ${vaga.unidade.numero} - Vaga ${vaga.numero}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Inicio</label>
                      <input
                        type="datetime-local"
                        value={formEmprestimo.dataInicio}
                        onChange={(event) =>
                          setFormEmprestimo((current) => ({
                            ...current,
                            dataInicio: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Fim</label>
                      <input
                        type="datetime-local"
                        value={formEmprestimo.dataFim}
                        onChange={(event) =>
                          setFormEmprestimo((current) => ({
                            ...current,
                            dataFim: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Modalidade</label>
                      <select
                        value={formEmprestimo.tipoLocacao}
                        onChange={(event) =>
                          setFormEmprestimo((current) => ({
                            ...current,
                            tipoLocacao: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {(vagaSelecionada?.configuracaoLocacao.tiposPermitidos || ['DIARIA']).map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo === 'HORA' && 'Por hora'}
                            {tipo === 'DIARIA' && 'Diaria'}
                            {tipo === 'MENSAL' && 'Mensal'}
                            {tipo === 'ANUAL' && 'Anual'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                      O registro manual cria o emprestimo imediatamente, desde que a vaga esteja
                      livre no periodo selecionado.
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Placa do veiculo</label>
                      <input
                        value={formEmprestimo.placaVeiculo}
                        onChange={(event) =>
                          setFormEmprestimo((current) => ({
                            ...current,
                            placaVeiculo: event.target.value.toUpperCase(),
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm uppercase focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="ABC1D23"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Modelo do veiculo</label>
                      <input
                        value={formEmprestimo.modeloVeiculo}
                        onChange={(event) =>
                          setFormEmprestimo((current) => ({
                            ...current,
                            modeloVeiculo: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Ex.: Onix prata"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setModalEmprestimoAberto(false)}
                      className="h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void registrarEmprestimoManual()}
                      disabled={salvandoEmprestimo}
                      className="h-12 rounded-2xl bg-amber-600 px-4 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                    >
                      {salvandoEmprestimo ? 'Salvando...' : 'Registrar emprestimo'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <TextActionModal
          aberto={modalEventoPortaria.aberto}
          aoFechar={() =>
            setModalEventoPortaria({
              aberto: false,
              locacaoId: '',
              tipo: 'ENTRADA_PORTARIA',
              placaVeiculo: '',
              vagaNumero: '',
            })
          }
          aoConfirmar={async (descricao) => {
            await registrarEventoPortaria(
              modalEventoPortaria.locacaoId,
              modalEventoPortaria.tipo,
              descricao
            );
          }}
          titulo={configuracaoModalEvento.titulo}
          descricao={configuracaoModalEvento.descricao}
          label={configuracaoModalEvento.label}
          placeholder={configuracaoModalEvento.placeholder}
          helperText={configuracaoModalEvento.helperText}
          confirmarLabel={configuracaoModalEvento.confirmarLabel}
          obrigatorio={configuracaoModalEvento.obrigatorio}
          loading={processandoId === modalEventoPortaria.locacaoId}
        />
      </div>
    </Layout>
  );
}
