'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import { Layout } from '@/components';

interface LocacaoEvento {
  id: string;
  titulo: string;
  descricao?: string | null;
  criadoEm: string;
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

export default function ReservasAdminPage() {
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('ATIVA');
  const [filtroCondominio, setFiltroCondominio] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [acesso, setAcesso] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);
        setErro('');
        setAcesso(true);

        const response = await fetch('/api/locacoes/todas');
        if (response.ok) {
          const dados = await response.json();
          setLocacoes(dados);
          return;
        }

        if (response.status === 403) {
          setErro(
            'Acesso negado. Apenas administradores mestres podem acompanhar o monitoramento global.'
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
    };

    void carregarDados();
  }, []);

  const condominios = useMemo(
    () =>
      Array.from(
        new Map(
          locacoes.map((locacao) => [locacao.vaga.condominio.id, locacao.vaga.condominio])
        ).values()
      ),
    [locacoes]
  );

  const locacoesFiltradas = useMemo(
    () =>
      locacoes.filter((locacao) => {
        const statusOk = filtroStatus === 'TODAS' || locacao.status === filtroStatus;
        const condominioOk =
          !filtroCondominio || locacao.vaga.condominio.id === filtroCondominio;
        const termo = busca.trim().toLowerCase();
        const buscaOk =
          !termo ||
          locacao.placaVeiculo?.toLowerCase().includes(termo) ||
          locacao.modeloVeiculo?.toLowerCase().includes(termo) ||
          locacao.locatario.nome.toLowerCase().includes(termo) ||
          locacao.proprietario.nome.toLowerCase().includes(termo) ||
          locacao.vaga.numero.toLowerCase().includes(termo) ||
          locacao.vaga.unidade.numero.toLowerCase().includes(termo) ||
          locacao.vaga.condominio.nome.toLowerCase().includes(termo);

        return statusOk && condominioOk && !!buscaOk;
      }),
    [busca, filtroCondominio, filtroStatus, locacoes]
  );

  const stats = useMemo(
    () => ({
      total: locacoes.length,
      pendentes: locacoes.filter((locacao) => locacao.status === 'PENDENTE').length,
      ativas: locacoes.filter((locacao) => locacao.status === 'ATIVA').length,
      finalizadas: locacoes.filter((locacao) => locacao.status === 'FINALIZADA').length,
      canceladas: locacoes.filter((locacao) => locacao.status === 'CANCELADA').length,
    }),
    [locacoes]
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
        <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,_#eff6ff_0%,_#ffffff_60%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                Visão global do piloto
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                <Car className="h-7 w-7 text-blue-600" />
                Monitoramento global
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Acompanhe veículos, status e a trilha operacional dos empréstimos em todos os
                condomínios.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
            <p className="text-xs text-yellow-700">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pendentes}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
            <p className="text-xs text-green-700">Ativas</p>
            <p className="text-2xl font-bold text-green-900">{stats.ativas}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-xs text-slate-700">Finalizadas</p>
            <p className="text-2xl font-bold text-slate-900">{stats.finalizadas}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <p className="text-xs text-red-700">Canceladas</p>
            <p className="text-2xl font-bold text-red-900">{stats.canceladas}</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                <Building2 className="mr-1 inline h-4 w-4" />
                Condomínio
              </label>
              <select
                value={filtroCondominio}
                onChange={(event) => setFiltroCondominio(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os condomínios</option>
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
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                Buscar
              </label>
              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Placa, vaga, condomínio ou morador"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {erro && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
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
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">
                        {locacao.vaga.condominio.nome} • Vaga {locacao.vaga.numero}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {locacao.vaga.unidade.torre.nome} • Unidade {locacao.vaga.unidade.numero}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
                          locacao.status
                        )}`}
                      >
                        {getStatusIcon(locacao.status)}
                        {locacao.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-sm text-slate-600">
                        <Car className="h-4 w-4" />
                        Veículo
                      </div>
                      <p className="text-lg font-bold text-slate-900">
                        {locacao.placaVeiculo || 'Sem placa informada'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locacao.modeloVeiculo || 'Modelo não informado'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-sm text-blue-700">
                        <User className="h-4 w-4" />
                        Proprietário
                      </div>
                      <p className="font-medium text-slate-900">{locacao.proprietario.nome}</p>
                      <p className="text-xs text-slate-500">{locacao.proprietario.email}</p>
                    </div>

                    <div className="rounded-2xl bg-green-50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-sm text-green-700">
                        <User className="h-4 w-4" />
                        Locatário
                      </div>
                      <p className="font-medium text-slate-900">{locacao.locatario.nome}</p>
                      <p className="text-xs text-slate-500">{locacao.locatario.email}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="h-4 w-4" />
                        Período
                      </div>
                      <p className="text-xs text-slate-900">{formatarData(locacao.dataInicio)}</p>
                      <p className="text-xs text-slate-500">até</p>
                      <p className="text-xs text-slate-900">{formatarData(locacao.dataFim)}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="h-4 w-4" />
                        Modalidade
                      </div>
                      <p className="font-medium text-slate-900">{locacao.tipoLocacao}</p>
                      <p className="text-xs text-slate-500">Uso registrado no condominio</p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Últimos eventos</p>
                    <div className="mt-3 space-y-3">
                      {locacao.eventos.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum evento recente.</p>
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
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
