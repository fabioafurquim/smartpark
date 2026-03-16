'use client';

import { useCallback, useEffect, useState } from 'react';
import { Home, Plus, Search, Edit, Trash2, Building2, ArrowRightLeft } from 'lucide-react';
import UnidadeModal from '@/components/modals/UnidadeModal';
import TransferirMoradorModal from '@/components/modals/TransferirMoradorModal';
import { Layout } from '@/components/Layout';

interface Unidade {
  id: string;
  numero: string;
  andar: number;
  tipo: 'APARTAMENTO' | 'COBERTURA' | 'LOJA' | 'SALA_COMERCIAL';
  proprietario?: string;
  contato?: string;
  torreId: string;
  condominioId: string;
  usuarioId?: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
  torre: {
    id: string;
    nome: string;
    tipo: 'TORRE' | 'BLOCO';
  };
  condominio: {
    id: string;
    nome: string;
  };
  totalVagas?: number;
}

interface Condominio {
  id: string;
  nome: string;
}

interface Torre {
  id: string;
  nome: string;
  tipo: 'TORRE' | 'BLOCO';
}

interface UnidadeFormData {
  numero: string;
  andar: number;
  tipo: 'APARTAMENTO' | 'COBERTURA' | 'LOJA' | 'SALA_COMERCIAL';

  proprietario?: string;
  contato?: string;
  torreId: string;
  condominioId: string;
}

