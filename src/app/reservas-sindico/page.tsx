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
  DollarSign,
  Search,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { Layout } from '@/components';
import { UsuarioSessao } from '@/types';

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

function getStatusPagamentoLabel(status: string) {
  switch (status) {
    case 'PENDENTE':
      return 'Pagamento futuro';
    case 'CONFIRMADO':
      return 'Pagamento confirmado';
    case 'CANCELADO':
      return 'Pagamento cancelado';
    case 'REEMBOLSADO':
      return 'Pagamento reembolsado';
    default:
      return status;
  }
}

export default function ReservasSindicoPage() {
  const { data: session } = useSession();
  const usuario = session?.user as UsuarioSessao | undefined;

  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('ATIVA');
  const [filtroCondominio, setFiltroCondominio] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [condominios, setCondominios] = useState<CondominioOpcao[]>([]);
  const [erro, setErro] = useState('');
  const [acesso, setAcesso] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

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

  const registrarEventoPortaria = async (
    locacaoId: string,
    tipo: 'ENTRADA_PORTARIA' | 'SAIDA_PORTARIA' | 'OBSERVACAO_PORTARIA'
  ) => {
    const descricao =
      tipo === 'OBSERVACAO_PORTARIA'
        ? prompt('Digite a observação da portaria:')
        : prompt('Deseja registrar um detalhe opcional?');

    if (tipo === 'OBSERVACAO_PORTARIA' && !descricao?.trim()) {
      return;
    }

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
        alert(data?.error || 'Não foi possível registrar o evento.');
        return;
      }

      void carregarDados();
    } catch (error) {
      console.error('Erro ao registrar evento da portaria:', error);
      alert('Erro ao registrar o evento da portaria.');
    } finally {
      setProcessandoId(null);
    }
  };

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
                  : 'Acompanhe as locações do condomínio com foco em status, veículos, valores e eventos operacionais.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:min-w-[380px]">
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
              <p className="font-medium text-blue-900">Rastro pronto para pagamento</p>
              <p className="mt-1 text-sm text-blue-800">
                Cada locação já mostra o estado do pagamento futuro e a trilha de eventos
                operacionais, preparando o piloto para uma integração financeira posterior.
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
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {getStatusPagamentoLabel(locacao.statusPagamento)}
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
                        <DollarSign className="h-4 w-4" />
                        Valor
                      </div>
                      <p className="font-medium text-slate-900">R$ {locacao.valor.toFixed(2)}</p>
                      <p className="text-xs uppercase text-slate-500">{locacao.tipoLocacao}</p>
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

                  {locacao.status === 'ATIVA' && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        onClick={() => registrarEventoPortaria(locacao.id, 'ENTRADA_PORTARIA')}
                        disabled={processandoId === locacao.id}
                        className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Registrar entrada
                      </button>
                      <button
                        onClick={() => registrarEventoPortaria(locacao.id, 'SAIDA_PORTARIA')}
                        disabled={processandoId === locacao.id}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        Registrar saída
                      </button>
                      <button
                        onClick={() => registrarEventoPortaria(locacao.id, 'OBSERVACAO_PORTARIA')}
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
      </div>
    </Layout>
  );
}
