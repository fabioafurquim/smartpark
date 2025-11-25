'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CalendarIcon, 
  PlusIcon, 
  MapPinIcon, 
  ClockIcon,
  UsersIcon,
  TrendingUpIcon,
  AlertCircleIcon
} from 'lucide-react';
import { Layout } from '@/components';
import ReservaForm from '@/components/reservas/ReservaForm';
import ReservasList from '@/components/reservas/ReservasList';

interface Condominio {
  id: string;
  nome: string;
}

interface Vaga {
  id: string;
  numero: string;
  tipo: string;
  unidade: {
    id: string;
    numero: string;
    torre: {
      id: string;
      nome: string;
    };
  };
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
  const [vagasDisponiveis, setVagasDisponiveis] = useState<Vaga[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasReservas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('lista');
  const [showNovaReserva, setShowNovaReserva] = useState(false);
  const [reservaEditandoId, setReservaEditandoId] = useState<string | null>(null);
  const [condominioPreSelecionado, setCondominioPreSelecionado] = useState<string>('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar condomínios
      const condominiosResponse = await fetch('/api/condominios');
      const condominiosData = await condominiosResponse.json();

      const listaCondominios: Condominio[] =
        (condominiosData?.success && Array.isArray(condominiosData?.data)) ? condominiosData.data :
        (Array.isArray(condominiosData?.condominios)) ? condominiosData.condominios : [];
      setCondominios(listaCondominios ?? []);

      // Pré-selecionar condomínio do usuário logado
      if (usuario?.perfis && usuario.perfis.length > 0) {
        const condominioDoUsuario = usuario.perfis[0].condominioId;
        setCondominioPreSelecionado(condominioDoUsuario);
      }

      // Carregar estatísticas
      await carregarEstatisticas();

    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const response = await fetch('/api/reservas/estatisticas');
      const data = await response.json();

      if (data.success) {
        setEstatisticas(data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const carregarVagasDisponiveis = async (condominioId: string, dataInicio: string, dataFim: string) => {
    try {
      const params = new URLSearchParams({
        condominioId,
        dataInicio: new Date(dataInicio).toISOString(),
        dataFim: new Date(dataFim).toISOString(),
      });

      const response = await fetch(`/api/reservas/disponibilidade?${params}`);
      const data = await response.json();

      if (data.success) {
        setVagasDisponiveis(data.data);
      } else {
        setVagasDisponiveis([]);
      }
    } catch (err) {
      setVagasDisponiveis([]);
    }
  };

  const handleNovaReserva = () => {
    setReservaEditandoId(null);
    setShowNovaReserva(true);
    setActiveTab('nova');
  };

  const handleEditarReserva = (reservaId: string) => {
    setReservaEditandoId(reservaId);
    setShowNovaReserva(true);
    setActiveTab('nova');
  };

  const handleReservaSuccess = () => {
    setShowNovaReserva(false);
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <ClockIcon className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Carregando sistema de reservas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo="Sistema de Reservas" subtitulo="Gerencie reservas de vagas temporárias do condomínio">
      <div className="space-y-8">
      {/* Botão Nova Reserva */}
      <div className="flex justify-end">
        <button
          onClick={handleNovaReserva}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Nova Reserva
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Reservas</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.totalReservas}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reservas Ativas</p>
                <p className="text-2xl font-bold text-green-600">{estatisticas.reservasAtivas}</p>
              </div>
              <TrendingUpIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reservas Hoje</p>
                <p className="text-2xl font-bold text-orange-600">{estatisticas.reservasHoje}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vagas Disponíveis</p>
                <p className="text-2xl font-bold text-purple-600">{estatisticas.vagasDisponiveis}</p>
              </div>
              <MapPinIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('lista')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'lista'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="inline h-4 w-4 mr-2" />
              Lista de Reservas
            </button>
            <button
              onClick={() => setActiveTab('nova')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'nova'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PlusIcon className="inline h-4 w-4 mr-2" />
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
            <div className="max-w-2xl mx-auto">
              <ReservaForm
                condominios={condominios}
                vagasDisponiveis={vagasDisponiveis}
                onVagasDisponiveisChange={carregarVagasDisponiveis}
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