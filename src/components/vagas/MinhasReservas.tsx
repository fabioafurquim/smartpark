'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Reserva } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Calendar, DollarSign, Trash2 } from 'lucide-react';

interface MinhasReservasProps {
  usuarioId: string;
}

export function MinhasReservas({ usuarioId }: MinhasReservasProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('ativa');

  const carregarReservas = useCallback(async () => {
    try {
      setCarregando(true);
      const response = await fetch(`/api/reservas?usuarioId=${usuarioId}`);
      if (!response.ok) throw new Error('Erro ao carregar reservas');
      const dados = await response.json();
      setReservas(dados.data || []);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    carregarReservas();
  }, [carregarReservas]);

  const handleCancelarReserva = async (reservaId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;

    try {
      const response = await fetch(`/api/reservas/${reservaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.error || 'Erro ao cancelar reserva');
      }

      setReservas(reservas.filter(r => r.id !== reservaId));
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      ativa: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativa' },
      cancelada: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
      expirada: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expirada' },
      concluida: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Concluída' },
    };

    const config = statusMap[status] || statusMap.ativa;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getStatusPagamentoBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      PENDENTE: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Aguardando Pagamento' },
      CONFIRMADO: { bg: 'bg-green-100', text: 'text-green-800', label: 'Pago' },
      CANCELADO: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
      REEMBOLSADO: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Reembolsado' },
    };

    const config = statusMap[status] || statusMap.PENDENTE;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const reservasFiltradas = reservas.filter(r => filtroStatus === 'todas' || r.status === filtroStatus);

  if (carregando) {
    return <div className="text-center py-8">Carregando suas reservas...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Minhas Reservas</h2>
        <p className="text-gray-600">
          {reservasFiltradas.length} reserva{reservasFiltradas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{erro}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['todas', 'ativa', 'cancelada', 'expirada', 'concluida'].map(status => (
          <button
            key={status}
            onClick={() => setFiltroStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filtroStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {status === 'todas' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista de Reservas */}
      {reservasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-600">
              Nenhuma reserva {filtroStatus !== 'todas' ? `com status "${filtroStatus}"` : ''}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reservasFiltradas.map(reserva => (
            <Card key={reserva.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Informações Principais */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Vaga</p>
                      <p className="font-bold text-lg">
                        {reserva.vaga ? `Vaga ${reserva.vaga.numero}` : 'Vaga não encontrada'}
                      </p>
                      {reserva.vaga?.unidade && (
                        <p className="text-sm text-gray-600">
                          Unidade {reserva.vaga.unidade.numero}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(reserva.status)}
                      {getStatusPagamentoBadge(reserva.statusPagamento)}
                    </div>
                  </div>

                  {/* Datas e Valores */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Período
                      </p>
                      <p className="font-semibold">
                        {formatarData(reserva.dataInicio)} até {formatarData(reserva.dataFim)}
                      </p>
                    </div>

                    {reserva.tipoLocacao && (
                      <div>
                        <p className="text-sm text-gray-600">Tipo de Locação</p>
                        <p className="font-semibold">{reserva.tipoLocacao}</p>
                      </div>
                    )}

                    {reserva.valor !== null && reserva.valor !== undefined && (
                      <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Valor Total</p>
                          <p className="font-bold text-lg text-blue-600">
                            R$ {reserva.valor.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações */}
                {reserva.observacoes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">Observações</p>
                    <p className="text-gray-800">{reserva.observacoes}</p>
                  </div>
                )}

                {/* Ações */}
                {reserva.status === 'ativa' && (
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button
                      onClick={() => handleCancelarReserva(reserva.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancelar Reserva
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