const extrairMensagemErro = (errorData: unknown, fallback: string) => {
  if (!errorData || typeof errorData !== 'object') {
    return fallback;
  }

  const payload = errorData as { error?: string; details?: string };
  return payload.details || payload.error || fallback;
};

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [torres, setTorres] = useState<Torre[]>([]);
  const [selectedCondominio, setSelectedCondominio] = useState<string>('');
  const [selectedTorre, setSelectedTorre] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [transferindoUnidade, setTransferindoUnidade] = useState<Unidade | null>(null);
  const [error, setError] = useState<string>('');

  const fetchCondominios = useCallback(async () => {
    try {
      const response = await fetch('/api/condominios');
      if (response.ok) {
        const data = await response.json();
        setCondominios(data.condominios || []);
        if (data.condominios && data.condominios.length > 0) {
          setSelectedCondominio(data.condominios[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
      setError('Erro ao carregar condomínios');
    }
  }, []);

  const fetchTorres = useCallback(async () => {
    if (!selectedCondominio) return;
    
    try {
      const response = await fetch(`/api/torres?condominioId=${selectedCondominio}`);
      if (response.ok) {
        const data = await response.json();
        setTorres(data);
      }
    } catch (error) {
      console.error('Erro ao carregar torres:', error);
      setError('Erro ao carregar torres');
    }
  }, [selectedCondominio]);

  const fetchUnidades = useCallback(async () => {
    if (!selectedCondominio) return;
    
    setIsLoading(true);
    try {
      let url = `/api/unidades?condominioId=${selectedCondominio}`;
      if (selectedTorre) {
        url += `&torreId=${selectedTorre}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setUnidades(data);
      } else {
        setError('Erro ao carregar unidades');
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      setError('Erro ao carregar unidades');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCondominio, selectedTorre]);

  useEffect(() => {
    fetchCondominios();
  }, [fetchCondominios]);

  useEffect(() => {
    if (selectedCondominio) {
      fetchTorres();
      fetchUnidades();
    } else {
      setTorres([]);
      setUnidades([]);
    }
  }, [fetchTorres, fetchUnidades, selectedCondominio]);

  useEffect(() => {
    if (selectedCondominio) {
      fetchUnidades();
    }
  }, [fetchUnidades, selectedCondominio, selectedTorre]);

  const handleSaveUnidade = async (formData: UnidadeFormData) => {
    try {
      const url = editingUnidade ? `/api/unidades/${editingUnidade.id}` : '/api/unidades';
      const method = editingUnidade ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUnidades();
        setError('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar unidade');
      }
    } catch (error) {
      console.error('Erro ao salvar unidade:', error);
      setError(error instanceof Error ? error.message : 'Erro ao salvar unidade');
      throw error;
    }
  };

  const handleDeleteUnidade = async (unidade: Unidade) => {
    if (unidade.usuario || (unidade.totalVagas || 0) > 0) {
      setError(
        (unidade.totalVagas || 0) > 0
          ? `A unidade "${unidade.numero}" não pode ser excluída porque ainda possui ${unidade.totalVagas} vaga(s) vinculada(s).`
          : `A unidade "${unidade.numero}" não pode ser excluída porque ainda possui um morador associado.`
      );
      return;
    }

    if (
      !confirm(
        `Excluir a unidade "${unidade.numero}"? Esta ação é permanente e pode ser bloqueada caso exista histórico vinculado.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/unidades/${unidade.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUnidades();
        setError('');
      } else {
        const errorData = await response.json();
        const mensagem = extrairMensagemErro(errorData, 'Erro ao excluir unidade');
        setError(mensagem);
      }
    } catch (error) {
      console.error('Erro ao excluir unidade:', error);
      setError('Erro ao excluir unidade');
    }
  };

  const openCreateModal = () => {
    setEditingUnidade(null);
    setIsModalOpen(true);
  };

  const openEditModal = (unidade: Unidade) => {
    setEditingUnidade(unidade);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUnidade(null);
  };

  const handleTransferirMorador = async (usuarioId: string) => {
    if (!transferindoUnidade) {
      return;
    }

    const response = await fetch(`/api/unidades/${transferindoUnidade.id}/transferir-morador`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usuarioId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao transferir morador');
    }

    await fetchUnidades();
    setTransferindoUnidade(null);
    setError('');
  };

  const filteredUnidades = unidades.filter(unidade =>
    unidade.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (unidade.proprietario && unidade.proprietario.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'APARTAMENTO':
        return 'bg-blue-100 text-blue-800';
      case 'COBERTURA':
        return 'bg-purple-100 text-purple-800';
      case 'LOJA':
        return 'bg-green-100 text-green-800';
      case 'SALA_COMERCIAL':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unidades</h1>
        <p className="text-gray-600">Gerencie as unidades do condomínio</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded mb-4 text-sm">
        Unidades com morador associado, vagas vinculadas ou histórico operacional não podem ser excluídas.
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Seleção de Condomínio */}
          <div>
            <label htmlFor="condominio" className="block text-sm font-medium text-gray-700 mb-1">
              Condomínio
            </label>
            <select
              id="condominio"
              value={selectedCondominio}
              onChange={(e) => {
                setSelectedCondominio(e.target.value);
                setSelectedTorre(''); // Reset torre selection
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um condomínio</option>
              {condominios.map((condominio) => (
                <option key={condominio.id} value={condominio.id}>
                  {condominio.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seleção de Torre */}
          <div>
            <label htmlFor="torre" className="block text-sm font-medium text-gray-700 mb-1">
              Torre/Bloco
            </label>
            <select
              id="torre"
              value={selectedTorre}
              onChange={(e) => setSelectedTorre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!selectedCondominio}
            >
              <option value="">Todas as torres/blocos</option>
              {torres.map((torre) => (
                <option key={torre.id} value={torre.id}>
                  {torre.nome} ({torre.tipo})
                </option>
              ))}
            </select>
          </div>

          {/* Busca */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por número ou proprietário..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Botão Adicionar */}
          <div className="flex items-end">
            <button
              onClick={openCreateModal}
              disabled={!selectedCondominio}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Unidade
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Unidades */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando unidades...</p>
        </div>
      ) : filteredUnidades.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedCondominio ? 'Nenhuma unidade encontrada' : 'Selecione um condomínio'}
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedCondominio 
              ? 'Não há unidades cadastradas para este condomínio.' 
              : 'Selecione um condomínio para visualizar suas unidades.'
            }
          </p>
          {selectedCondominio && (
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2 inline" />
              Adicionar Primeira Unidade
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Torre/Bloco
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proprietário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Morador Associado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnidades.map((unidade) => (
                  <tr key={unidade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Home className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {unidade.numero}
                          </div>
                          <div className="text-sm text-gray-500">
                            {unidade.andar === 0 ? 'Térreo' : `${unidade.andar}º andar`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(unidade.tipo)}`}>
                        {unidade.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">{unidade.torre.nome}</div>
                          <div className="text-sm text-gray-500">{unidade.torre.tipo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unidade.proprietario || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unidade.contato || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {unidade.usuario ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{unidade.usuario.nome}</span>
                          <span className="text-xs text-gray-500">{unidade.usuario.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(unidade)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setTransferindoUnidade(unidade)}
                          className="text-amber-600 hover:text-amber-900 p-1 rounded"
                          title="Transferir morador"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUnidade(unidade)}
                          className="text-red-600 hover:text-red-900 p-1 rounded disabled:text-gray-300 disabled:hover:text-gray-300 disabled:cursor-not-allowed"
                          title={
                            (unidade.totalVagas || 0) > 0
                              ? 'Remova primeiro as vagas vinculadas'
                              : unidade.usuario
                                ? 'Remova primeiro o morador associado'
                                : 'Excluir'
                          }
                          disabled={Boolean(unidade.usuario) || (unidade.totalVagas || 0) > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <UnidadeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveUnidade}
        unidade={editingUnidade}
        condominios={condominios}
        selectedCondominioId={selectedCondominio}
      />
      <TransferirMoradorModal
        isOpen={!!transferindoUnidade}
        unidade={transferindoUnidade}
        condominioId={selectedCondominio}
        onClose={() => setTransferindoUnidade(null)}
        onTransferir={handleTransferirMorador}
      />
      </div>
    </Layout>
  );
}
