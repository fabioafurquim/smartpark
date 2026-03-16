'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

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
        ? prev.tiposPermitidos.filter((item) => item !== tipo)
        : [...prev.tiposPermitidos, tipo],
    }));
  };

  const handleSalvar = async () => {
    try {
      setErro(null);
      setSalvando(true);

      if (formData.disponivel && formData.tiposPermitidos.length === 0) {
        setErro('Selecione pelo menos uma modalidade.');
        return;
      }

      if (formData.tiposPermitidos.includes('HORA') && !formData.valorHora) {
        setErro('Defina o valor por hora.');
        return;
      }
      if (formData.tiposPermitidos.includes('DIARIA') && !formData.valorDiaria) {
        setErro('Defina o valor por diária.');
        return;
      }
      if (formData.tiposPermitidos.includes('MENSAL') && !formData.valorMensal) {
        setErro('Defina o valor mensal.');
        return;
      }
      if (formData.tiposPermitidos.includes('ANUAL') && !formData.valorAnual) {
        setErro('Defina o valor anual.');
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
        const responseError = await response.json();
        throw new Error(responseError.erro || 'Erro ao salvar configuração');
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]">
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
        <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-4">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Configurar vaga {vaga.numero}</h2>
                <p className="text-sm text-slate-500">
                  Defina quando a vaga aparece para locação e quanto ela custa.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto px-5 py-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSalvar();
              }}
              className="space-y-5"
            >
              {erro && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.disponivel}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        disponivel: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-slate-900">Disponível para locação</p>
                    <p className="text-sm text-slate-500">
                      Quando ativada, sua vaga passa a aparecer para moradores do condomínio.
                    </p>
                  </div>
                </label>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                A cobrança automática ainda não faz parte do piloto. Por enquanto, esta etapa
                serve para publicação, valores e modalidades da vaga.
              </div>

              {formData.disponivel && (
                <>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Modalidades permitidas</p>
                      <p className="text-xs text-slate-500">
                        Escolha uma ou mais formas de locação para essa vaga.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {TIPOS_LOCACAO.map((tipo) => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => toggleTipoLocacao(tipo)}
                          className={`rounded-2xl px-3 py-3 text-sm font-medium transition-colors ${
                            formData.tiposPermitidos.includes(tipo)
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {tipo === 'HORA' && 'Por hora'}
                          {tipo === 'DIARIA' && 'Diária'}
                          {tipo === 'MENSAL' && 'Mensal'}
                          {tipo === 'ANUAL' && 'Anual'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {formData.tiposPermitidos.includes('HORA') && (
                      <div className="rounded-[28px] border border-slate-200 p-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Valor por hora (R$)
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
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {formData.tiposPermitidos.includes('DIARIA') && (
                      <div className="rounded-[28px] border border-slate-200 p-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Valor por diária (R$)
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
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {formData.tiposPermitidos.includes('MENSAL') && (
                      <div className="rounded-[28px] border border-slate-200 p-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Valor mensal (R$)
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
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {formData.tiposPermitidos.includes('ANUAL') && (
                      <div className="rounded-[28px] border border-slate-200 p-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Valor anual (R$)
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
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="sticky bottom-0 grid gap-2 border-t border-slate-100 bg-white pb-1 pt-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={salvando}
                  className="h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {salvando ? 'Salvando...' : 'Salvar configuração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
