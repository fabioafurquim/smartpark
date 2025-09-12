'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Edit, Trash2 } from 'lucide-react';
import TorreModal from '@/components/modals/TorreModal';

interface Torre {
  id: string;
  nome: string;
  tipo: 'TORRE' | 'BLOCO';
  totalUnidades: number;
  condominioId: string;
  condominio: {
    id: string;
    nome: string;
  };
  createdAt: string;
}

interface Condominio {
  id: string;
  nome: string;
}

interface TorreFormData {
  nome: string;
  tipo: 'TORRE' | 'BLOCO';
  condominioId: string;
}

export default function TorresPage() {
  const [torres, setTorres] = useState<Torre[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [selectedCondominio, setSelectedCondominio] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTorre, setEditingTorre] = useState<Torre | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchCondominios();
  }, []);

  useEffect(() => {
    if (selectedCondominio) {
      fetchTorres();
    } else {
      setTorres([]);
    }
  }, [selectedCondominio]);

  const fetchCondominios = async () => {
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
  };

  const fetchTorres = async () => {
    if (!selectedCondominio) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/torres?condominioId=${selectedCondominio}`);
      if (response.ok) {
        const data = await response.json();
        setTorres(data);
      } else {
        setError('Erro ao carregar torres');
      }
    } catch (error) {
      console.error('Erro ao carregar torres:', error);
      setError('Erro ao carregar torres');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTorre = async (formData: TorreFormData) => {
    try {
      const url = editingTorre ? `/api/torres/${editingTorre.id}` : '/api/torres';
      const method = editingTorre ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTorres();
        setError('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar torre');
      }
    } catch (error) {
      console.error('Erro ao salvar torre:', error);
      setError(error instanceof Error ? error.message : 'Erro ao salvar torre');
      throw error;
    }
  };

  const handleDeleteTorre = async (torre: Torre) => {
    if (!confirm(`Tem certeza que deseja excluir a ${torre.tipo.toLowerCase()} "${torre.nome}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/torres/${torre.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTorres();
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao excluir torre');
      }
    } catch (error) {
      console.error('Erro ao excluir torre:', error);
      setError('Erro ao excluir torre');
    }
  };

  const openCreateModal = () => {
    setEditingTorre(null);
    setIsModalOpen(true);
  };

  const openEditModal = (torre: Torre) => {
    setEditingTorre(torre);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTorre(null);
  };

  const filteredTorres = torres.filter(torre =>
    torre.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Torres e Blocos</h1>
        <p className="text-gray-600">Gerencie as torres e blocos do condomínio</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Seleção de Condomínio */}
          <div>
            <label htmlFor="condominio" className="block text-sm font-medium text-gray-700 mb-1">
              Condomínio
            </label>
            <select
              id="condominio"
              value={selectedCondominio}
              onChange={(e) => setSelectedCondominio(e.target.value)}
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
                placeholder="Buscar por nome..."
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
              Nova Torre/Bloco
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Torres */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando torres...</p>
        </div>
      ) : filteredTorres.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedCondominio ? 'Nenhuma torre encontrada' : 'Selecione um condomínio'}
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedCondominio 
              ? 'Não há torres cadastradas para este condomínio.' 
              : 'Selecione um condomínio para visualizar suas torres e blocos.'
            }
          </p>
          {selectedCondominio && (
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2 inline" />
              Adicionar Primeira Torre/Bloco
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
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condomínio
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTorres.map((torre) => (
                  <tr key={torre.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {torre.nome}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        torre.tipo === 'TORRE' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {torre.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {torre.totalUnidades} unidades
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {torre.condominio.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(torre)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTorre(torre)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Excluir"
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
      <TorreModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveTorre}
        torre={editingTorre}
        condominios={condominios}
        selectedCondominioId={selectedCondominio}
      />
    </div>
  );
}