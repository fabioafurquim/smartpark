'use client';

import { useEffect, useState } from 'react';
import { Save, ShieldCheck, X } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';

interface Vaga {
  id: string;
  numero: string;
  tipo: string;
  configuracaoLocacao?: {
    id: string;
    disponivel: boolean;
    tiposPermitidos: string[];
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
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    disponivel: false,
    tiposPermitidos: [] as string[],
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        disponivel: vaga.configuracaoLocacao?.disponivel ?? false,
        tiposPermitidos: vaga.configuracaoLocacao?.tiposPermitidos ?? [],
      });
      setErro(null);
    }
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
        setErro('Selecione pelo menos uma modalidade de emprestimo.');
        return;
      }

      const response = await fetch(`/api/vagas/${vaga.id}/configuracao-locacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disponivel: formData.disponivel,
          tiposPermitidos: formData.tiposPermitidos,
          valorHora: null,
          valorDiaria: null,
          valorMensal: null,
          valorAnual: null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.erro || 'Erro ao salvar configuracao');
      }

      showToast({
        title: 'Vaga atualizada',
        description: 'A disponibilidade da vaga foi salva com sucesso.',
        variant: 'success',
      });
      onSave();
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) {
    return null;
  }

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
                  Escolha quando a vaga pode ser publicada para emprestimo.
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
              onSubmit={(event) => {
                event.preventDefault();
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
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        disponivel: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-slate-900">Disponivel para emprestimo</p>
                    <p className="text-sm text-slate-500">
                      Quando ativada, sua vaga pode ser utilizada por outros moradores do condominio.
                    </p>
                  </div>
                </label>
              </div>

              {formData.disponivel && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Modalidades permitidas</p>
                    <p className="text-xs text-slate-500">
                      Escolha como a vaga pode ser emprestada para outros moradores.
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
                        {tipo === 'DIARIA' && 'Diaria'}
                        {tipo === 'MENSAL' && 'Mensal'}
                        {tipo === 'ANUAL' && 'Anual'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[28px] border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-sm text-blue-900">
                  <ShieldCheck className="h-4 w-4" />
                  Publicacao controlada da vaga
                </div>
                <p className="mt-2 text-sm text-blue-800">
                  Defina quando a vaga pode ser usada por outros moradores e ajuste as modalidades
                  permitidas sem perder o historico de uso.
                </p>
              </div>

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
                  {salvando ? 'Salvando...' : 'Salvar configuracao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
