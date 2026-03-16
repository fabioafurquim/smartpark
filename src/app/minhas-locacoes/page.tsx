'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Car,
  Clock,
  DollarSign,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Layout } from '@/components';

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
  vagaId: string;
  vaga: {
    numero: string;
    tipo: string;
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
  locatarioId: string;
  locatario: {
    nome: string;
    email: string;
  };
  proprietarioId: string;
  proprietario: {
    nome: string;
    email: string;
  };
  dataInicio: string;
  dataFim: string;
  tipoLocacao: string;
  valor: number;
  status: string;
  statusPagamento: string;
  pagamentoObservacao?: string | null;
  placaVeiculo?: string | null;
  modeloVeiculo?: string | null;
  criadoEm: string;
  eventos: LocacaoEvento[];
}

type TipoVisualizacao = 'locatario' | 'proprietario';

const STATUS_OPTIONS = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'ATIVA', label: 'Ativas' },
  { value: 'REJEITADA', label: 'Rejeitadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
  { value: 'FINALIZADA', label: 'Finalizadas' },
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

function getTipoLocacaoLabel(tipo: string) {
  switch (tipo) {
    case 'HORA':
      return 'Por hora';
    case 'DIARIA':
      return 'Diária';
    case 'MENSAL':
      return 'Mensal';
    case 'ANUAL':
      return 'Anual';
    default:
      return tipo;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDENTE':
      return 'bg-yellow-100 text-yellow-800';
    case 'ATIVA':
      return 'bg-green-100 text-green-800';
    case 'REJEITADA':
      return 'bg-red-100 text-red-800';
    case 'CANCELADA':
      return 'bg-slate-100 text-slate-700';
    case 'FINALIZADA':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'PENDENTE':
      return 'Aguardando aprovação';
    case 'ATIVA':
      return 'Locação ativa';
    case 'REJEITADA':
      return 'Solicitação rejeitada';
    case 'CANCELADA':
      return 'Locação cancelada';
    case 'FINALIZADA':
      return 'Locação finalizada';
    default:
      return status;
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

export default function MinhasLocacoesPage() {
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);
  const [tipoVisualizacao, setTipoVisualizacao] = useState<TipoVisualizacao>('locatario');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const visualizacao = new URLSearchParams(window.location.search).get('visualizacao');
    if (visualizacao === 'locatario' || visualizacao === 'proprietario') {
      setTipoVisualizacao(visualizacao);
    }
  }, []);

  const carregarLocacoes = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await fetch(`/api/locacoes?tipo=${tipoVisualizacao}`);
      if (response.ok) {
        const dados = await response.json();
        setLocacoes(dados);
      }
    } catch (error) {
      console.error('Erro ao carregar locações:', error);
    } finally {
      setCarregando(false);
    }
  }, [tipoVisualizacao]);

  useEffect(() => {
    void carregarLocacoes();
  }, [carregarLocacoes]);

  const atualizarStatus = async (
    locacaoId: string,
    status: 'CANCELADA' | 'FINALIZADA',
    observacao?: string
  ) => {
    setAtualizandoId(locacaoId);
    try {
      const response = await fetch(`/api/locacoes/${locacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, observacao }),
      });

      if (!response.ok) {
        const erro = await response.json();
        alert(erro.error || 'Não foi possível atualizar a locação.');
        return;
      }

      void carregarLocacoes();
    } catch (error) {
      console.error('Erro ao atualizar locação:', error);
      alert('Erro ao atualizar a locação.');
    } finally {
      setAtualizandoId(null);
    }
  };

  const handleAprovar = async (locacaoId: string) => {
    if (!confirm('Confirma a aprovação desta locação?')) return;

    setAtualizandoId(locacaoId);
    try {
      const response = await fetch(`/api/locacoes/${locacaoId}/aprovar`, {
        method: 'POST',
      });

      if (response.ok) {
        void carregarLocacoes();
      } else {
        const erro = await response.json();
        alert(`Erro ao aprovar: ${erro.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao aprovar locação:', error);
      alert('Erro ao aprovar locação.');
    } finally {
      setAtualizandoId(null);
    }
  };

  const handleRejeitar = async (locacaoId: string) => {
    const motivo = prompt('Informe o motivo da rejeição:');
    if (!motivo) return;

    setAtualizandoId(locacaoId);
    try {
      const response = await fetch(`/api/locacoes/${locacaoId}/rejeitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      });

      if (response.ok) {
        void carregarLocacoes();
      } else {
        const erro = await response.json();
        alert(`Erro ao rejeitar: ${erro.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao rejeitar locação:', error);
      alert('Erro ao rejeitar locação.');
    } finally {
      setAtualizandoId(null);
    }
  };

  const locacoesFiltradas = useMemo(
    () =>
      locacoes.filter((locacao) => filtroStatus === 'TODAS' || locacao.status === filtroStatus),
    [filtroStatus, locacoes]
  );

  const estatisticas = useMemo(
    () => ({
      total: locacoes.length,
      pendentes: locacoes.filter((locacao) => locacao.status === 'PENDENTE').length,
      ativas: locacoes.filter((locacao) => locacao.status === 'ATIVA').length,
      finalizadas: locacoes.filter((locacao) => locacao.status === 'FINALIZADA').length,
    }),
    [locacoes]
  );

  const tituloHero =
    tipoVisualizacao === 'locatario'
      ? 'Acompanhe as vagas que você alugou'
      : 'Gerencie os pedidos recebidos nas suas vagas';
  const subtituloHero =
    tipoVisualizacao === 'locatario'
      ? 'Veja etapa atual, veículo, período e o histórico mais recente de cada locação.'
      : 'Aprove, rejeite, finalize e acompanhe tudo o que acontece com cada vaga publicada.';

  return (
    <Layout>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,_#eff6ff_0%,_#ffffff_60%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                Central de locações
              </div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Minhas locações</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">{subtituloHero}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 self-stretch sm:min-w-[320px]">
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">Ativas</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{estatisticas.ativas}</p>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">Pendentes</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{estatisticas.pendentes}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="font-medium text-amber-900">Pagamento preparado para a próxima fase</p>
              <p className="mt-1 text-sm text-amber-800">
                O piloto já guarda o status de pagamento da locação, mas a cobrança ainda acontece
                fora do app.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                onClick={() => setTipoVisualizacao('locatario')}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  tipoVisualizacao === 'locatario'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <User className="mr-2 inline h-4 w-4" />
                Aluguei
              </button>
              <button
                onClick={() => setTipoVisualizacao('proprietario')}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  tipoVisualizacao === 'proprietario'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <Car className="mr-2 inline h-4 w-4" />
                Minhas vagas
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <Clock className="h-4 w-4 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">Visão atual</p>
                <p className="truncate text-sm font-medium text-slate-900">{tituloHero}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{estatisticas.total}</p>
          </div>
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
            <p className="text-xs text-yellow-700">Pendentes</p>
            <p className="mt-1 text-2xl font-bold text-yellow-900">{estatisticas.pendentes}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
            <p className="text-xs text-green-700">Ativas</p>
            <p className="mt-1 text-2xl font-bold text-green-900">{estatisticas.ativas}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs text-blue-700">Finalizadas</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{estatisticas.finalizadas}</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Filtrar por status</p>
              <p className="text-xs text-slate-500">Escolha rapidamente o que deseja acompanhar.</p>
            </div>
            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-60"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {carregando ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : locacoesFiltradas.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Car className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">Nenhuma locação encontrada</h3>
            <p className="mt-2 text-sm text-slate-500">
              {tipoVisualizacao === 'locatario'
                ? 'Você ainda não alugou nenhuma vaga.'
                : 'Nenhuma das suas vagas recebeu pedidos neste filtro.'}
            </p>
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
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          Vaga {locacao.vaga.numero}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(locacao.status)}`}
                        >
                          {getStatusLabel(locacao.status)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {getStatusPagamentoLabel(locacao.statusPagamento)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {locacao.vaga.condominio.nome}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {locacao.vaga.unidade.torre.nome} • Unidade {locacao.vaga.unidade.numero}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-left sm:min-w-[190px]">
                      <p className="text-xs text-slate-500">Valor</p>
                      <p className="text-xl font-bold text-emerald-700">
                        R$ {locacao.valor.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {getTipoLocacaoLabel(locacao.tipoLocacao)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                        <Building2 className="h-4 w-4" />
                        Local
                      </div>
                      <p className="text-sm font-medium text-slate-900">{locacao.vaga.tipo}</p>
                      <p className="text-sm text-slate-600">
                        Torre {locacao.vaga.unidade.torre.nome}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                        <Calendar className="h-4 w-4" />
                        Período
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatarData(locacao.dataInicio)}
                      </p>
                      <p className="text-xs text-slate-500">até {formatarData(locacao.dataFim)}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                        <Car className="h-4 w-4" />
                        Veículo
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {locacao.placaVeiculo || 'Placa não informada'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locacao.modeloVeiculo || 'Modelo não informado'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                        <User className="h-4 w-4" />
                        {tipoVisualizacao === 'locatario' ? 'Proprietário' : 'Locatário'}
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {tipoVisualizacao === 'locatario'
                          ? locacao.proprietario.nome
                          : locacao.locatario.nome}
                      </p>
                      <p className="text-xs text-slate-500">
                        {tipoVisualizacao === 'locatario'
                          ? locacao.proprietario.email
                          : locacao.locatario.email}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Trilha recente</p>
                        <p className="text-xs text-slate-500">
                          Últimos eventos e sinais do futuro pagamento
                        </p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        {getStatusPagamentoLabel(locacao.statusPagamento)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {locacao.eventos.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>
                      ) : (
                        locacao.eventos.map((evento) => (
                          <div
                            key={evento.id}
                            className="flex gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100"
                          >
                            <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                            <div className="min-w-0 flex-1">
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
                          </div>
                        ))
                      )}
                    </div>

                    {locacao.pagamentoObservacao && (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <div className="flex items-start gap-2">
                          <DollarSign className="mt-0.5 h-4 w-4" />
                          <span>{locacao.pagamentoObservacao}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Solicitado em {formatarData(locacao.criadoEm)}
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {tipoVisualizacao === 'proprietario' && locacao.status === 'PENDENTE' && (
                        <>
                          <button
                            onClick={() => handleAprovar(locacao.id)}
                            disabled={atualizandoId === locacao.id}
                            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Aprovar pedido
                          </button>
                          <button
                            onClick={() => handleRejeitar(locacao.id)}
                            disabled={atualizandoId === locacao.id}
                            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                          >
                            Rejeitar pedido
                          </button>
                        </>
                      )}

                      {tipoVisualizacao === 'locatario' &&
                        ['PENDENTE', 'ATIVA'].includes(locacao.status) && (
                          <button
                            onClick={() =>
                              atualizarStatus(
                                locacao.id,
                                'CANCELADA',
                                'Cancelamento solicitado pelo morador.'
                              )
                            }
                            disabled={atualizandoId === locacao.id}
                            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                          >
                            Cancelar locação
                          </button>
                        )}

                      {tipoVisualizacao === 'proprietario' && locacao.status === 'ATIVA' && (
                        <button
                          onClick={() =>
                            atualizarStatus(
                              locacao.id,
                              'FINALIZADA',
                              'Locação encerrada pelo proprietário.'
                            )
                          }
                          disabled={atualizandoId === locacao.id}
                          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                          Finalizar locação
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
