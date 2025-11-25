'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Users, Plus, Search, Edit, Trash2, Mail, CheckCircle, XCircle } from 'lucide-react';
import { Layout } from '@/components';
import { Button } from '@/components/ui';

// Importar modal dinamicamente para evitar problemas de compilação
const UsuarioModal = dynamic(() => import('@/components/modals/UsuarioModal'), { ssr: false });

interface Perfil {
  id: string;
  tipo: 'administrador_mestre' | 'administrador_condominio' | 'sindico' | 'morador';
  ativo: boolean;
  condominio?: {
    id: string;
    nome: string;
  };
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  perfis: Perfil[];
  criadoEm: string;
}

interface UsuarioFormData {
  nome: string;
  email: string;
  senha?: string;
  perfis: Array<{
    condominioId: string;
    tipo: 'administrador_mestre' | 'administrador_condominio' | 'sindico' | 'morador';
    ativo?: boolean;
  }>;
}

/**
 * Página de gerenciamento de usuários
 */
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      let url = '/api/admin/usuarios';
      const params = new URLSearchParams();
      
      if (busca) {
        params.append('busca', busca);
      }
      
      if (filtroTipo !== 'TODOS') {
        params.append('tipo', filtroTipo);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url);
      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao carregar usuários');
      }
      
      const dados = await response.json();
      setUsuarios(Array.isArray(dados) ? dados : []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
      setUsuarios([]);
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarUsuario = async (dadosUsuario: UsuarioFormData) => {
    setSalvando(true);
    try {
      const url = usuarioEditando ? `/api/admin/usuarios/${usuarioEditando.id}` : '/api/admin/usuarios';
      const method = usuarioEditando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosUsuario),
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao salvar usuário');
      }

      await carregarUsuarios();
      setModalAberto(false);
      setUsuarioEditando(null);
      alert('Usuário salvo com sucesso!');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
      alert(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirUsuario = async (usuarioId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      const response = await fetch(`/api/admin/usuarios/${usuarioId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao excluir usuário');
      }

      await carregarUsuarios();
      alert('Usuário excluído com sucesso!');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
      alert(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const getTipoPerfil = (tipo: string) => {
    const tipos: Record<string, string> = {
      'administrador_mestre': 'Admin Mestre',
      'administrador_condominio': 'Admin Condomínio',
      'sindico': 'Síndico',
      'morador': 'Morador',
    };
    return tipos[tipo] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'administrador_mestre':
        return 'bg-red-100 text-red-800';
      case 'administrador_condominio':
        return 'bg-blue-100 text-blue-800';
      case 'sindico':
        return 'bg-purple-100 text-purple-800';
      case 'morador':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchBusca = usuario.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       usuario.email.toLowerCase().includes(busca.toLowerCase());
    return matchBusca;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
            </div>
            <p className="text-gray-600 mt-2">Cadastre e gerencie usuários do sistema</p>
          </div>
          <Button
            onClick={() => {
              setUsuarioEditando(null);
              setModalAberto(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Novo Usuário
          </Button>
        </div>

        {/* Erro */}
        {erro && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{erro}</p>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome ou email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Perfil
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos</option>
                <option value="administrador_mestre">Admin Mestre</option>
                <option value="administrador_condominio">Admin Condomínio</option>
                <option value="sindico">Síndico</option>
                <option value="morador">Morador</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={carregarUsuarios}
                variant="outline"
              >
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {carregando ? (
            <div className="p-8 text-center text-gray-600">
              Carregando usuários...
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              Nenhum usuário encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Perfis
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{usuario.nome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          {usuario.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {usuario.perfis.map((perfil) => (
                            <div key={perfil.id} className="space-y-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(perfil.tipo)}`}>
                                {getTipoPerfil(perfil.tipo)}
                              </span>
                              {perfil.condominio && (
                                <p className="text-xs text-gray-600">
                                  {perfil.condominio.nome}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {usuario.perfis.some(p => p.ativo) ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="text-sm text-green-600">Ativo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-600" />
                              <span className="text-sm text-red-600">Inativo</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setUsuarioEditando(usuario);
                              setModalAberto(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleExcluirUsuario(usuario.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total de Usuários</p>
            <p className="text-2xl font-bold text-gray-900">{usuarios.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Ativos</p>
            <p className="text-2xl font-bold text-green-600">
              {usuarios.filter(u => u.perfis.some(p => p.ativo)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Admins Mestres</p>
            <p className="text-2xl font-bold text-red-600">
              {usuarios.filter(u => u.perfis.some(p => p.tipo === 'administrador_mestre')).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Moradores</p>
            <p className="text-2xl font-bold text-green-600">
              {usuarios.filter(u => u.perfis.some(p => p.tipo === 'morador')).length}
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      <UsuarioModal
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setUsuarioEditando(null);
        }}
        onSave={handleSalvarUsuario}
        usuario={usuarioEditando}
      />
    </Layout>
  );
}
