'use client';

import { useState, useEffect } from 'react';
import { X, Building2, Home } from 'lucide-react';

interface TorreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TorreFormData) => Promise<void>;
  torre?: Torre | null;
  condominios: Condominio[];
  selectedCondominioId?: string;
}

interface TorreFormData {
  nome: string;
  tipo: 'TORRE' | 'BLOCO';
  condominioId: string;
}

interface Torre {
  id: string;
  nome: string;
  tipo: 'TORRE' | 'BLOCO';
  condominioId: string;
  condominio: {
    id: string;
    nome: string;
  };
  totalUnidades: number;
  createdAt: string;
}

interface Condominio {
  id: string;
  nome: string;
}

export default function TorreModal({
  isOpen,
  onClose,
  onSave,
  torre,
  condominios,
  selectedCondominioId
}: TorreModalProps) {
  const [formData, setFormData] = useState<TorreFormData>({
    nome: '',
    tipo: 'TORRE',
    condominioId: selectedCondominioId || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or torre changes
  useEffect(() => {
    if (isOpen) {
      if (torre) {
        // Editing existing torre
        setFormData({
          nome: torre.nome,
          tipo: torre.tipo,
          condominioId: torre.condominioId
        });
      } else {
        // Creating new torre
        setFormData({
          nome: '',
          tipo: 'TORRE',
          condominioId: selectedCondominioId || ''
        });
      }
      setErrors({});
    }
  }, [isOpen, torre, selectedCondominioId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
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

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar torre:', error);
      // Error handling is done in parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof TorreFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {torre ? 'Editar' : 'Nova'} Torre/Bloco
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.nome ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: Torre A, Bloco 1"
              disabled={isLoading}
            />
            {errors.nome && (
              <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleInputChange('tipo', 'TORRE')}
                className={`flex items-center justify-center p-3 border rounded-md transition-colors ${
                  formData.tipo === 'TORRE'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                disabled={isLoading}
              >
                <Building2 className="h-5 w-5 mr-2" />
                Torre
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('tipo', 'BLOCO')}
                className={`flex items-center justify-center p-3 border rounded-md transition-colors ${
                  formData.tipo === 'BLOCO'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                disabled={isLoading}
              >
                <Home className="h-5 w-5 mr-2" />
                Bloco
              </button>
            </div>
          </div>

          {/* Condomínio */}
          <div>
            <label htmlFor="condominioId" className="block text-sm font-medium text-gray-700 mb-1">
              Condomínio *
            </label>
            <select
              id="condominioId"
              value={formData.condominioId}
              onChange={(e) => handleInputChange('condominioId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.condominioId ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading || !!selectedCondominioId}
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

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : torre ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}