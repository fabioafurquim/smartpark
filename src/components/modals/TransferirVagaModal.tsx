'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, Car, X } from 'lucide-react';
import UnidadeSelector from '@/components/ui/UnidadeSelector';

interface Vaga {
  id: string;
  numero: string;
  tipo: 'COBERTA' | 'DESCOBERTA' | 'DEFICIENTE' | 'IDOSO' | 'VISITANTE';
  unidadeId?: string;
  condominioId?: string;
  unidade?: {
    id: string;
    numero: string;
    torre: {
      nome: string;
    };
  };
}

interface TransferirVagaModalProps {
  isOpen: boolean;
  vaga: Vaga | null;
  onClose: () => void;
  onTransferir: (unidadeId: string) => Promise<void>;
}

export default function TransferirVagaModal({
  isOpen,
  vaga,
  onClose,
  onTransferir,
}: TransferirVagaModalProps) {
  const [unidadeId, setUnidadeId] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !vaga) {
      return;
    }

    setUnidadeId(vaga.unidadeId || '');
    setError('');
  }, [isOpen, vaga]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!unidadeId) {
      setError('Selecione a unidade de destino');
      return;
    }

    if (unidadeId === vaga?.unidadeId) {
      setError('Selecione uma unidade diferente da atual');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onTransferir(unidadeId);
      onClose();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Erro ao transferir vaga';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !vaga || !vaga.condominioId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-6">
          <div className="flex items-center">
            <ArrowRightLeft className="mr-3 h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Transferir Vaga</h2>
              <p className="text-sm text-gray-500">Vaga {vaga.numero}</p>
            </div>
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
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="mb-2 flex items-center">
              <Car className="mr-2 h-4 w-4" />
              <span className="font-medium">
                Unidade atual:{' '}
                {vaga.unidade
                  ? `${vaga.unidade.numero} (${vaga.unidade.torre.nome})`
                  : 'Nao informada'}
              </span>
            </div>
            <p>
              Ao transferir, a vaga passa a pertencer a outra unidade e o morador responsavel sera
              atualizado automaticamente conforme o vinculo da unidade de destino.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Unidade de destino
            </label>
            <UnidadeSelector
              condominioId={vaga.condominioId}
              value={unidadeId}
              onChange={setUnidadeId}
              placeholder="Selecione a unidade de destino"
              required
              error={error}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Transferindo...' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
