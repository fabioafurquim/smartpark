'use client';

import { useState, useEffect } from 'react';
import { Car, Plus, Search, Edit, Trash2, Building2, MapPin } from 'lucide-react';
import VagaModal from '@/components/modals/VagaModal';
import Link from 'next/link';
import { Layout } from '@/components';
import { Button } from '@/components/ui';

interface Vaga {
  id: string;
  numero: string;
  tipo: 'COBERTA' | 'DESCOBERTA' | 'DEFICIENTE' | 'IDOSO' | 'VISITANTE';
  ocupada: boolean;
  condominioId?: string;
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

/**
 * Página de gerenciamento de vagas de estacionamento
 */
export default function VagasPage() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [condominioSelecionado, setCondominioSelecionado] = useState<string>('');
  const [condominios, setCondominios] = useState<{id: string, nome: string}[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODAS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [modalAberto, setModalAberto] = useState(false);
  const [vagaEditando, setVagaEditando] = useState<Vaga | null>(null);

  useEffect(() => {
    const carregarCondominios = async () => {
      try {
        const response = await fetch('/api/condominios');
        if (response.ok) {
          const dados = await response.json();
          console.log('📦 Dados da API de condomínios:', dados);
          // Acessar dados.condominios corretamente da estrutura da API
          const condominiosList = dados.condominios || [];
          console.log('🏢 Condomínios carregados:', condominiosList);
          setCondominios(condominiosList);
          // Não selecionar automaticamente - deixar o usuário escolher
        } else {
          console.error('Erro ao carregar condomínios:', response.status);
        }
      } catch (error) {
        console.error('Erro ao carregar condomínios:', error);
      }
    };

    carregarCondominios();
  }, []);

  // Função para salvar vaga (criar ou editar)
  const handleSalvarVaga = async (dadosVaga: VagaFormData) => {
    setSalvando(true);
    try {
      const condominioId = dadosVaga.condominioId ?? condominioSelecionado;

      if (!condominioId) {
        console.error('Nenhum condomínio selecionado para salvar a vaga.');
        alert('Selecione um condomínio antes de salvar a vaga.');
        return;
      }

      const url = vagaEditando ? `/api/vagas/${vagaEditando.id}` : '/api/vagas';
      const method = vagaEditando ? 'PUT' : 'POST';
      
      // Construir payload, excluindo proprietarioId se vazio
      const payload: any = {
        numero: dadosVaga.numero,
        tipo: dadosVaga.tipo,
        unidadeId: dadosVaga.unidadeId,
        condominioId,
      };
      
      // Apenas incluir proprietarioId se fornecido
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

      if (response.ok) {
        const vagasResponse = await fetch(`/api/vagas?condominioId=${condominioId}`);
        if (vagasResponse.ok) {
          const vagasData = await vagasResponse.json();
          setVagas(vagasData);
        }

        setModalAberto(false);
        setVagaEditando(null);
        alert('Vaga salva com sucesso!');
      } else {
        let mensagem = 'Erro ao salvar vaga';
        try {
          const erro = await response.json();
          mensagem = erro?.error || erro?.erro || erro?.message || mensagem;
          if (erro?.details) {
            console.error('Detalhes do erro:', erro.details);
          }
        } catch (parseError) {
          console.error('Falha ao ler resposta de erro ao salvar vaga:', parseError);
        }

        console.error('Erro ao salvar vaga:', {
          status: response.status,
          mensagem,
          payload,
        });
        alert(`Erro ao salvar vaga: ${mensagem}`);
      }
    } catch (error) {
      console.error('Erro ao salvar vaga:', error);
      alert('Erro ao salvar vaga. Verifique os dados e tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // Função para excluir vaga
  const handleExcluirVaga = async (vagaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta vaga?')) return;
    
    try {
      const response = await fetch(`/api/vagas/${vagaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Recarregar vagas
        const vagasResponse = await fetch(`/api/vagas?condominioId=${condominioSelecionado}`);
        if (vagasResponse.ok) {
          const vagasData = await vagasResponse.json();
          setVagas(vagasData);
        }
      } else {
        console.error('Erro ao excluir vaga');
      }
    } catch (error) {
      console.error('Erro ao excluir vaga:', error);
    }
  };

  // Função para abrir modal de nova vaga
  const handleNovaVaga = () => {
    setVagaEditando(null);
    setModalAberto(true);
  };

  // Função para abrir modal de edição
  const handleEditarVaga = (vaga: Vaga) => {
    setVagaEditando(vaga);
    setModalAberto(true);
  };

  useEffect(() => {
    if (!condominioSelecionado) {
      setCarregando(false);
      setVagas([]);
      return;
    }

    const carregarVagas = async () => {
      try {
        setCarregando(true);
        const response = await fetch(`/api/vagas?condominioId=${condominioSelecionado}`);
        if (response.ok) {
          const dados = await response.json();
          setVagas(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar vagas:', error);
      } finally {
        setCarregando(false);
      }
    };

    carregarVagas();
  }, [condominioSelecionado]);

  const vagasFiltradas = vagas.filter(vaga => {
    const filtroTipoOk = filtroTipo === 'TODAS' || vaga.tipo === filtroTipo;
    const filtroStatusOk = filtroStatus === 'TODAS' || 
      (filtroStatus === 'OCUPADAS' && vaga.ocupada) ||
      (filtroStatus === 'LIVRES' && !vaga.ocupada);
    return filtroTipoOk && filtroStatusOk;
  });

  const estatisticas = {
    total: vagas.length,
    ocupadas: vagas.filter(v => v.ocupada).length,
    livres: vagas.filter(v => !v.ocupada).length,
    cobertas: vagas.filter(v => v.tipo === 'COBERTA').length,
    descobertas: vagas.filter(v => v.tipo === 'DESCOBERTA').length,
    deficientes: vagas.filter(v => v.tipo === 'DEFICIENTE').length,
    idosos: vagas.filter(v => v.tipo === 'IDOSO').length,
    visitantes: vagas.filter(v => v.tipo === 'VISITANTE').length,
  };

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vagas de Estacionamento</h1>
            <p className="text-gray-600">Gerencie as vagas de estacionamento do condomínio</p>
          </div>
          <Button 
            onClick={handleNovaVaga}
            className="flex items-center gap-2" 
            disabled={!condominioSelecionado}
          >
            <Plus className="h-4 w-4" />
            Nova Vaga
          </Button>
        </div>

        {/* Seleção de Condomínio */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Selecionar Condomínio</h2>
          <select
            value={condominioSelecionado}
            onChange={(e) => setCondominioSelecionado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecione um condomínio</option>
            {condominios.map((condominio) => (
              <option key={condominio.id} value={condominio.id}>
                {condominio.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Estatísticas */}
        {condominioSelecionado && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Ocupadas</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.ocupadas}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Livres</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.livres}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Cobertas</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.cobertas}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Descobertas</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.descobertas}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
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

        {/* Filtros */}
        {condominioSelecionado && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="TODAS">Todas</option>
                  <option value="COBERTA">Cobertas</option>
                  <option value="DESCOBERTA">Descobertas</option>
                  <option value="DEFICIENTE">PCD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="TODAS">Todas</option>
                  <option value="OCUPADAS">Ocupadas</option>
                  <option value="LIVRES">Livres</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Vagas */}
        {condominioSelecionado && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Vagas Cadastradas ({vagasFiltradas.length})
              </h2>
            </div>
            
            {vagasFiltradas.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Car className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {vagas.length === 0 ? 'Nenhuma vaga cadastrada' : 'Nenhuma vaga encontrada com os filtros aplicados'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {vagas.length === 0 
                    ? 'Comece criando a primeira vaga do condomínio.'
                    : 'Tente ajustar os filtros para ver mais resultados.'
                  }
                </p>
                {vagas.length === 0 && (
                  <div className="mt-6">
                    <Button 
                      onClick={handleNovaVaga}
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
                  <div key={vaga.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Car className={`h-8 w-8 ${
                          vaga.ocupada ? 'text-red-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Vaga {vaga.numero}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {vaga.tipo} • {vaga.ocupada ? 'Ocupada' : 'Livre'}
                          {vaga.unidade && ` • Unidade ${vaga.unidade.numero} (${vaga.unidade.torre.nome})`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditarVaga(vaga)}
                      >
                        <Edit className="h-4 w-4" />
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

        {/* Modal de Vaga */}
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
      </div>
    </Layout>
  );
}