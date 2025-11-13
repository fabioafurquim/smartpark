'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock as ClockIcon, 
  MapPin as MapPinIcon, 
  User as UserIcon, 
  MoreVertical as MoreVerticalIcon,
  Edit as EditIcon,
  X as XIcon,
  Check as CheckIcon,
  Filter as FilterIcon,
  RefreshCw as RefreshCwIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Reserva {
  id: string;
  dataInicio: string;
  dataFim: string;
  status: 'ativa' | 'cancelada' | 'expirada' | 'concluida';
  observacoes?: string;
  criadoEm: string;
  vaga: {
    id: string;
    numero: string;
    tipo: string;
    unidade: {
      numero: string;
      torre: {
        nome: string;
      };
    };
  };
  usuario: {
    id: string;
    nome: string;
    email: string;
  };
  condominio: {
    id: string;
    nome: string;
  };
}

interface Condominio {
  id: string;
  nome: string;
}

interface ReservasListProps {
  condominios: Condominio[];
  onEdit?: (reservaId: string) => void;
  onRefresh?: () => void;
}

const statusColors = {
  ativa: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  expirada: 'bg-gray-100 text-gray-800',
  concluida: 'bg-blue-100 text-blue-800',
} as const;

const statusLabels = {
  ativa: 'Ativa',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
  concluida: 'Concluída',
};

export default function ReservasList({ condominios, onEdit, onRefresh }: ReservasListProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    condominioId: '',
    status: '',
    dataInicio: '',
    dataFim: '',
    usuarioNome: '',
  });

  useEffect(() => {
    carregarReservas();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      carregarReservas();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filtros]);

  const carregarReservas = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (filtros.condominioId) params.append('condominioId', filtros.condominioId);
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.dataInicio) params.append('dataInicio', new Date(filtros.dataInicio).toISOString());
      if (filtros.dataFim) params.append('dataFim', new Date(filtros.dataFim).toISOString());

      const response = await fetch(`/api/reservas?${params}`);
      const data = await response.json();

      if (data.success) {
        let reservasFiltradas = data.data;

        // Filtro por nome do usuário (client-side)
        if (filtros.usuarioNome) {
          const termo = filtros.usuarioNome.toLowerCase();
          reservasFiltradas = reservasFiltradas.filter((reserva: Reserva) =>
            reserva.usuario.nome.toLowerCase().includes(termo) ||
            reserva.usuario.email.toLowerCase().includes(termo)
          );
        }

        setReservas(reservasFiltradas);
      } else {
        setError(data.error || 'Erro ao carregar reservas');
      }
    } catch (err) {
      setError('Erro ao carregar reservas');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reservaId: string, novoStatus: string) => {
    try {
      const response = await fetch(`/api/reservas/${reservaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: novoStatus }),
      });

      const data = await response.json();

      if (data.success) {
        await carregarReservas();
        if (onRefresh) onRefresh();
      } else {
        setError(data.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      setError('Erro ao atualizar status');
    }
  };

  const handleCancelarReserva = async (reservaId: string) => {
    if (confirm('Tem certeza que deseja cancelar esta reserva?')) {
      await handleStatusChange(reservaId, 'cancelada');
    }
  };

  const formatarData = (data: string) => {
    try {
      return format(new Date(data), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Reservas de Vagas</h2>
          </div>
          <button
            onClick={carregarReservas}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPinIcon className="inline h-4 w-4 mr-1" />
              Condomínio
            </label>
            <select
              value={filtros.condominioId}
              onChange={(e) => setFiltros({ ...filtros, condominioId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {condominios.map((condominio) => (
                <option key={condominio.id} value={condominio.id}>
                  {condominio.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filtros.status}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="ativa">Ativa</option>
              <option value="cancelada">Cancelada</option>
              <option value="expirada">Expirada</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="inline h-4 w-4 mr-1" />
              Usuário
            </label>
            <input
              type="text"
              placeholder="Nome ou email"
              value={filtros.usuarioNome}
              onChange={(e) => setFiltros({ ...filtros, usuarioNome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vaga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Carregando reservas...
                  </td>
                </tr>
              ) : reservas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma reserva encontrada
                  </td>
                </tr>
              ) : (
                reservas.map((reserva) => (
                  <tr key={reserva.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Vaga {reserva.vaga.numero}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reserva.vaga.tipo} - {reserva.vaga.unidade.torre.nome}, Unidade {reserva.vaga.unidade.numero}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {reserva.usuario.nome}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reserva.usuario.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {formatarData(reserva.dataInicio)}
                          </div>
                          <div className="text-sm text-gray-500">
                            até {formatarData(reserva.dataFim)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[reserva.status]}`}>
                        {statusLabels[reserva.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatarData(reserva.criadoEm)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(reserva.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                        )}
                        {reserva.status === 'ativa' && (
                          <button
                            onClick={() => handleCancelarReserva(reserva.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        )}
                        {reserva.status === 'ativa' && (
                          <button
                            onClick={() => handleStatusChange(reserva.id, 'concluida')}
                            className="text-green-600 hover:text-green-900"
                            title="Marcar como concluída"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Resumo */}
        {reservas.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>Total: {reservas.length} reserva(s)</span>
            <div className="flex gap-4">
              <span>Ativas: {reservas.filter(r => r.status === 'ativa').length}</span>
              <span>Canceladas: {reservas.filter(r => r.status === 'cancelada').length}</span>
              <span>Concluídas: {reservas.filter(r => r.status === 'concluida').length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}