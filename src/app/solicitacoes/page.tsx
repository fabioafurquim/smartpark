'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layout } from '@/components';
import { Button, Input } from '@/components/ui';
import { AlertCircle, Building2, CheckCircle2, Clock3, Search, UserRound, XCircle } from 'lucide-react';

interface SolicitacaoItem {
  id: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacoes?: string | null;
  criadoEm: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
  };
  condominio: {
    id: string;
    nome: string;
  };
  unidade?: {
    id: string;
    numero: string;
    andar: number;
    torre?: {
      id: string;
      nome: string;
    } | null;
    _count: {
      vagas: number;
    };
  } | null;
}

interface RespostaSolicitacoes {
  solicitacoes: SolicitacaoItem[];
  resumo: {
    pendentes: number;
    aprovadas: number;
    rejeitadas: number;
  };
}

export default function SolicitacoesPage() {
  const [dados, setDados] = useState<RespostaSolicitacoes | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<'pendente' | 'aprovado' | 'rejeitado' | 'todas'>('pendente');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState('');
  const [erro, setErro] = useState('');

  const carregarSolicitacoes = useCallback(async () => {
    try {
      setCarregando(true);
      setErro('');
      const url = new URL('/api/solicitacoes-cadastro', window.location.origin);
      url.searchParams.set('status', statusFiltro);
      if (busca.trim()) {
        url.searchParams.set('busca', busca.trim());
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel carregar as solicitacoes');
      }

      setDados(data);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao carregar solicitacoes');
    } finally {
      setCarregando(false);
    }
  }, [busca, statusFiltro]);

  useEffect(() => {
    void carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  const processarSolicitacao = async (
    solicitacaoId: string,
    status: 'aprovado' | 'rejeitado'
  ) => {
    const observacoes =
      status === 'rejeitado'
        ? window.prompt('Informe o motivo da rejeicao (opcional):') || ''
        : '';

    try {
      setProcessandoId(solicitacaoId);
      const response = await fetch(`/api/solicitacoes-cadastro/${solicitacaoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          observacoes: observacoes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel processar a solicitacao');
      }

      await carregarSolicitacoes();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao processar solicitacao');
    } finally {
      setProcessandoId('');
    }
  };

  return (
    <Layout titulo="Solicitacoes de cadastro" subtitulo="Aprove ou rejeite o vinculo de novos moradores">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-700">Pendentes</p>
            <p className="mt-2 text-3xl font-bold text-amber-950">{dados?.resumo.pendentes || 0}</p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
            <p className="text-sm font-medium text-green-700">Aprovadas</p>
            <p className="mt-2 text-3xl font-bold text-green-950">{dados?.resumo.aprovadas || 0}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-700">Rejeitadas</p>
            <p className="mt-2 text-3xl font-bold text-red-950">{dados?.resumo.rejeitadas || 0}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_140px]">
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por morador, email, unidade ou condominio"
              startIcon={<Search className="h-4 w-4" />}
              fullWidth
            />

            <select
              value={statusFiltro}
              onChange={(event) =>
                setStatusFiltro(
                  event.target.value as 'pendente' | 'aprovado' | 'rejeitado' | 'todas'
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovadas</option>
              <option value="rejeitado">Rejeitadas</option>
              <option value="todas">Todas</option>
            </select>

            <Button variant="outline" onClick={() => void carregarSolicitacoes()}>
              Atualizar
            </Button>
          </div>
        </div>

        {erro && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{erro}</span>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
          </div>
        ) : dados?.solicitacoes.length ? (
          <div className="grid gap-4">
            {dados.solicitacoes.map((solicitacao) => (
              <div
                key={solicitacao.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        {solicitacao.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Solicitado em {new Date(solicitacao.criadoEm).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <UserRound className="h-4 w-4" />
                          Morador
                        </div>
                        <p className="mt-1 font-semibold text-gray-900">{solicitacao.usuario.nome}</p>
                        <p className="text-sm text-gray-600">{solicitacao.usuario.email}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <Building2 className="h-4 w-4" />
                          Condominio
                        </div>
                        <p className="mt-1 font-semibold text-gray-900">{solicitacao.condominio.nome}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <Clock3 className="h-4 w-4" />
                          Unidade
                        </div>
                        <p className="mt-1 font-semibold text-gray-900">
                          {solicitacao.unidade?.torre?.nome || 'Torre nao informada'} - unidade {solicitacao.unidade?.numero || '-'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {solicitacao.unidade?._count.vagas || 0} vaga(s) vinculada(s) ao aprovar
                        </p>
                      </div>
                    </div>

                    {solicitacao.observacoes && (
                      <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Observacoes:</span> {solicitacao.observacoes}
                      </div>
                    )}
                  </div>

                  {solicitacao.status === 'pendente' && (
                    <div className="flex min-w-56 flex-col gap-3">
                      <Button
                        onClick={() => void processarSolicitacao(solicitacao.id, 'aprovado')}
                        loading={processandoId === solicitacao.id}
                        className="justify-center"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Aprovar e liberar acesso
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void processarSolicitacao(solicitacao.id, 'rejeitado')}
                        disabled={processandoId === solicitacao.id}
                        className="justify-center border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
            Nenhuma solicitacao encontrada para os filtros atuais.
          </div>
        )}
      </div>
    </Layout>
  );
}
