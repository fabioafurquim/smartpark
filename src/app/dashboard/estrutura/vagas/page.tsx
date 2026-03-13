'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, Car, Edit, Plus, Trash2 } from 'lucide-react';
import { Layout } from '@/components';
import { Button } from '@/components/ui';
import TransferirVagaModal from '@/components/modals/TransferirVagaModal';
import VagaModal from '@/components/modals/VagaModal';

interface Vaga {
  id: string;
  numero: string;
  tipo: 'COBERTA' | 'DESCOBERTA' | 'DEFICIENTE' | 'IDOSO' | 'VISITANTE';
  ocupada: boolean;
  unidadeId?: string;
  condominioId?: string;
  proprietarioId?: string;
  unidade?: {
    id: string;
    numero: string;
    torre: {
      nome: string;
    };
  };
  condominio?: {
    id: string;
    nome: string;
  };
  criadoEm: string;
}

interface VagaFormData {
  numero: string;
  tipo: 'COBERTA' | 'DESCOBERTA' | 'DEFICIENTE' | 'IDOSO' | 'VISITANTE';
  unidadeId: string;
  condominioId?: string;
  proprietarioId?: string | null;
}

interface Condominio {
  id: string;
  nome: string;
}

export default function VagasPage() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [, setSalvando] = useState(false);
  const [condominioSelecionado, setCondominioSelecionado] = useState('');
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [filtroStatus, setFiltroStatus] = useState('TODAS');
  const [modalAberto, setModalAberto] = useState(false);
  const [vagaEditando, setVagaEditando] = useState<Vaga | null>(null);
  const [vagaTransferindo, setVagaTransferindo] = useState<Vaga | null>(null);

  const carregarCondominios = useCallback(async () => {
    try {
      const response = await fetch('/api/condominios');
      if (!response.ok) {
        throw new Error('Erro ao carregar condominios');
      }

      const dados = await response.json();
      setCondominios(dados.condominios || []);
    } catch (error) {
      console.error('Erro ao carregar condominios:', error);
    }
  }, []);

  const carregarVagas = useCallback(async () => {
    if (!condominioSelecionado) {
      setCarregando(false);
      setVagas([]);
      return;
    }

    try {
      setCarregando(true);
      const response = await fetch(`/api/vagas?condominioId=${condominioSelecionado}`);

      if (!response.ok) {
        throw new Error('Erro ao carregar vagas');
      }

      const dados = await response.json();
      setVagas(dados);
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
    } finally {
      setCarregando(false);
    }
  }, [condominioSelecionado]);

  useEffect(() => {
    carregarCondominios();
  }, [carregarCondominios]);

  useEffect(() => {
    carregarVagas();
  }, [carregarVagas]);

  const handleSalvarVaga = async (dadosVaga: VagaFormData) => {
    setSalvando(true);

    try {
      const condominioId = dadosVaga.condominioId ?? condominioSelecionado;

      if (!condominioId) {
        alert('Selecione um condominio antes de salvar a vaga.');
        return;
      }

      const url = vagaEditando ? `/api/vagas/${vagaEditando.id}` : '/api/vagas';
      const method = vagaEditando ? 'PUT' : 'POST';
      const payload: Record<string, string> = {
        numero: dadosVaga.numero,
        tipo: dadosVaga.tipo,
        unidadeId: dadosVaga.unidadeId,
        condominioId,
      };

      if (dadosVaga.proprietarioId) {
        payload.proprietarioId = dadosVaga.proprietarioId;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error || 'Erro ao salvar vaga');
      }

      await carregarVagas();
      setModalAberto(false);
      setVagaEditando(null);
      alert('Vaga salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar vaga:', error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar vaga.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirVaga = async (vagaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta vaga?')) {
      return;
    }

    try {
      const response = await fetch(`/api/vagas/${vagaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error || 'Erro ao excluir vaga');
      }

      await carregarVagas();
    } catch (error) {
      console.error('Erro ao excluir vaga:', error);
      alert(error instanceof Error ? error.message : 'Erro ao excluir vaga');
    }
  };

  const handleTransferirVaga = async (unidadeId: string) => {
    if (!vagaTransferindo) {
      return;
    }

    const response = await fetch(`/api/vagas/${vagaTransferindo.id}/transferir-unidade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ unidadeId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao transferir vaga');
    }

    await carregarVagas();
    setVagaTransferindo(null);
  };

  const vagasFiltradas = vagas.filter((vaga) => {
    const filtroTipoOk = filtroTipo === 'TODAS' || vaga.tipo === filtroTipo;
    const filtroStatusOk =
      filtroStatus === 'TODAS' ||
      (filtroStatus === 'OCUPADAS' && vaga.ocupada) ||
      (filtroStatus === 'LIVRES' && !vaga.ocupada);

    return filtroTipoOk && filtroStatusOk;
  });

  const estatisticas = {
    total: vagas.length,
    ocupadas: vagas.filter((vaga) => vaga.ocupada).length,
    livres: vagas.filter((vaga) => !vaga.ocupada).length,
    cobertas: vagas.filter((vaga) => vaga.tipo === 'COBERTA').length,
    descobertas: vagas.filter((vaga) => vaga.tipo === 'DESCOBERTA').length,
    deficientes: vagas.filter((vaga) => vaga.tipo === 'DEFICIENTE').length,
    idosos: vagas.filter((vaga) => vaga.tipo === 'IDOSO').length,
    visitantes: vagas.filter((vaga) => vaga.tipo === 'VISITANTE').length,
  };

  if (carregando) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vagas de Estacionamento</h1>
            <p className="text-gray-600">Gerencie as vagas de estacionamento do condominio</p>
          </div>
          <Button
            onClick={() => {
              setVagaEditando(null);
              setModalAberto(true);
            }}
            className="flex items-center gap-2"
            disabled={!condominioSelecionado}
          >
            <Plus className="h-4 w-4" />
            Nova Vaga
          </Button>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Selecionar Condominio</h2>
          <select
            value={condominioSelecionado}
            onChange={(event) => setCondominioSelecionado(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecione um condominio</option>
            {condominios.map((condominio) => (
              <option key={condominio.id} value={condominio.id}>
                {condominio.nome}
              </option>
            ))}
          </select>
        </div>

        {condominioSelecionado && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Ocupadas</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.ocupadas}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Livres</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.livres}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Cobertas</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.cobertas}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Descobertas</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.descobertas}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-indigo-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">PCD</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.deficientes}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {condominioSelecionado && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Filtros</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={filtroTipo}
                  onChange={(event) => setFiltroTipo(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="TODAS">Todas</option>
                  <option value="COBERTA">Cobertas</option>
                  <option value="DESCOBERTA">Descobertas</option>
                  <option value="DEFICIENTE">PCD</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(event) => setFiltroStatus(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="TODAS">Todas</option>
                  <option value="OCUPADAS">Ocupadas</option>
                  <option value="LIVRES">Livres</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {condominioSelecionado && (
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">
                Vagas Cadastradas ({vagasFiltradas.length})
              </h2>
            </div>

            {vagasFiltradas.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Car className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {vagas.length === 0
                    ? 'Nenhuma vaga cadastrada'
                    : 'Nenhuma vaga encontrada com os filtros aplicados'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {vagas.length === 0
                    ? 'Comece criando a primeira vaga do condominio.'
                    : 'Tente ajustar os filtros para ver mais resultados.'}
                </p>
                {vagas.length === 0 && (
                  <div className="mt-6">
                    <Button
                      onClick={() => {
                        setVagaEditando(null);
                        setModalAberto(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Nova Vaga
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {vagasFiltradas.map((vaga) => (
                  <div key={vaga.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Car
                          className={`h-8 w-8 ${
                            vaga.ocupada ? 'text-red-600' : 'text-green-600'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Vaga {vaga.numero}</h3>
                        <p className="text-sm text-gray-500">
                          {vaga.tipo} • {vaga.ocupada ? 'Ocupada' : 'Livre'}
                          {vaga.unidade &&
                            ` • Unidade ${vaga.unidade.numero} (${vaga.unidade.torre.nome})`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setVagaEditando(vaga);
                          setModalAberto(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVagaTransferindo(vaga)}
                        title="Transferir vaga"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExcluirVaga(vaga.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <VagaModal
          isOpen={modalAberto}
          onClose={() => {
            setModalAberto(false);
            setVagaEditando(null);
          }}
          onSave={handleSalvarVaga}
          vaga={vagaEditando}
          condominios={condominios}
          selectedCondominioId={condominioSelecionado}
        />
        <TransferirVagaModal
          isOpen={!!vagaTransferindo}
          vaga={vagaTransferindo}
          onClose={() => setVagaTransferindo(null)}
          onTransferir={handleTransferirVaga}
        />
      </div>
    </Layout>
  );
}
