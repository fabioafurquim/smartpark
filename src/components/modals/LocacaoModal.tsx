'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Calendar, DollarSign, Clock, CarFront } from 'lucide-react';
import { calcularValorLocacao } from '@/lib/locacao-utils';

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
    valorHora: number | null;
    valorDiaria: number | null;
    valorMensal: number | null;
    valorAnual: number | null;
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

  const valorCalculado = useMemo(() => {
    if (!formData.dataInicio || !formData.dataFim) {
      return null;
    }

    const dataInicio = new Date(formData.dataInicio);
    const dataFim = new Date(formData.dataFim);

    if (
      Number.isNaN(dataInicio.getTime()) ||
      Number.isNaN(dataFim.getTime()) ||
      dataInicio >= dataFim
    ) {
      return null;
    }

    return calcularValorLocacao(
      formData.tipoLocacao as 'HORA' | 'DIARIA' | 'MENSAL' | 'ANUAL',
      dataInicio,
      dataFim,
      vaga.configuracaoLocacao
    );
  }, [formData.dataFim, formData.dataInicio, formData.tipoLocacao, vaga.configuracaoLocacao]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErro('');
  };

  const validarFormulario = (): boolean => {
    if (!formData.dataInicio) {
      setErro('Data de inicio e obrigatoria');
      return false;
    }
    if (!formData.dataFim) {
      setErro('Data de fim e obrigatoria');
      return false;
    }
    if (!formData.placaVeiculo) {
      setErro('Informe a placa do veiculo');
      return false;
    }
    if (!formData.modeloVeiculo) {
      setErro('Informe o modelo do veiculo');
      return false;
    }

    const dataInicio = new Date(formData.dataInicio);
    const dataFim = new Date(formData.dataFim);

    if (dataInicio >= dataFim) {
      setErro('Data de inicio deve ser anterior a data de fim');
      return false;
    }

    if (valorCalculado == null) {
      setErro('Nao foi possivel calcular o valor para este periodo');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      if (response.ok) {
        alert('Solicitacao enviada com sucesso. Agora ela aguarda a aprovacao do proprietario.');
        onSuccess();
      } else {
        const data = await response.json();
        setErro(data.details || data.error || 'Erro ao criar locacao');
      }
    } catch (error) {
      console.error('Erro ao criar locacao:', error);
      setErro('Erro ao criar locacao');
    } finally {
      setCarregando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Solicitar locacao</h2>
            <p className="text-sm text-gray-500">Valor calculado automaticamente pelo sistema</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-sm text-gray-600">Vaga selecionada</p>
            <p className="mt-1 text-lg font-bold text-gray-900">Vaga {vaga.numero}</p>
            <p className="text-sm text-gray-600">
              {vaga.unidade.torre.nome} - Unidade {vaga.unidade.numero}
            </p>
            <p className="mt-2 text-xs text-gray-500">{vaga.condominio.nome}</p>
            <p className="mt-3 text-sm text-gray-600">
              Morador responsavel:{' '}
              <span className="font-medium text-gray-900">{vaga.proprietario.nome}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                <Clock className="mr-1 inline h-4 w-4" />
                Tipo de locacao
              </label>
              <div className="grid grid-cols-2 gap-2">
                {vaga.configuracaoLocacao.tiposPermitidos.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleInputChange('tipoLocacao', tipo)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      formData.tipoLocacao === tipo
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tipo === 'HORA' && 'Por hora'}
                    {tipo === 'DIARIA' && 'Por dia'}
                    {tipo === 'MENSAL' && 'Por mes'}
                    {tipo === 'ANUAL' && 'Por ano'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  Inicio
                </label>
                <input
                  type="datetime-local"
                  value={formData.dataInicio}
                  onChange={(e) => handleInputChange('dataInicio', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  Fim
                </label>
                <input
                  type="datetime-local"
                  value={formData.dataFim}
                  onChange={(e) => handleInputChange('dataFim', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <CarFront className="mr-1 inline h-4 w-4" />
                  Placa do veiculo
                </label>
                <input
                  type="text"
                  value={formData.placaVeiculo}
                  onChange={(e) => handleInputChange('placaVeiculo', e.target.value.toUpperCase())}
                  placeholder="ABC1D23"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Modelo do veiculo
                </label>
                <input
                  type="text"
                  value={formData.modeloVeiculo}
                  onChange={(e) => handleInputChange('modeloVeiculo', e.target.value)}
                  placeholder="Ex.: Civic prata"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm text-blue-900">
                <DollarSign className="h-4 w-4" />
                Valor estimado da solicitacao
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-950">
                {valorCalculado != null ? `R$ ${valorCalculado.toFixed(2)}` : 'Preencha o periodo'}
              </p>
              <p className="mt-1 text-xs text-blue-700">
                O valor final considera a modalidade publicada pelo proprietario.
              </p>
            </div>

            {erro && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={carregando}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {carregando ? 'Enviando...' : 'Solicitar locacao'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
