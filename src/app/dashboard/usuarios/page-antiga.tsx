'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Layout } from '@/components';
import { Button } from '@/components/ui';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    perfis: [{ condominioId: '', tipo: 'morador', ativo: true }]
  });
  const [condominios, setCondominios] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarUsuarios();
    carregarCondominios();
  }, []);

  const carregarCondominios = async () => {
    try {
      const response = await fetch('/api/admin/condominios');
      if (response.ok) {
        const dados = await response.json();
        // A API retorna um array diretamente
        setCondominios(Array.isArray(dados) ? dados : dados.condominios || []);
      }
    } catch (err) {
      console.error('Erro ao carregar condomínios:', err);
    }
  };

  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      const response = await fetch('/api/admin/usuarios');
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }
      
      const dados = await response.json();
      setUsuarios(Array.isArray(dados) ? dados : []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalNovoUsuario = () => {
    setUsuarioEditando(null);
    setFormData({
      nome: '',
      email: '',
      senha: '',
      perfis: [{ condominioId: '', tipo: 'morador', ativo: true }]
    });
    setModalAberto(true);
  };

  const salvarUsuario = async () => {
    if (!formData.nome || !formData.email || !formData.senha) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao salvar usuário');
      }

      await carregarUsuarios();
      setModalAberto(false);
      alert('Usuário criado com sucesso!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  };

  const deletarUsuario = async (usuarioId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      const response = await fetch(`/api/admin/usuarios/${usuarioId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao deletar usuário');
      }

      await carregarUsuarios();
      alert('Usuário deletado com sucesso!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
            </div>
            <p className="text-gray-600 mt-2">Cadastre e gerencie usuários do sistema</p>
          </div>
          <Button 
            onClick={abrirModalNovoUsuario}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Novo Usuário
          </Button>
        </div>

        {erro && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{erro}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {carregando ? (
            <div className="p-8 text-center text-gray-600">
              Carregando usuários...
            </div>
          ) : usuarios.length === 0 ? (
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
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{usuario.nome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600">{usuario.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {usuario.perfis?.map((perfil: any) => (
                            <span key={perfil.id} className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {perfil.tipo}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => alert('Editar ainda não implementado')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => deletarUsuario(usuario.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deletar"
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total de Usuários</p>
            <p className="text-2xl font-bold text-gray-900">{usuarios.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Ativos</p>
            <p className="text-2xl font-bold text-green-600">
              {usuarios.filter(u => u.perfis?.some((p: any) => p.ativo)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Admins Mestres</p>
            <p className="text-2xl font-bold text-red-600">
              {usuarios.filter(u => u.perfis?.some((p: any) => p.tipo === 'administrador_mestre')).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Moradores</p>
            <p className="text-2xl font-bold text-green-600">
              {usuarios.filter(u => u.perfis?.some((p: any) => p.tipo === 'morador')).length}
            </p>
          </div>
        </div>

        {/* Modal */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Novo Usuário</h2>
                <button
                  onClick={() => setModalAberto(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha *
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condomínio *
                  </label>
                  <select
                    value={formData.perfis[0]?.condominioId || ''}
                    onChange={(e) => {
                      const newPerfis = [...formData.perfis];
                      newPerfis[0].condominioId = e.target.value;
                      setFormData({ ...formData, perfis: newPerfis });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um condomínio</option>
                    {condominios.map((cond) => (
                      <option key={cond.id} value={cond.id}>
                        {cond.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Perfil *
                  </label>
                  <select
                    value={formData.perfis[0]?.tipo || 'morador'}
                    onChange={(e) => {
                      const newPerfis = [...formData.perfis];
                      newPerfis[0].tipo = e.target.value;
                      setFormData({ ...formData, perfis: newPerfis });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="morador">Morador</option>
                    <option value="sindico">Síndico</option>
                    <option value="administrador_condominio">Admin Condomínio</option>
                    <option value="administrador_mestre">Admin Mestre</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarUsuario}
                  disabled={salvando}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
