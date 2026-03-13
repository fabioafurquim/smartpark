'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock as ClockIcon, MapPin as MapPinIcon } from 'lucide-react';

// Tipos
interface Condominio {
  id: string;
  nome: string;
}

interface Torre {
  id: string;
  nome: string;
}

interface Unidade {
  id: string;
  numero: string;
  torre: Torre;
}

interface Vaga {
  id: string;
  numero: string;
  tipo: string;
  unidade: Unidade;
}

interface DisponibilidadeResponse {
  success: boolean;
  data?: {
    vagas: {
      disponiveis: Vaga[];
    };
  };
  error?: string;
}

interface ReservaFormProps {
  condominios: Condominio[];
  vagasDisponiveis?: Vaga[];
  reservaId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  condominioPreSelecionado?: string;
}

export default function ReservaForm({ 
  condominios, 
  vagasDisponiveis: vagasDisponiveisProps = [],
  reservaId, 
  onSuccess, 
  onCancel,
  condominioPreSelecionado = ''
}: ReservaFormProps) {
  const [formData, setFormData] = useState({
    vagaId: '',
    condominioId: condominioPreSelecionado,
    dataInicio: '',
    horaInicio: '',
    dataFim: '',
    horaFim: '',
    observacoes: ''
  });

  const [vagasDisponiveis, setVagasDisponiveis] = useState<Vaga[]>(vagasDisponiveisProps);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar dados da reserva existente se estiver editando
  useEffect(() => {
    if (reservaId) {
      const carregarReserva = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/reservas/${reservaId}`);
          const result = await response.json();
          
          if (result.success && result.data) {
            const reserva = result.data;
            const dataInicio = new Date(reserva.dataInicio);
            const dataFim = new Date(reserva.dataFim);
            
            setFormData({
              vagaId: reserva.vagaId,
              condominioId: reserva.condominioId,
              dataInicio: dataInicio.toISOString().split('T')[0],
              horaInicio: dataInicio.toTimeString().slice(0, 5),
              dataFim: dataFim.toISOString().split('T')[0],
              horaFim: dataFim.toTimeString().slice(0, 5),
              observacoes: reserva.observacoes || ''
            });
          }
        } catch (error) {
          console.error('Erro ao carregar reserva:', error);
          setError('Erro ao carregar dados da reserva');
        } finally {
          setLoading(false);
        }
      };
      
      carregarReserva();
    }
  }, [reservaId]);

  const verificarDisponibilidade = useCallback(async () => {
    try {
      setLoading(true);
      const dataInicioCompleta = `${formData.dataInicio}T${formData.horaInicio}:00.000Z`;
      const dataFimCompleta = `${formData.dataFim}T${formData.horaFim}:00.000Z`;
      
      const params = new URLSearchParams({
        condominioId: formData.condominioId,
        dataInicio: dataInicioCompleta,
        dataFim: dataFimCompleta,
        ...(reservaId && { excluirVagaId: formData.vagaId })
      });

      const response = await fetch(`/api/reservas/disponibilidade?${params}`);
      const result: DisponibilidadeResponse = await response.json();
      
      if (result.success && result.data) {
        setVagasDisponiveis(result.data.vagas.disponiveis);
      } else {
        setError(result.error || 'Erro ao verificar disponibilidade');
        setVagasDisponiveis([]);
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      setError('Erro ao verificar disponibilidade das vagas');
      setVagasDisponiveis([]);
    } finally {
      setLoading(false);
    }
  }, [
    formData.condominioId,
    formData.dataFim,
    formData.dataInicio,
    formData.horaFim,
    formData.horaInicio,
    formData.vagaId,
    reservaId,
  ]);

  // Verificar disponibilidade quando datas e condomínio mudarem
  useEffect(() => {
    if (formData.condominioId && formData.dataInicio && formData.dataFim && formData.horaInicio && formData.horaFim) {
      verificarDisponibilidade();
    }
  }, [
    formData.condominioId,
    formData.dataFim,
    formData.dataInicio,
    formData.horaFim,
    formData.horaInicio,
    verificarDisponibilidade,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vagaId || !formData.condominioId || 
        !formData.dataInicio || !formData.horaInicio || !formData.dataFim || !formData.horaFim) {
      setError('Todos os campos obrigatórios devem ser preenchidos');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const dataInicioCompleta = `${formData.dataInicio}T${formData.horaInicio}:00.000Z`;
      const dataFimCompleta = `${formData.dataFim}T${formData.horaFim}:00.000Z`;
      
      const dadosReserva = {
        vagaId: formData.vagaId,
        condominioId: formData.condominioId,
        dataInicio: dataInicioCompleta,
        dataFim: dataFimCompleta,
        observacoes: formData.observacoes
      };

      const url = reservaId ? `/api/reservas/${reservaId}` : '/api/reservas';
      const method = reservaId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosReserva),
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(reservaId ? 'Reserva atualizada com sucesso!' : 'Reserva criada com sucesso!');
        if (onSuccess) {
          onSuccess();
        }
        
        // Limpar formulário se for nova reserva
        if (!reservaId) {
          setFormData({
            vagaId: '',
            condominioId: '',
            dataInicio: '',
            horaInicio: '',
            dataFim: '',
            horaFim: '',
            observacoes: ''
          });
          setVagasDisponiveis([]);
        }
      } else {
        setError(result.error || 'Erro ao salvar reserva');
      }
    } catch (error) {
      console.error('Erro ao salvar reserva:', error);
      setError('Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            {reservaId ? 'Editar Reserva' : 'Nova Reserva de Vaga'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção de Condomínio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPinIcon className="inline h-4 w-4 mr-1" />
              Condomínio *
            </label>
            <select
              value={formData.condominioId}
              onChange={(e) => setFormData({ ...formData, condominioId: e.target.value, vagaId: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um condomínio</option>
              {condominios.map((condominio) => (
                <option key={condominio.id} value={condominio.id}>
                  {condominio.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Data e Hora de Início */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Início *
              </label>
              <input
                type="date"
                value={formData.dataInicio}
                onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ClockIcon className="inline h-4 w-4 mr-1" />
                Hora de Início *
              </label>
              <input
                type="time"
                value={formData.horaInicio}
                onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Data e Hora de Fim */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Fim *
              </label>
              <input
                type="date"
                value={formData.dataFim}
                onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ClockIcon className="inline h-4 w-4 mr-1" />
                Hora de Fim *
              </label>
              <input
                type="time"
                value={formData.horaFim}
                onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Seleção de Vaga */}
          {vagasDisponiveis.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vaga Disponível *
              </label>
              <select
                value={formData.vagaId}
                onChange={(e) => setFormData({ ...formData, vagaId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione uma vaga</option>
                {vagasDisponiveis.map((vaga) => (
                  <option key={vaga.id} value={vaga.id}>
                    Vaga {vaga.numero} - {vaga.tipo} (Torre {vaga.unidade.torre.nome}, Unidade {vaga.unidade.numero})
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 mt-1">
                {vagasDisponiveis.length} vaga(s) disponível(is) no período selecionado
              </p>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Informações adicionais sobre a reserva..."
            />
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || vagasDisponiveis.length === 0}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : (reservaId ? 'Atualizar Reserva' : 'Criar Reserva')}
            </button>
            
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
