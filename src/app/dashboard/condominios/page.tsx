'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  UsersIcon,
  Square3Stack3DIcon
} from '@heroicons/react/24/outline';
import { Layout } from '@/components/Layout';

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  criadoEm: string;
  _count: {
    torres: number;
    usuarios: number;
    vagas: number;
  };
}

interface ApiResponse {
  condominios: Condominio[];
  total: number;
  pagina: number;
  totalPaginas: number;
  error?: string;
}

export default function CondominiosPage() {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCondominios = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        pagina: paginaAtual.toString(),
        limite: '10',
        ...(busca && { busca }),
        ...(filtroAtivo !== 'todos' && { ativo: (filtroAtivo === 'ativo').toString() })
      });

      const response = await fetch(`/api/condominios?${params}`);
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar condomínios');
      }

      setCondominios(data.condominios);
      setTotal(data.total);
      setTotalPaginas(data.totalPaginas);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCondominios();
  }, [paginaAtual, busca, filtroAtivo]);

  const handleDelete = async (id: string, nome: string) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o condomínio "${nome}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/condominios/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir condomínio');
      }

      // Recarregar a lista
      fetchCondominios();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao excluir condomínio');
    }
  };

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value);
    setPaginaAtual(1); // Reset para primeira página ao buscar
  };

  const handleFiltroChange = (filtro: 'todos' | 'ativo' | 'inativo') => {
    setFiltroAtivo(filtro);
    setPaginaAtual(1); // Reset para primeira página ao filtrar
  };

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Condomínios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os condomínios do sistema
          </p>
        </div>
        <Link
          href="/dashboard/condominios/novo"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Novo Condomínio
        </Link>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={busca}
                onChange={handleBuscaChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Filtro de Status */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'ativo', label: 'Ativos' },
              { key: 'inativo', label: 'Inativos' }
            ].map((filtro) => (
              <button
                key={filtro.key}
                onClick={() => handleFiltroChange(filtro.key as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filtroAtivo === filtro.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">{error}</div>
          <button
            onClick={fetchCondominios}
            className="mt-2 text-sm text-blue-600 hover:text-blue-500"
          >
            Tentar novamente
          </button>
        </div>
      ) : condominios.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {busca || filtroAtivo !== 'todos' ? 'Nenhum condomínio encontrado' : 'Nenhum condomínio cadastrado'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {busca || filtroAtivo !== 'todos' 
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando seu primeiro condomínio.'
            }
          </p>
          {(!busca && filtroAtivo === 'todos') && (
            <div className="mt-6">
              <Link
                href="/dashboard/condominios/novo"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Novo Condomínio
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Lista de Condomínios */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {condominios.map((condominio) => (
                <li key={condominio.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {condominio.nome}
                              </p>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  condominio.ativo
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {condominio.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {condominio.endereco}
                            </p>
                            {(condominio.telefone || condominio.email) && (
                              <p className="text-sm text-gray-500">
                                {[condominio.telefone, condominio.email].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Estatísticas */}
                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <BuildingOfficeIcon className="h-4 w-4" />
                            <span>{condominio._count.torres} torres</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <UsersIcon className="h-4 w-4" />
                            <span>{condominio._count.usuarios} usuários</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Square3Stack3DIcon className="h-4 w-4" />
                            <span>{condominio._count.vagas} vagas</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Ações */}
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/condominios/${condominio.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                          title="Visualizar"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/condominios/${condominio.id}/editar`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(condominio.id, condominio.nome)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                          title="Excluir"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                  disabled={paginaAtual === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">{((paginaAtual - 1) * 10) + 1}</span>
                    {' '}até{' '}
                    <span className="font-medium">
                      {Math.min(paginaAtual * 10, total)}
                    </span>
                    {' '}de{' '}
                    <span className="font-medium">{total}</span>
                    {' '}resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                      disabled={paginaAtual === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    
                    {/* Números das páginas */}
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let pageNum;
                      if (totalPaginas <= 5) {
                        pageNum = i + 1;
                      } else if (paginaAtual <= 3) {
                        pageNum = i + 1;
                      } else if (paginaAtual >= totalPaginas - 2) {
                        pageNum = totalPaginas - 4 + i;
                      } else {
                        pageNum = paginaAtual - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPaginaAtual(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === paginaAtual
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                      disabled={paginaAtual === totalPaginas}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </Layout>
  );
}