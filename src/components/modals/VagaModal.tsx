'use client';

import { useEffect, useState } from 'react';
import { Car, X } from 'lucide-react';
import UnidadeSelector from '@/components/ui/UnidadeSelector';

interface Vaga {
  id: string;
  numero: string;
  tipo: 'COBERTA' | 'DESCOBERTA' | 'DEFICIENTE' | 'IDOSO' | 'VISITANTE';
  unidadeId?: string;
  condominioId?: string;
  proprietarioId?: string;
}

interface Condominio {
  id: string;
  nome: string;
}

interface VagaFormData {
  numero: string;
  tipo: 'COBERTA' | 'DESCOBERTA' | 'DEFICIENTE' | 'IDOSO' | 'VISITANTE';
  unidadeId: string;
  condominioId: string;
  proprietarioId?: string | null;
}

interface VagaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VagaFormData) => Promise<void>;
  vaga?: Vaga | null;
  condominios: Condominio[];
  selectedCondominioId?: string;
}

const getInitialFormData = (selectedCondominioId?: string): VagaFormData => ({
  numero: '',
  tipo: 'DESCOBERTA',
  unidadeId: '',
  condominioId: selectedCondominioId || '',
  proprietarioId: undefined,
});

export default function VagaModal({
  isOpen,
  onClose,
  onSave,
  vaga,
  condominios,
  selectedCondominioId,
}: VagaModalProps) {
  const [formData, setFormData] = useState<VagaFormData>(
    getInitialFormData(selectedCondominioId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (vaga) {
      setFormData({
        numero: vaga.numero,
        tipo: vaga.tipo,
        unidadeId: vaga.unidadeId || '',
        condominioId: vaga.condominioId || selectedCondominioId || '',
        proprietarioId: vaga.proprietarioId ?? undefined,
      });
    } else {
      setFormData(getInitialFormData(selectedCondominioId));
    }

    setErrors({});
  }, [isOpen, vaga, selectedCondominioId]);

  const handleInputChange = (field: keyof VagaFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'condominioId' ? { unidadeId: '' } : {}),
    }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.condominioId) {
      nextErrors.condominioId = 'Condominio e obrigatorio';
    }

    if (!formData.numero.trim()) {
      nextErrors.numero = 'Numero da vaga e obrigatorio';
    }

    if (!formData.unidadeId) {
      nextErrors.unidadeId = 'Unidade e obrigatoria';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

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

  const getTipoColor = (tipo: VagaFormData['tipo']) => {
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-6">
          <div className="flex items-center">
            <Car className="mr-3 h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {vaga ? 'Editar Vaga' : 'Nova Vaga'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label
              htmlFor="condominioId"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Condominio *
            </label>
            <select
              id="condominioId"
              value={formData.condominioId}
              onChange={(event) => handleInputChange('condominioId', event.target.value)}
              disabled={!!selectedCondominioId}
              className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.condominioId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Selecione um condominio</option>
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

          <div>
            <label htmlFor="numero" className="mb-1 block text-sm font-medium text-gray-700">
              Numero da Vaga *
            </label>
            <input
              id="numero"
              type="text"
              value={formData.numero}
              onChange={(event) => handleInputChange('numero', event.target.value)}
              placeholder="Ex: 001, A-15, B-23"
              className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.numero ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.numero && <p className="mt-1 text-sm text-red-600">{errors.numero}</p>}
          </div>

          <div>
            <label htmlFor="tipo" className="mb-1 block text-sm font-medium text-gray-700">
              Tipo da Vaga
            </label>
            <select
              id="tipo"
              value={formData.tipo}
              onChange={(event) =>
                handleInputChange('tipo', event.target.value as VagaFormData['tipo'])
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DESCOBERTA">Descoberta</option>
              <option value="COBERTA">Coberta</option>
              <option value="DEFICIENTE">Deficiente</option>
              <option value="IDOSO">Idoso</option>
              <option value="VISITANTE">Visitante</option>
            </select>
            <div className="mt-1">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTipoColor(
                  formData.tipo
                )}`}
              >
                {formData.tipo}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="unidadeId" className="mb-1 block text-sm font-medium text-gray-700">
              Unidade *
            </label>
            <UnidadeSelector
              condominioId={formData.condominioId}
              value={formData.unidadeId}
              onChange={(unidadeId) => handleInputChange('unidadeId', unidadeId)}
              placeholder="Selecione a unidade para esta vaga"
              disabled={!formData.condominioId}
              required
              error={errors.unidadeId}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : vaga ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
