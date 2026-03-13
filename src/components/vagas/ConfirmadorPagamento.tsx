'use client';

import React, { useState } from 'react';
import { Reserva } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle, Clock, CreditCard } from 'lucide-react';

interface ConfirmadorPagamentoProps {
  reserva: Reserva;
  onPagamentoConfirmado: (reserva: Reserva) => void;
}

export function ConfirmadorPagamento({ reserva, onPagamentoConfirmado }: ConfirmadorPagamentoProps) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<'PIX' | 'CARTAO' | 'TRANSFERENCIA' | 'MANUAL'>('MANUAL');

  const handleConfirmarPagamento = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const response = await fetch(`/api/reservas/${reserva.id}/pagamento`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusPagamento: 'CONFIRMADO',
          metodo,
        }),
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.error || 'Erro ao confirmar pagamento');
      }

      await response.json();
      onPagamentoConfirmado({
        ...reserva,
        statusPagamento: 'CONFIRMADO',
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  };

  const getStatusIcon = () => {
    switch (reserva.statusPagamento) {
      case 'CONFIRMADO':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'PENDENTE':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'CANCELADO':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case 'REEMBOLSADO':
        return <CheckCircle className="h-6 w-6 text-blue-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusLabel = () => {
    switch (reserva.statusPagamento) {
      case 'CONFIRMADO':
        return 'Pagamento Confirmado';
      case 'PENDENTE':
        return 'Aguardando Pagamento';
      case 'CANCELADO':
        return 'Pagamento Cancelado';
      case 'REEMBOLSADO':
        return 'Reembolsado';
      default:
        return 'Status Desconhecido';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle>{getStatusLabel()}</CardTitle>
              <CardDescription>Vaga {reserva.vaga?.numero}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Informações de Pagamento */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Valor</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {reserva.valor ? reserva.valor.toFixed(2) : '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-semibold">
                  {reserva.statusPagamento === 'CONFIRMADO' ? '✓ Pago' : '⏳ Pendente'}
                </p>
              </div>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {erro && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{erro}</p>
            </div>
          )}

          {/* Ações */}
          {reserva.statusPagamento === 'PENDENTE' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Método de Pagamento</label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value as any)}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MANUAL">Pagamento Manual (Comprovante)</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="TRANSFERENCIA">Transferência Bancária</option>
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Instruções:</strong> Após confirmar o pagamento, você receberá um comprovante por email.
                  O proprietário será notificado e poderá confirmar a disponibilidade da vaga.
                </p>
              </div>

              <Button
                onClick={handleConfirmarPagamento}
                disabled={carregando}
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {carregando ? 'Confirmando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          )}

          {reserva.statusPagamento === 'CONFIRMADO' && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-900">
                ✓ Pagamento confirmado! O proprietário foi notificado e em breve entrará em contato.
              </p>
            </div>
          )}

          {reserva.statusPagamento === 'CANCELADO' && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-900">
                ✗ Este pagamento foi cancelado. Você pode criar uma nova reserva se desejar.
              </p>
            </div>
          )}

          {reserva.statusPagamento === 'REEMBOLSADO' && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                ↩ Este pagamento foi reembolsado. O valor será devolvido em sua conta.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
