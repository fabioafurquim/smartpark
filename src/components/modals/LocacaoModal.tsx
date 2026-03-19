'use client';

import { useEffect, useState } from 'react';
import { Calendar, CarFront, Clock, ShieldCheck, X } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';

interface Vaga {
  id: string;
  numero: string;
  tipo: string;
  unidade: {
    numero: string;
    torre: {
      nome: string;
    };
  };
  condominio: {
    nome: string;
  };
  proprietario: {
    nome: string;
  };
  configuracaoLocacao: {
    tiposPermitidos: string[];
  };
}

interface LocacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaga: Vaga;
  onSuccess: () => void;
}

export default function LocacaoModal({
  isOpen,
  onClose,
  vaga,
  onSuccess,
}: LocacaoModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    dataInicio: '',
    dataFim: '',
    tipoLocacao: vaga.configuracaoLocacao.tiposPermitidos[0] || 'DIARIA',
    placaVeiculo: '',
    modeloVeiculo: '',
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setFormData({
      dataInicio: '',
      dataFim: '',
      tipoLocacao: vaga.configuracaoLocacao.tiposPermitidos[0] || 'DIARIA',
      placaVeiculo: '',
      modeloVeiculo: '',
    });
    setErro('');
  }, [vaga]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErro('');
  };

  const validarFormulario = () => {
    if (!formData.dataInicio) {
      setErro('Informe o inicio do emprestimo.');
      return false;
    }

    if (!formData.dataFim) {
      setErro('Informe o fim do emprestimo.');
      return false;
    }

    if (!formData.placaVeiculo.trim()) {
      setErro('Informe a placa do veiculo.');
      return false;
    }

    if (!formData.modeloVeiculo.trim()) {
      setErro('Informe o modelo do veiculo.');
      return false;
    }

    const dataInicio = new Date(formData.dataInicio);
    const dataFim = new Date(formData.dataFim);

    if (dataInicio >= dataFim) {
      setErro('A data de inicio precisa ser anterior a data de fim.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setCarregando(true);
    try {
      const response = await fetch('/api/locacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vagaId: vaga.id,
          dataInicio: new Date(formData.dataInicio).toISOString(),
          dataFim: new Date(formData.dataFim).toISOString(),
          tipoLocacao: formData.tipoLocacao,
          placaVeiculo: formData.placaVeiculo,
          modeloVeiculo: formData.modeloVeiculo,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErro(data?.error || 'Nao foi possivel registrar o emprestimo.');
        return;
      }

      showToast({
        title: 'Emprestimo confirmado',
        description:
          'O uso da vaga foi registrado no sistema e o morador responsavel foi avisado.',
        variant: 'success',
      });
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar emprestimo:', error);
      setErro('Erro ao registrar o emprestimo.');
    } finally {
      setCarregando(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]">
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-4">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Registrar emprestimo</h2>
                <p className="text-sm text-slate-500">
                  A vaga fica reservada automaticamente para o periodo informado.
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
            <div className="space-y-4">
              <div className="rounded-[28px] bg-blue-50 p-4">
                <p className="text-sm text-slate-600">Vaga selecionada</p>
                <p className="mt-1 text-xl font-bold text-slate-900">Vaga {vaga.numero}</p>
                <p className="text-sm text-slate-600">
                  {vaga.unidade.torre.nome} - Unidade {vaga.unidade.numero}
                </p>
                <p className="mt-2 text-xs text-slate-500">{vaga.condominio.nome}</p>
                <p className="mt-3 text-sm text-slate-600">
                  Morador responsavel:{' '}
                  <span className="font-medium text-slate-900">{vaga.proprietario.nome}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    <Clock className="mr-1 inline h-4 w-4" />
                    Modalidade do uso
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {vaga.configuracaoLocacao.tiposPermitidos.map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => handleInputChange('tipoLocacao', tipo)}
                        className={`rounded-2xl px-3 py-3 text-sm font-medium transition-colors ${
                          formData.tipoLocacao === tipo
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <Calendar className="mr-1 inline h-4 w-4" />
                      Inicio
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.dataInicio}
                      onChange={(e) => handleInputChange('dataInicio', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <Calendar className="mr-1 inline h-4 w-4" />
                      Fim
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.dataFim}
                      onChange={(e) => handleInputChange('dataFim', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      <CarFront className="mr-1 inline h-4 w-4" />
                      Placa do veiculo
                    </label>
                    <input
                      type="text"
                      value={formData.placaVeiculo}
                      onChange={(e) => handleInputChange('placaVeiculo', e.target.value.toUpperCase())}
                      placeholder="ABC1D23"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Modelo do veiculo
                    </label>
                    <input
                      type="text"
                      value={formData.modeloVeiculo}
                      onChange={(e) => handleInputChange('modeloVeiculo', e.target.value)}
                      placeholder="Ex.: Palio prata"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-blue-900">
                    <ShieldCheck className="h-4 w-4" />
                    Registro automatico do emprestimo
                  </div>
                  <p className="mt-2 text-sm text-blue-800">
                    O sistema valida conflito de horario, identifica o veiculo e registra a
                    ocupacao da vaga para acompanhamento do condominio.
                  </p>
                </div>

                {erro && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {erro}
                  </div>
                )}

                <div className="sticky bottom-0 grid gap-2 border-t border-slate-100 bg-white pb-1 pt-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={carregando}
                    className="h-12 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {carregando ? 'Registrando...' : 'Confirmar emprestimo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
