'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Calendar, Car, ShieldCheck, User } from 'lucide-react';
import { Layout } from '@/components';
import { useToast } from '@/components/providers/ToastProvider';

interface LocacaoEvento {
  id: string;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  criadoEm: string;
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
  { value: 'ATIVA', label: 'Ativas' },
  { value: 'FINALIZADA', label: 'Finalizadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
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
      return 'Diaria';
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
    case 'ATIVA':
      return 'bg-green-100 text-green-800';
    case 'CANCELADA':
      return 'bg-red-100 text-red-800';
    case 'FINALIZADA':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'ATIVA':
      return 'Emprestimo ativo';
    case 'CANCELADA':
      return 'Emprestimo cancelado';
    case 'FINALIZADA':
      return 'Emprestimo finalizado';
    default:
      return status;
  }
}

export default function MinhasLocacoesPage() {
  const { showToast } = useToast();
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
      console.error('Erro ao carregar emprestimos:', error);
    } finally {
      setCarregando(false);
    }
  }, [tipoVisualizacao]);

  useEffect(() => {
    void carregarLocacoes();
  }, [carregarLocacoes]);

  const atualizarStatus = async (locacaoId: string, status: 'CANCELADA' | 'FINALIZADA') => {
    setAtualizandoId(locacaoId);
    try {
      const response = await fetch(`/api/locacoes/${locacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          observacao:
            status === 'FINALIZADA'
              ? 'Emprestimo encerrado pelo responsavel da vaga.'
              : 'Emprestimo cancelado pelo usuario.',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Nao foi possivel atualizar o emprestimo.');
      }

      await carregarLocacoes();
      showToast({
        title: status === 'FINALIZADA' ? 'Emprestimo finalizado' : 'Emprestimo cancelado',
        description: 'O status foi atualizado com sucesso.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Falha ao atualizar',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
        variant: 'error',
      });
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
      ativas: locacoes.filter((locacao) => locacao.status === 'ATIVA').length,
      finalizadas: locacoes.filter((locacao) => locacao.status === 'FINALIZADA').length,
      canceladas: locacoes.filter((locacao) => locacao.status === 'CANCELADA').length,
    }),
    [locacoes]
  );

  return (
    <Layout>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,_#eff6ff_0%,_#ffffff_60%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                Central de emprestimos
              </div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Meus emprestimos</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Acompanhe o uso das vagas, os veiculos registrados e o historico mais recente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 self-stretch sm:min-w-[320px]">
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">Ativas</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{estatisticas.ativas}</p>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">Finalizadas</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{estatisticas.finalizadas}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="font-medium text-amber-900">Fluxo automatico de uso da vaga</p>
              <p className="mt-1 text-sm text-amber-800">
                Quando a vaga esta publicada, o sistema valida conflito de periodo e registra o uso
                automaticamente.
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
                Usei vagas
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

            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{estatisticas.total}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
            <p className="text-xs text-green-700">Ativas</p>
            <p className="mt-1 text-2xl font-bold text-green-900">{estatisticas.ativas}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs text-blue-700">Finalizadas</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{estatisticas.finalizadas}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <p className="text-xs text-red-700">Canceladas</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{estatisticas.canceladas}</p>
          </div>
        </section>

        {carregando ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : locacoesFiltradas.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Car className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">Nenhum emprestimo encontrado</h3>
            <p className="mt-2 text-sm text-slate-500">
              {tipoVisualizacao === 'locatario'
                ? 'Voce ainda nao utilizou nenhuma vaga.'
                : 'Nenhuma das suas vagas recebeu emprestimos neste filtro.'}
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
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {locacao.vaga.condominio.nome}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {locacao.vaga.unidade.torre.nome} - Unidade {locacao.vaga.unidade.numero}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-left sm:min-w-[190px]">
                      <p className="text-xs text-slate-500">Modalidade</p>
                      <p className="text-xl font-bold text-slate-900">
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
                        Periodo
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatarData(locacao.dataInicio)}
                      </p>
                      <p className="text-xs text-slate-500">ate {formatarData(locacao.dataFim)}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                        <Car className="h-4 w-4" />
                        Veiculo
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {locacao.placaVeiculo || 'Placa nao informada'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locacao.modeloVeiculo || 'Modelo nao informado'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                        <User className="h-4 w-4" />
                        {tipoVisualizacao === 'locatario' ? 'Responsavel' : 'Morador'}
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
                        <p className="text-xs text-slate-500">Ultimos eventos do emprestimo</p>
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
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Registrado em {formatarData(locacao.criadoEm)}
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {tipoVisualizacao === 'locatario' && locacao.status === 'ATIVA' && (
                        <button
                          onClick={() => void atualizarStatus(locacao.id, 'CANCELADA')}
                          disabled={atualizandoId === locacao.id}
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancelar emprestimo
                        </button>
                      )}

                      {tipoVisualizacao === 'proprietario' && locacao.status === 'ATIVA' && (
                        <button
                          onClick={() => void atualizarStatus(locacao.id, 'FINALIZADA')}
                          disabled={atualizandoId === locacao.id}
                          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                          Finalizar emprestimo
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
