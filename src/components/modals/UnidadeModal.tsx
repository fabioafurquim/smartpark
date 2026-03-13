'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Home, Search } from 'lucide-react';

interface Condominio {
  id: string;
  nome: string;
}

interface Torre {
  id: string;
  nome: string;
  tipo: 'TORRE' | 'BLOCO';
}

type TipoUnidade = 'APARTAMENTO' | 'COBERTURA' | 'LOJA' | 'SALA_COMERCIAL';

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Unidade {
  id: string;
  numero: string;
  andar: number;
  tipo: TipoUnidade;
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
}

interface UnidadeFormData {
  numero: string;
  andar: number;
  tipo: TipoUnidade;
  proprietario?: string;
  contato?: string;
  torreId: string;
  condominioId: string;
  usuarioId?: string;
}

interface UnidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UnidadeFormData) => Promise<void>;
  unidade?: Unidade | null;
  condominios: Condominio[];
  selectedCondominioId: string;
}

const TIPOS_UNIDADE: { value: TipoUnidade; label: string }[] = [
  { value: 'APARTAMENTO', label: 'Apartamento' },
  { value: 'COBERTURA', label: 'Cobertura' },
  { value: 'LOJA', label: 'Loja' },
  { value: 'SALA_COMERCIAL', label: 'Sala Comercial' },
];

