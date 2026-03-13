'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertCircleIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react';
import { Layout } from '@/components';
import ReservaForm from '@/components/reservas/ReservaForm';
import ReservasList from '@/components/reservas/ReservasList';

interface Condominio {
  id: string;
  nome: string;
}

interface EstatisticasReservas {
  totalReservas: number;
  reservasAtivas: number;
  reservasHoje: number;
  vagasDisponiveis: number;
  reservasPorStatus: {
    ativa: number;
    cancelada: number;
    expirada: number;
    concluida: number;
  };
}

export default function ReservasPage() {
  const { data: session } = useSession();
  const usuario = session?.user as any;

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasReservas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('lista');
  const [reservaEditandoId, setReservaEditandoId] = useState<string | null>(null);
  const [condominioPreSelecionado, setCondominioPreSelecionado] = useState('');

  const carregarEstatisticas = useCallback(async () => {
    try {
      const response = await fetch('/api/reservas/estatisticas');
      const data = await response.json();

      if (data.success) {
        setEstatisticas(data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar estatisticas:', err);
    }
  }, []);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const condominiosResponse = await fetch('/api/condominios');
      const condominiosData = await condominiosResponse.json();

      const listaCondominios: Condominio[] =
        condominiosData?.success && Array.isArray(condominiosData?.data)
          ? condominiosData.data
          : Array.isArray(condominiosData?.condominios)
            ? condominiosData.condominios
            : [];

      setCondominios(listaCondominios);

      if (usuario?.perfis && usuario.perfis.length > 0) {
        setCondominioPreSelecionado(usuario.perfis[0].condominioId);
      }

      await carregarEstatisticas();
    } catch {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [carregarEstatisticas, usuario]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleNovaReserva = () => {
    setReservaEditandoId(null);
    setActiveTab('nova');
  };

  const handleEditarReserva = (reservaId: string) => {
    setReservaEditandoId(reservaId);
    setActiveTab('nova');
  };

  const handleReservaSuccess = () => {
    setReservaEditandoId(null);
    setActiveTab('lista');
    carregarEstatisticas();
  };

  const handleRefresh = () => {
    carregarEstatisticas();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <ClockIcon className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Carregando sistema de reservas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo="Sistema de Reservas" subtitulo="Gerencie reservas de vagas temporarias do condominio">
      <div className="space-y-8">
        <div className="flex justify-end">
          <button
            onClick={handleNovaReserva}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            Nova Reserva
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {estatisticas && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Reservas</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.totalReservas}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reservas Ativas</p>
                  <p className="text-2xl font-bold text-green-600">{estatisticas.reservasAtivas}</p>
                </div>
                <TrendingUpIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reservas Hoje</p>
                  <p className="text-2xl font-bold text-orange-600">{estatisticas.reservasHoje}</p>
                </div>
                <ClockIcon className="h-8 w-8 text-orange-600" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vagas Disponiveis</p>
                  <p className="text-2xl font-bold text-purple-600">{estatisticas.vagasDisponiveis}</p>
                </div>
                <MapPinIcon className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-white shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('lista')}
                className={`border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === 'lista'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <UsersIcon className="mr-2 inline h-4 w-4" />
                Lista de Reservas
              </button>
              <button
                onClick={() => setActiveTab('nova')}
                className={`border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === 'nova'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <PlusIcon className="mr-2 inline h-4 w-4" />
                {reservaEditandoId ? 'Editar Reserva' : 'Nova Reserva'}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'lista' && (
              <ReservasList
                condominios={condominios}
                onEdit={handleEditarReserva}
                onRefresh={handleRefresh}
              />
            )}

            {activeTab === 'nova' && (
              <div className="mx-auto max-w-2xl">
                <ReservaForm
                  condominios={condominios}
                  onSuccess={handleReservaSuccess}
                  onCancel={() => {
                    setActiveTab('lista');
                  }}
                  reservaId={reservaEditandoId || undefined}
                  condominioPreSelecionado={condominioPreSelecionado}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
