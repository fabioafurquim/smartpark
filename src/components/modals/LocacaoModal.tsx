'use client';

import { useState } from 'react';
import { X, Calendar, DollarSign, Clock } from 'lucide-react';

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
    email: string;
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
  onSuccess
}: LocacaoModalProps) {
  const [formData, setFormData] = useState({
    dataInicio: '',
    dataFim: '',
    tipoLocacao: vaga.configuracaoLocacao.tiposPermitidos[0] || 'DIARIA',
    valor: ''
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErro('');
  };

  const calcularValorSugerido = () => {
    const tipo = formData.tipoLocacao;
    const config = vaga.configuracaoLocacao;

    switch (tipo) {
      case 'HORA':
        return config.valorHora?.toString() || '';
      case 'DIARIA':
        return config.valorDiaria?.toString() || '';
      case 'MENSAL':
        return config.valorMensal?.toString() || '';
      case 'ANUAL':
        return config.valorAnual?.toString() || '';
      default:
        return '';
    }
  };

  const handleTipoChange = (tipo: string) => {
    setFormData(prev => ({
      ...prev,
      tipoLocacao: tipo,
      valor: calcularValorSugerido()
    }));
  };

  const validarFormulario = (): boolean => {
    if (!formData.dataInicio) {
      setErro('Data de início é obrigatória');
      return false;
    }
    if (!formData.dataFim) {
      setErro('Data de fim é obrigatória');
      return false;
    }
    if (!formData.valor) {
      setErro('Valor é obrigatório');
      return false;
    }

    const dataInicio = new Date(formData.dataInicio);
    const dataFim = new Date(formData.dataFim);

    if (dataInicio >= dataFim) {
      setErro('Data de início deve ser anterior à data de fim');
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vagaId: vaga.id,
          dataInicio: new Date(formData.dataInicio).toISOString(),
          dataFim: new Date(formData.dataFim).toISOString(),
          tipoLocacao: formData.tipoLocacao,
          valor: parseFloat(formData.valor)
        })
      });

      if (response.ok) {
        alert('Locação criada com sucesso! Aguardando aprovação do proprietário.');
        onSuccess();
      } else {
        const data = await response.json();
        const mensagem = data.details || data.error || 'Erro ao criar locação';
        setErro(mensagem);
      }
    } catch (error) {
      console.error('Erro ao criar locação:', error);
      setErro('Erro ao criar locação');
    } finally {
      setCarregando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Locar Vaga</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-4">
          {/* Info da Vaga */}
          <div className="bg-blue-50 p-3 rounded-lg space-y-2">
            <p className="text-sm text-gray-600">Vaga Selecionada</p>
            <p className="font-bold text-gray-900">Vaga {vaga.numero}</p>
            <p className="text-sm text-gray-600">
              {vaga.unidade.torre.nome} - Unidade {vaga.unidade.numero}
            </p>
            <p className="text-xs text-gray-500">{vaga.condominio.nome}</p>
          </div>

          {/* Info do Proprietário */}
          {vaga.proprietario && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p className="text-sm text-gray-600">Proprietário</p>
              <p className="font-medium text-gray-900">{vaga.proprietario.nome}</p>
              <p className="text-xs text-gray-500">{vaga.proprietario.email}</p>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Locação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Tipo de Locação *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {vaga.configuracaoLocacao.tiposPermitidos.map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleTipoChange(tipo)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      formData.tipoLocacao === tipo
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tipo === 'HORA' && 'Por Hora'}
                    {tipo === 'DIARIA' && 'Por Dia'}
                    {tipo === 'MENSAL' && 'Por Mês'}
                    {tipo === 'ANUAL' && 'Por Ano'}
                  </button>
                ))}
              </div>
            </div>

            {/* Data de Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Data de Início *
              </label>
              <input
                type="datetime-local"
                value={formData.dataInicio}
                onChange={(e) => handleInputChange('dataInicio', e.target.value)}
                onBlur={(e) => {
                  // Garante que o valor seja atualizado mesmo se o usuário não clicar fora
                  if (e.target.value) {
                    handleInputChange('dataInicio', e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Data de Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Data de Fim *
              </label>
              <input
                type="datetime-local"
                value={formData.dataFim}
                onChange={(e) => handleInputChange('dataFim', e.target.value)}
                onBlur={(e) => {
                  // Garante que o valor seja atualizado mesmo se o usuário não clicar fora
                  if (e.target.value) {
                    handleInputChange('dataFim', e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Valor (R$) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => handleInputChange('valor', e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleInputChange('valor', calcularValorSugerido())}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                >
                  Sugerir
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Valor sugerido: R$ {calcularValorSugerido() || '0.00'}
              </p>
            </div>

            {/* Erro */}
            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {erro}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={carregando}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {carregando ? 'Locando...' : 'Confirmar Locação'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