export default function UnidadeModal({
  isOpen,
  onClose,
  onSave,
  unidade,
  condominios,
  selectedCondominioId,
}: UnidadeModalProps) {
  const [formData, setFormData] = useState<UnidadeFormData>({
    numero: '',
    andar: 1,
    tipo: 'APARTAMENTO',
    proprietario: '',
    contato: '',
    torreId: '',
    condominioId: selectedCondominioId,
    usuarioId: '',
  });
  const [torres, setTorres] = useState<Torre[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputUsuarioRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes or unidade changes
  useEffect(() => {
    if (isOpen) {
      if (unidade) {
        setFormData({
          numero: unidade.numero,
          andar: unidade.andar,
          tipo: unidade.tipo,
          proprietario: unidade.proprietario || '',
          contato: unidade.contato || '',
          torreId: unidade.torreId,
          condominioId: unidade.condominioId,
          usuarioId: unidade.usuarioId || '',
        });
        // Se tem usuário, mostrar o nome na busca
        if (unidade.usuario) {
          setBuscaUsuario(unidade.usuario.nome);
        } else {
          setBuscaUsuario('');
        }
      } else {
        setFormData({
          numero: '',
          andar: 1,
          tipo: 'APARTAMENTO',
          proprietario: '',
          contato: '',
          torreId: '',
          condominioId: selectedCondominioId,
          usuarioId: '',
        });
        setBuscaUsuario('');
      }
      setErrors({});
      setDropdownAberto(false);
    }
  }, [isOpen, unidade, selectedCondominioId]);

  // Fetch torres and usuarios when condominio changes
  useEffect(() => {
    if (formData.condominioId) {
      fetchTorres(formData.condominioId);
      fetchUsuarios(formData.condominioId);
    } else {
      setTorres([]);
      setUsuarios([]);
    }
  }, [formData.condominioId]);

  const fetchTorres = async (condominioId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/torres?condominioId=${condominioId}`);
      if (response.ok) {
        const data = await response.json();
        setTorres(data);
      }
    } catch (error) {
      console.error('Erro ao carregar torres:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsuarios = async (condominioId: string) => {
    try {
      const response = await fetch(`/api/admin/usuarios?tipo=morador`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dados da API:', data);
        console.log('🏢 Condomínio selecionado:', condominioId);
        
        // Filtrar usuários que têm perfil de morador no condomínio selecionado
        const usuariosDoCondominio = (data.usuarios || []).filter((u: any) => {
          const temPerfilNoCondominio = u.perfis?.some((p: any) => {
            console.log(`👤 ${u.nome}: perfil condominioId=${p.condominioId}, tipo=${p.tipo}`);
            return p.condominioId === condominioId && p.tipo === 'morador';
          });
          return temPerfilNoCondominio;
        });
        
        console.log('✅ Usuários filtrados:', usuariosDoCondominio);
        setUsuarios(usuariosDoCondominio);
        setUsuariosFiltrados(usuariosDoCondominio);
      } else {
        console.error('❌ Erro na API:', response.status);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const filtrarUsuarios = (termo: string) => {
    setBuscaUsuario(termo);
    if (!termo.trim()) {
      setUsuariosFiltrados(usuarios);
    } else {
      const filtrados = usuarios.filter(
        (u) =>
          u.nome.toLowerCase().includes(termo.toLowerCase()) ||
          u.email.toLowerCase().includes(termo.toLowerCase())
      );
      setUsuariosFiltrados(filtrados);
    }
  };

  const selecionarUsuario = (usuario: Usuario) => {
    setFormData((prev) => ({ ...prev, usuarioId: usuario.id }));
    setBuscaUsuario(usuario.nome);
    setDropdownAberto(false);
  };

  const limparUsuario = () => {
    setFormData((prev) => ({ ...prev, usuarioId: '' }));
    setBuscaUsuario('');
    setDropdownAberto(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numero.trim()) {
      newErrors.numero = 'Número da unidade é obrigatório';
    }

    if (!formData.andar || formData.andar < 0) {
      newErrors.andar = 'Andar deve ser um número válido';
    }

    if (!formData.torreId) {
      newErrors.torreId = 'Torre/Bloco é obrigatório';
    }

    if (!formData.condominioId) {
      newErrors.condominioId = 'Condomínio é obrigatório';
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
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar unidade:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof UnidadeFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Home className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              {unidade ? 'Editar Unidade' : 'Nova Unidade'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Condomínio */}
          <div>
            <label htmlFor="condominio" className="block text-sm font-medium text-gray-700 mb-1">
              Condomínio *
            </label>
            <select
              id="condominio"
              value={formData.condominioId}
              onChange={(e) => handleInputChange('condominioId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.condominioId ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={!!unidade} // Disable when editing
            >
              <option value="">Selecione um condomínio</option>
              {condominios.map((condominio) => (
                <option key={condominio.id} value={condominio.id}>
                  {condominio.nome}
                </option>
              ))}
            </select>
            {errors.condominioId && (
              <p className="mt-1 text-sm text-red-600">{errors.condominioId}</p>
            )}
          </div>

          {/* Torre/Bloco */}
          <div>
            <label htmlFor="torre" className="block text-sm font-medium text-gray-700 mb-1">
              Torre/Bloco *
            </label>
            <select
              id="torre"
              value={formData.torreId}
              onChange={(e) => handleInputChange('torreId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.torreId ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading || !formData.condominioId}
            >
              <option value="">Selecione uma torre/bloco</option>
              {torres.map((torre) => (
                <option key={torre.id} value={torre.id}>
                  {torre.nome} ({torre.tipo})
                </option>
              ))}
            </select>
            {errors.torreId && (
              <p className="mt-1 text-sm text-red-600">{errors.torreId}</p>
            )}
          </div>

          {/* Número */}
          <div>
            <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
              Número da Unidade *
            </label>
            <input
              type="text"
              id="numero"
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.numero ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: 101, 201A, Loja 1"
            />
            {errors.numero && (
              <p className="mt-1 text-sm text-red-600">{errors.numero}</p>
            )}
          </div>

          {/* Andar */}
          <div>
            <label htmlFor="andar" className="block text-sm font-medium text-gray-700 mb-1">
              Andar *
            </label>
            <input
              type="text"
              id="andar"
              value={formData.andar === 0 && formData.numero ? 'T' : formData.andar}
              onChange={(e) => {
                const valor = e.target.value.toUpperCase();
                if (valor === 'T' || valor === '') {
                  handleInputChange('andar', 0);
                } else {
                  const num = parseInt(valor);
                  if (!isNaN(num) && num >= 0) {
                    handleInputChange('andar', num);
                  }
                }
              }}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.andar ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="T para térreo ou número"
            />
            {errors.andar && (
              <p className="mt-1 text-sm text-red-600">{errors.andar}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Digite &quot;T&quot; para térreo ou um número (0, 1, 2, etc)
            </p>
          </div>

          {/* Tipo */}
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo *
            </label>
            <select
              id="tipo"
              value={formData.tipo}
              onChange={(e) => handleInputChange('tipo', e.target.value as UnidadeFormData['tipo'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS_UNIDADE.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          {/* Proprietário */}
          <div>
            <label htmlFor="proprietario" className="block text-sm font-medium text-gray-700 mb-1">
              Proprietário
            </label>
            <input
              type="text"
              id="proprietario"
              value={formData.proprietario}
              onChange={(e) => handleInputChange('proprietario', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do proprietário"
            />
          </div>

          {/* Usuário (Morador) - Autocomplete */}
          <div className="relative">
            <label htmlFor="usuario" className="block text-sm font-medium text-gray-700 mb-1">
              Associar Morador
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                ref={inputUsuarioRef}
                type="text"
                id="usuario"
                value={buscaUsuario}
                onChange={(e) => filtrarUsuarios(e.target.value)}
                onFocus={() => setDropdownAberto(true)}
                onBlur={() => setTimeout(() => setDropdownAberto(false), 200)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o nome ou email do morador"
                autoComplete="off"
              />
              {formData.usuarioId && (
                <button
                  type="button"
                  onClick={limparUsuario}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown de sugestões */}
            {dropdownAberto && usuariosFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {usuariosFiltrados.map((usuario) => (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => selecionarUsuario(usuario)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 flex flex-col"
                  >
                    <span className="font-medium text-gray-900">{usuario.nome}</span>
                    <span className="text-xs text-gray-500">{usuario.email}</span>
                  </button>
                ))}
              </div>
            )}

            {dropdownAberto && buscaUsuario && usuariosFiltrados.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500">
                Nenhum morador encontrado
              </div>
            )}

            <p className="mt-1 text-xs text-gray-500">
              O morador associado poderá gerenciar as vagas desta unidade
            </p>
          </div>

          {/* Contato */}
          <div>
            <label htmlFor="contato" className="block text-sm font-medium text-gray-700 mb-1">
              Contato
            </label>
            <input
              type="text"
              id="contato"
              value={formData.contato}
              onChange={(e) => handleInputChange('contato', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Telefone ou email"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : unidade ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
