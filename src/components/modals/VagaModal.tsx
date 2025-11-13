'use client';

import { useState, useEffect } from 'react';
import { X, Car } from 'lucide-react';
import UnidadeSelector from '@/components/ui/UnidadeSelector';

interface Vaga {
  id: string;
  numero: string;
  tipo: 'COBERTA' | 'DESCOBERTA' | 'DEFICIENTE' | 'IDOSO' | 'VISITANTE';
  unidadeId?: string;
  condominioId?: string;
  proprietarioId?: string;
  ocupada?: boolean;
  unidade?: {
    id: string;
    numero: string;
  };
  condominio?: {
    id: string;
    nome: string;
  };
}

interface Condominio {
  id: string;
  nome: string;
}

interface VagaFormData {
  numero: string;
  tipo: 'COBERTA' | 'DESCOBERTA' | 'DEFICIENTE' | 'IDOSO' | 'VISITANTE';
  unidadeId: string; // Agora obrigatório
  condominioId: string;
  proprietarioId?: string;
}

interface VagaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VagaFormData) => Promise<void>;
  vaga?: Vaga | null;
  condominios: Condominio[];
  selectedCondominioId?: string;
}

export default function VagaModal({
  isOpen,
  onClose,
  onSave,
  vaga,
  condominios,
  selectedCondominioId
}: VagaModalProps) {
  const [formData, setFormData] = useState<VagaFormData>({
    numero: '',
    tipo: 'DESCOBERTA',
    unidadeId: '', // Será obrigatório na validação
    condominioId: selectedCondominioId || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (vaga) {
        // Editando vaga existente
        setFormData({
          numero: vaga.numero,
          tipo: vaga.tipo,
          unidadeId: vaga.unidadeId || '', // Será validado como obrigatório
          condominioId: vaga.condominioId || '',
          proprietarioId: vaga.proprietarioId
        });
      } else {
        // Nova vaga
        setFormData({
          numero: '',
          tipo: 'DESCOBERTA',
          unidadeId: '', // Será obrigatório na validação
          condominioId: selectedCondominioId || ''
        });
      }
      setErrors({});
    }
  }, [isOpen, vaga, selectedCondominioId]);

  // Função removida - agora usamos o UnidadeSelector

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numero.trim()) {
      newErrors.numero = 'Número da vaga é obrigatório';
    }

    if (!formData.condominioId) {
      newErrors.condominioId = 'Condomínio é obrigatório';
    }

    if (!formData.unidadeId) {
      newErrors.unidadeId = 'Unidade é obrigatória';
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
      console.error('Erro ao salvar vaga:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof VagaFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'COBERTA':
        return 'bg-blue-100 text-blue-800';
      case 'DESCOBERTA':
        return 'bg-gray-100 text-gray-800';
      case 'DEFICIENTE':
        return 'bg-purple-100 text-purple-800';
      case 'IDOSO':
        return 'bg-orange-100 text-orange-800';
      case 'VISITANTE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVRE':
        return 'bg-green-100 text-green-800';
      case 'OCUPADA':
        return 'bg-red-100 text-red-800';
      case 'RESERVADA':
        return 'bg-yellow-100 text-yellow-800';
      case 'MANUTENCAO':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Car className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              {vaga ? 'Editar Vaga' : 'Nova Vaga'}
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
            <label htmlFor="condominioId" className="block text-sm font-medium text-gray-700 mb-1">
              Condomínio *
            </label>
            <select
              id="condominioId"
              value={formData.condominioId}
              onChange={(e) => handleInputChange('condominioId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.condominioId ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={!!selectedCondominioId}
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

          {/* Número */}
          <div>
            <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
              Número da Vaga *
            </label>
            <input
              type="text"
              id="numero"
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.numero ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: 001, A-15, B-23"
            />
            {errors.numero && (
              <p className="mt-1 text-sm text-red-600">{errors.numero}</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo da Vaga
            </label>
            <select
              id="tipo"
              value={formData.tipo}
              onChange={(e) => handleInputChange('tipo', e.target.value as VagaFormData['tipo'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DESCOBERTA">Descoberta</option>
              <option value="COBERTA">Coberta</option>
              <option value="DEFICIENTE">Deficiente</option>
              <option value="IDOSO">Idoso</option>
              <option value="VISITANTE">Visitante</option>
            </select>
            <div className="mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(formData.tipo)}`}>
                {formData.tipo}
              </span>
            </div>
          </div>



          {/* Unidade */}
          <div>
            <label htmlFor="unidadeId" className="block text-sm font-medium text-gray-700 mb-1">
              Unidade *
            </label>
            <UnidadeSelector
              condominioId={formData.condominioId}
              value={formData.unidadeId}
              onChange={(unidadeId) => handleInputChange('unidadeId', unidadeId)}
              placeholder="Selecione a unidade para esta vaga"
              disabled={!formData.condominioId}
              required={true}
              error={errors.unidadeId}
            />
          </div>



          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
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
              {isSaving ? 'Salvando...' : vaga ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}