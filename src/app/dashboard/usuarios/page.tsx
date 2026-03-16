'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Plus, Edit, Trash2, Search } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Layout } from '@/components';
import { Button } from '@/components/ui';

export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const usuario = session?.user as any;

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

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroCondominio, setFiltroCondominio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Verificar permissões
  const temAcesso = useMemo(() => {
    if (!usuario) return false;
    const perfis = usuario.perfis || [];
    return perfis.some((p: any) => 
      p.tipo === 'administrador_mestre' || 
      p.tipo === 'administrador_condominio' ||
      p.tipo === 'sindico'
    );
  }, [usuario]);

  const getCondominiosDisponiveis = () => {
    if (!usuario) return [];
    const perfis = usuario.perfis || [];
    
    // Admin mestre pode ver todos
    if (perfis.some((p: any) => p.tipo === 'administrador_mestre')) {
      return condominios;
    }
    
    // Admin condomínio e síndico só veem seu condomínio
    const condominiosDoUsuario = perfis
      .filter((p: any) => p.tipo === 'administrador_condominio' || p.tipo === 'sindico')
      .map((p: any) => p.condominioId);
    
    return condominios.filter(c => condominiosDoUsuario.includes(c.id));
  };

  const podeEditarUsuario = (usuarioAlvo: any) => {
    if (!usuario) return false;
    const perfisUsuario = usuario.perfis || [];
    
    // Admin mestre pode editar qualquer um
    if (perfisUsuario.some((p: any) => p.tipo === 'administrador_mestre')) {
      return true;
    }
    
    // Admin condomínio e síndico só podem editar usuários do seu condomínio
    const condominiosDoUsuario = perfisUsuario
      .filter((p: any) => p.tipo === 'administrador_condominio' || p.tipo === 'sindico')
      .map((p: any) => p.condominioId);
    
    return usuarioAlvo.perfis?.some((p: any) => condominiosDoUsuario.includes(p.condominioId));
  };

  const carregarCondominios = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/condominios');
      if (response.ok) {
        const dados = await response.json();
        setCondominios(Array.isArray(dados) ? dados : dados.condominios || []);
      }
    } catch (err) {
      console.error('Erro ao carregar condomínios:', err);
    }
  }, []);

  const carregarUsuarios = useCallback(async () => {
    try {
      if (usuarios.length === 0) {
        setCarregando(true);
      }
      setErro(null);
      
      const response = await fetch('/api/admin/usuarios');
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }
      
      const dados = await response.json();
      if (Array.isArray(dados)) {
        setUsuarios(dados);
      } else if (Array.isArray(dados.usuarios)) {
        setUsuarios(dados.usuarios);
      } else {
        setUsuarios([]);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }, [usuarios.length]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status !== 'authenticated') {
      setCarregando(false);
      return;
    }

    if (!temAcesso) {
      setErro('Você não tem permissão para acessar esta página');
      setCarregando(false);
      return;
    }
    
    void carregarUsuarios();
    void carregarCondominios();
  }, [status, temAcesso, carregarUsuarios, carregarCondominios]);

  const abrirModalNovoUsuario = () => {
    setUsuarioEditando(null);
    setFormData({
      nome: '',
      email: '',
      senha: '',
      perfis: [{ 
        condominioId: filtroCondominio || getCondominiosDisponiveis()[0]?.id || '', 
        tipo: 'morador', 
        ativo: true 
      }]
    });
    setModalAberto(true);
  };

  const abrirModalEditarUsuario = (usuarioAlvo: any) => {
    if (!podeEditarUsuario(usuarioAlvo)) {
      alert('Você não tem permissão para editar este usuário');
      return;
    }
    
    setUsuarioEditando(usuarioAlvo);
    setFormData({
      nome: usuarioAlvo.nome,
      email: usuarioAlvo.email,
      senha: '',
      perfis: usuarioAlvo.perfis.map((p: any) => ({
        condominioId: p.condominioId,
        tipo: p.tipo,
        ativo: p.ativo
      }))
    });
    setModalAberto(true);
  };

  const salvarUsuario = async () => {
    if (!formData.nome || !formData.email) {
      alert('Preencha nome e email');
      return;
    }

    if (!usuarioEditando && !formData.senha) {
      alert('Senha é obrigatória para novo usuário');
      return;
    }

    setSalvando(true);
    try {
      const url = usuarioEditando 
        ? `/api/admin/usuarios/${usuarioEditando.id}`
        : '/api/admin/usuarios';
      
      const method = usuarioEditando ? 'PUT' : 'POST';
      
      const payload: any = {
        nome: formData.nome,
        email: formData.email,
        perfis: formData.perfis
      };

      if (formData.senha) {
        payload.senha = formData.senha;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao salvar usuário');
      }

      await carregarUsuarios();
      setModalAberto(false);
      alert(usuarioEditando ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
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

  // Filtrar usuários
  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusca = u.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       u.email.toLowerCase().includes(busca.toLowerCase());
    
    const matchCondominio = !filtroCondominio || 
                           u.perfis?.some((p: any) => p.condominioId === filtroCondominio);
    
    const matchTipo = !filtroTipo || 
                     u.perfis?.some((p: any) => p.tipo === filtroTipo);
    
    return matchBusca && matchCondominio && matchTipo;
  });

  if (status !== 'loading' && !temAcesso) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-red-600 font-semibold">Você não tem permissão para acessar esta página</p>
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

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            {/* Busca */}
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

            {/* Filtro Condomínio */}
            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condomínio
              </label>
              <select
                value={filtroCondominio}
                onChange={(e) => setFiltroCondominio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {getCondominiosDisponiveis().map(cond => (
                  <option key={cond.id} value={cond.id}>
                    {cond.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Tipo */}
            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Perfil
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="administrador_mestre">Admin Mestre</option>
                <option value="administrador_condominio">Admin Condomínio</option>
                <option value="sindico">Síndico</option>
                <option value="porteiro">Porteiro</option>
                <option value="morador">Morador</option>
              </select>
            </div>

            {/* Botão Limpar */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setBusca('');
                  setFiltroCondominio('');
                  setFiltroTipo('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabela */}
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
                      Condomínio
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
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{u.nome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {u.perfis?.map((p: any) => {
                            const cond = condominios.find(c => c.id === p.condominioId);
                            return (
                              <p key={p.id} className="text-sm text-gray-600">
                                {cond?.nome || 'N/A'}
                              </p>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {u.perfis?.map((p: any) => (
                            <span key={p.id} className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {p.tipo}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          u.perfis?.some((p: any) => p.ativo) 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {u.perfis?.some((p: any) => p.ativo) ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => abrirModalEditarUsuario(u)}
                            disabled={!podeEditarUsuario(u)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={podeEditarUsuario(u) ? 'Editar' : 'Sem permissão'}
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => deletarUsuario(u.id)}
                            disabled={!podeEditarUsuario(u)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={podeEditarUsuario(u) ? 'Deletar' : 'Sem permissão'}
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
            <p className="text-2xl font-bold text-gray-900">{usuariosFiltrados.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Ativos</p>
            <p className="text-2xl font-bold text-green-600">
              {usuariosFiltrados.filter(u => u.perfis?.some((p: any) => p.ativo)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Admins Mestres</p>
            <p className="text-2xl font-bold text-red-600">
              {usuariosFiltrados.filter(u => u.perfis?.some((p: any) => p.tipo === 'administrador_mestre')).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Moradores</p>
            <p className="text-2xl font-bold text-green-600">
              {usuariosFiltrados.filter(u => u.perfis?.some((p: any) => p.tipo === 'morador')).length}
            </p>
          </div>
        </div>

        {/* Modal */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-semibold text-gray-900">
                  {usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button
                  onClick={() => setModalAberto(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ?
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
                    Senha {usuarioEditando ? '(deixe em branco para manter)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Perfis</h3>
                  <div className="space-y-3">
                    {formData.perfis.map((perfil, idx) => (
                      <div key={idx} className="p-3 border border-gray-200 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Condomínio *
                            </label>
                            <select
                              value={perfil.condominioId}
                              onChange={(e) => {
                                const newPerfis = [...formData.perfis];
                                newPerfis[idx].condominioId = e.target.value;
                                setFormData({ ...formData, perfis: newPerfis });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Selecione</option>
                              {getCondominiosDisponiveis().map(cond => (
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
                              value={perfil.tipo}
                              onChange={(e) => {
                                const newPerfis = [...formData.perfis];
                                newPerfis[idx].tipo = e.target.value;
                                setFormData({ ...formData, perfis: newPerfis });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="morador">Morador</option>
                              <option value="porteiro">Porteiro</option>
                              <option value="sindico">Síndico</option>
                              <option value="administrador_condominio">Admin Condomínio</option>
                              {usuario?.perfis?.some((p: any) => p.tipo === 'administrador_mestre') && (
                                <option value="administrador_mestre">Admin Mestre</option>
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`ativo-${idx}`}
                            checked={perfil.ativo}
                            onChange={(e) => {
                              const newPerfis = [...formData.perfis];
                              newPerfis[idx].ativo = e.target.checked;
                              setFormData({ ...formData, perfis: newPerfis });
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label htmlFor={`ativo-${idx}`} className="text-sm font-medium text-gray-700">
                            Ativo
                          </label>
                        </div>

                        {formData.perfis.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPerfis = formData.perfis.filter((_, i) => i !== idx);
                              setFormData({ ...formData, perfis: newPerfis });
                            }}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Remover Perfil
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newPerfis = [...formData.perfis, {
                        condominioId: getCondominiosDisponiveis()[0]?.id || '',
                        tipo: 'morador',
                        ativo: true
                      }];
                      setFormData({ ...formData, perfis: newPerfis });
                    }}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Adicionar Perfil
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
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
                  {salvando ? 'Salvando...' : usuarioEditando ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

