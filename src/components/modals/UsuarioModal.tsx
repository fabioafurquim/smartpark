'use client';

import { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfis: Array<{
    id: string;
    tipo: 'administrador_mestre' | 'administrador_condominio' | 'sindico' | 'morador';
    ativo: boolean;
    condominio?: {
      id: string;
      nome: string;
    };
  }>;
}

interface Condominio {
  id: string;
  nome: string;
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

interface UsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UsuarioFormData) => Promise<void>;
  usuario?: Usuario | null;
}

export default function UsuarioModal({
  isOpen,
  onClose,
  onSave,
  usuario,
}: UsuarioModalProps) {
  const [formData, setFormData] = useState<UsuarioFormData>({
    nome: '',
    email: '',
    senha: '',
    perfis: [],
  });
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [carregandoCondominios, setCarregandoCondominios] = useState(false);

  useEffect(() => {
    if (isOpen) {
      carregarCondominios();
      if (usuario) {
        // Editando usuário existente
        setFormData({
          nome: usuario.nome,
          email: usuario.email,
          perfis: usuario.perfis.map(p => ({
            condominioId: p.condominio?.id || '',
            tipo: p.tipo,
            ativo: p.ativo,
          })),
        });
      } else {
        // Novo usuário
        setFormData({
          nome: '',
          email: '',
          senha: '',
          perfis: [],
        });
      }
      setErrors({});
    }
  }, [isOpen, usuario]);

  const carregarCondominios = async () => {
    try {
      setCarregandoCondominios(true);
      const response = await fetch('/api/condominios');
      if (response.ok) {
        const dados = await response.json();
        setCondominios(dados.condominios || []);
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
    } finally {
      setCarregandoCondominios(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!usuario && !formData.senha) {
      newErrors.senha = 'Senha é obrigatória para novo usuário';
    } else if (formData.senha && formData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter ao menos 6 caracteres';
    }

    if (formData.perfis.length === 0) {
      newErrors.perfis = 'Ao menos um perfil deve ser adicionado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        nome: formData.nome,
        email: formData.email,
        perfis: formData.perfis,
      };

      // Apenas incluir senha se fornecida
      if (formData.senha) {
        payload.senha = formData.senha;
      }

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof Omit<UsuarioFormData, 'perfis'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const adicionarPerfil = () => {
    setFormData(prev => ({
      ...prev,
      perfis: [
        ...prev.perfis,
        {
          condominioId: '',
          tipo: 'morador',
          ativo: true,
        },
      ],
    }));
  };

  const removerPerfil = (index: number) => {
    setFormData(prev => ({
      ...prev,
      perfis: prev.perfis.filter((_, i) => i !== index),
    }));
  };

  const atualizarPerfil = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      perfis: prev.perfis.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              {usuario ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>

            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.nome ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Nome completo"
              />
              {errors.nome && (
                <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="email@exemplo.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Senha {usuario ? '(deixe em branco para manter)' : '*'}
              </label>
              <input
                type="password"
                id="senha"
                value={formData.senha || ''}
                onChange={(e) => handleInputChange('senha', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.senha ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Mínimo 6 caracteres"
              />
              {errors.senha && (
                <p className="mt-1 text-sm text-red-600">{errors.senha}</p>
              )}
            </div>
          </div>

          {/* Perfis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Perfis *</h3>
              <button
                type="button"
                onClick={adicionarPerfil}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Adicionar Perfil
              </button>
            </div>

            {errors.perfis && (
              <p className="text-sm text-red-600">{errors.perfis}</p>
            )}

            {formData.perfis.length === 0 ? (
              <p className="text-sm text-gray-600 italic">
                Nenhum perfil adicionado. Clique em "Adicionar Perfil" para começar.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.perfis.map((perfil, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(perfil.tipo)}`}>
                        {perfil.tipo}
                      </span>
                      <button
                        type="button"
                        onClick={() => removerPerfil(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Condomínio */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Condomínio *
                        </label>
                        <select
                          value={perfil.condominioId}
                          onChange={(e) => atualizarPerfil(index, 'condominioId', e.target.value)}
                          disabled={carregandoCondominios}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione um condomínio</option>
                          {condominios.map((cond) => (
                            <option key={cond.id} value={cond.id}>
                              {cond.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tipo de Perfil */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de Perfil *
                        </label>
                        <select
                          value={perfil.tipo}
                          onChange={(e) => atualizarPerfil(index, 'tipo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="morador">Morador</option>
                          <option value="sindico">Síndico</option>
                          <option value="administrador_condominio">Admin Condomínio</option>
                          <option value="administrador_mestre">Admin Mestre</option>
                        </select>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`ativo-${index}`}
                        checked={perfil.ativo ?? true}
                        onChange={(e) => atualizarPerfil(index, 'ativo', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <label htmlFor={`ativo-${index}`} className="text-sm font-medium text-gray-700">
                        Ativo
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Salvando...' : usuario ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
