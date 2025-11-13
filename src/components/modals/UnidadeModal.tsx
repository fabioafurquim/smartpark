'use client';

import { useState, useEffect } from 'react';
import { X, Home } from 'lucide-react';

interface Condominio {
  id: string;
  nome: string;
}

interface Torre {
  id: string;
  nome: string;
  tipo: 'TORRE' | 'BLOCO';
}

interface Unidade {
  id: string;
  numero: string;
  andar: number;
  tipo: 'APARTAMENTO' | 'COBERTURA' | 'LOJA' | 'SALA';
  proprietario?: string;
  contato?: string;
  torreId: string;
  condominioId: string;
}

interface UnidadeFormData {
  numero: string;
  andar: number;
  tipo: 'APARTAMENTO' | 'COBERTURA' | 'LOJA' | 'SALA';
  proprietario?: string;
  contato?: string;
  torreId: string;
  condominioId: string;
}

interface UnidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UnidadeFormData) => Promise<void>;
  unidade?: Unidade | null;
  condominios: Condominio[];
  selectedCondominioId: string;
}

const TIPOS_UNIDADE = [
  { value: 'APARTAMENTO', label: 'Apartamento' },
  { value: 'COBERTURA', label: 'Cobertura' },
  { value: 'LOJA', label: 'Loja' },
  { value: 'SALA', label: 'Sala' },
] as const;

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
  });
  const [torres, setTorres] = useState<Torre[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        });
      } else {
        setFormData({
          numero: '',
          andar: 1,
          tipo: 'APARTAMENTO',
          proprietario: '',
          contato: '',
          torreId: '',
          condominioId: selectedCondominioId,
        });
      }
      setErrors({});
    }
  }, [isOpen, unidade, selectedCondominioId]);

  // Fetch torres when condominio changes
  useEffect(() => {
    if (formData.condominioId) {
      fetchTorres(formData.condominioId);
    } else {
      setTorres([]);
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
              type="number"
              id="andar"
              value={formData.andar}
              onChange={(e) => handleInputChange('andar', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.andar ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0"
              placeholder="0 para térreo"
            />
            {errors.andar && (
              <p className="mt-1 text-sm text-red-600">{errors.andar}</p>
            )}
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