'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface Vaga {
  id: string;
  numero: string;
  tipo: string;
  configuracaoLocacao?: {
    id: string;
    disponivel: boolean;
    tiposPermitidos: string[];
    valorHora?: number;
    valorDiaria?: number;
    valorMensal?: number;
    valorAnual?: number;
  };
}

interface ConfiguracaoLocacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaga: Vaga;
  onSave: () => void;
}

const TIPOS_LOCACAO = ['HORA', 'DIARIA', 'MENSAL', 'ANUAL'];

export default function ConfiguracaoLocacaoModal({
  isOpen,
  onClose,
  vaga,
  onSave,
}: ConfiguracaoLocacaoModalProps) {
  const [formData, setFormData] = useState({
    disponivel: false,
    tiposPermitidos: [] as string[],
    valorHora: '',
    valorDiaria: '',
    valorMensal: '',
    valorAnual: '',
  });

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && vaga.configuracaoLocacao) {
      setFormData({
        disponivel: vaga.configuracaoLocacao.disponivel,
        tiposPermitidos: vaga.configuracaoLocacao.tiposPermitidos,
        valorHora: vaga.configuracaoLocacao.valorHora?.toString() || '',
        valorDiaria: vaga.configuracaoLocacao.valorDiaria?.toString() || '',
        valorMensal: vaga.configuracaoLocacao.valorMensal?.toString() || '',
        valorAnual: vaga.configuracaoLocacao.valorAnual?.toString() || '',
      });
    } else if (isOpen) {
      setFormData({
        disponivel: false,
        tiposPermitidos: [],
        valorHora: '',
        valorDiaria: '',
        valorMensal: '',
        valorAnual: '',
      });
    }
    setErro(null);
  }, [isOpen, vaga]);

  const toggleTipoLocacao = (tipo: string) => {
    setFormData((prev) => ({
      ...prev,
      tiposPermitidos: prev.tiposPermitidos.includes(tipo)
        ? prev.tiposPermitidos.filter((t) => t !== tipo)
        : [...prev.tiposPermitidos, tipo],
    }));
  };

  const handleSalvar = async () => {
    try {
      setErro(null);
      setSalvando(true);

      // Validar se há tipos de locação selecionados
      if (formData.disponivel && formData.tiposPermitidos.length === 0) {
        setErro('Selecione pelo menos um tipo de locação');
        return;
      }

      // Validar valores
      if (formData.tiposPermitidos.includes('HORA') && !formData.valorHora) {
        setErro('Defina o valor por hora');
        return;
      }
      if (formData.tiposPermitidos.includes('DIARIA') && !formData.valorDiaria) {
        setErro('Defina o valor por dia');
        return;
      }
      if (formData.tiposPermitidos.includes('MENSAL') && !formData.valorMensal) {
        setErro('Defina o valor mensal');
        return;
      }
      if (formData.tiposPermitidos.includes('ANUAL') && !formData.valorAnual) {
        setErro('Defina o valor anual');
        return;
      }

      const payload = {
        disponivel: formData.disponivel,
        tiposPermitidos: formData.tiposPermitidos,
        valorHora: formData.valorHora ? parseFloat(formData.valorHora) : null,
        valorDiaria: formData.valorDiaria ? parseFloat(formData.valorDiaria) : null,
        valorMensal: formData.valorMensal ? parseFloat(formData.valorMensal) : null,
        valorAnual: formData.valorAnual ? parseFloat(formData.valorAnual) : null,
      };

      const response = await fetch(`/api/vagas/${vaga.id}/configuracao-locacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao salvar configuração');
      }

      onSave();
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Configurar Locação - Vaga {vaga.numero}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSalvar(); }} className="p-6 space-y-4">
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{erro}</p>
            </div>
          )}

          {/* Disponibilidade */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.disponivel}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    disponivel: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Disponível para locação
              </span>
            </label>
          </div>

          {formData.disponivel && (
            <>
              {/* Tipos de Locação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipos de Locação Permitidos *
                </label>
                <div className="space-y-2">
                  {TIPOS_LOCACAO.map((tipo) => (
                    <label key={tipo} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tiposPermitidos.includes(tipo)}
                        onChange={() => toggleTipoLocacao(tipo)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{tipo}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Valores */}
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium text-gray-700">Valores</p>

                {formData.tiposPermitidos.includes('HORA') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor por Hora (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valorHora}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          valorHora: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {formData.tiposPermitidos.includes('DIARIA') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor por Dia (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valorDiaria}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          valorDiaria: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {formData.tiposPermitidos.includes('MENSAL') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Mensal (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valorMensal}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          valorMensal: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {formData.tiposPermitidos.includes('ANUAL') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Anual (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valorAnual}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          valorAnual: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
