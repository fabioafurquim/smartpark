'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Layout } from '@/components/Layout';
import { 
  Building2, 
  Users, 
  Car, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  MapPin,
  Clock,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EstatisticasDashboard } from '@/types';

/**
 * Página principal do dashboard
 */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [estatisticas, setEstatisticas] = useState<EstatisticasDashboard | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        const response = await fetch('/api/dashboard/estatisticas');
        if (response.ok) {
          const dados = await response.json();
          setEstatisticas(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setCarregando(false);
      }
    };

    if (status === 'authenticated') {
      carregarEstatisticas();
    }
  }, [status]);

  if (status === 'loading' || carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  const cards = [
    {
      titulo: 'Total de Condomínios',
      valor: estatisticas?.totalCondominios || 0,
      icone: Building2,
      cor: 'bg-blue-500',
      tendencia: '+12%',
    },
    {
      titulo: 'Usuários Ativos',
      valor: estatisticas?.usuariosAtivos || 0,
      icone: Users,
      cor: 'bg-green-500',
      tendencia: '+8%',
    },
    {
      titulo: 'Vagas Totais',
      valor: estatisticas?.totalVagas || 0,
      icone: Car,
      cor: 'bg-purple-500',
      tendencia: '+5%',
    },
    {
      titulo: 'Ocupação Atual',
      valor: `${estatisticas?.ocupacaoAtual || 0}%`,
      icone: TrendingUp,
      cor: 'bg-orange-500',
      tendencia: '-3%',
    },
  ];

  const atividadesRecentes = [
    {
      id: 1,
      tipo: 'cadastro',
      descricao: 'Novo condomínio "Residencial Jardins" cadastrado',
      tempo: '2 horas atrás',
      icone: Building2,
      cor: 'text-blue-600',
    },
    {
      id: 2,
      tipo: 'usuario',
      descricao: 'Usuário João Silva ativado no sistema',
      tempo: '4 horas atrás',
      icone: Users,
      cor: 'text-green-600',
    },
    {
      id: 3,
      tipo: 'vaga',
      descricao: 'Vaga A-15 liberada no Condomínio Central',
      tempo: '6 horas atrás',
      icone: Car,
      cor: 'text-purple-600',
    },
    {
      id: 4,
      tipo: 'alerta',
      descricao: 'Manutenção programada para o sistema',
      tempo: '1 dia atrás',
      icone: AlertTriangle,
      cor: 'text-orange-600',
    },
  ];

  const alertas = [
    {
      id: 1,
      tipo: 'warning',
      titulo: 'Vagas Limitadas',
      descricao: 'Condomínio Torres tem apenas 5% de vagas disponíveis',
      tempo: '30 min atrás',
    },
    {
      id: 2,
      tipo: 'info',
      titulo: 'Backup Realizado',
      descricao: 'Backup automático dos dados concluído com sucesso',
      tempo: '2 horas atrás',
    },
    {
      id: 3,
      tipo: 'success',
      titulo: 'Sistema Atualizado',
      descricao: 'Nova versão do SmartPark instalada',
      tempo: '1 dia atrás',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bem-vindo, {session?.user?.name}!
          </h1>
          <p className="text-gray-600">
            Aqui está um resumo das atividades do seu sistema SmartPark
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => {
            const Icone = card.icone;
            return (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {card.titulo}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {card.valor}
                    </p>
                  </div>
                  <div className={cn(
                    'p-3 rounded-lg',
                    card.cor
                  )}>
                    <Icone className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-green-600 font-medium">
                    {card.tendencia}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    vs. mês anterior
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Atividades Recentes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Atividades Recentes
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {atividadesRecentes.map((atividade) => {
                  const Icone = atividade.icone;
                  return (
                    <div key={atividade.id} className="flex items-start space-x-3">
                      <div className={cn(
                        'p-2 rounded-lg bg-gray-100',
                        atividade.cor
                      )}>
                        <Icone className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          {atividade.descricao}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {atividade.tempo}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Alertas e Notificações */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Alertas e Notificações
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {alertas.map((alerta) => {
                  const icones = {
                    warning: AlertTriangle,
                    info: Clock,
                    success: CheckCircle,
                  };
                  
                  const cores = {
                    warning: 'text-orange-600 bg-orange-100',
                    info: 'text-blue-600 bg-blue-100',
                    success: 'text-green-600 bg-green-100',
                  };

                  const Icone = icones[alerta.tipo as keyof typeof icones];
                  const cor = cores[alerta.tipo as keyof typeof cores];

                  return (
                    <div key={alerta.id} className="flex items-start space-x-3">
                      <div className={cn('p-2 rounded-lg', cor)}>
                        <Icone className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {alerta.titulo}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {alerta.descricao}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alerta.tempo}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Building2 className="w-8 h-8 text-primary-600 mb-2" />
              <h4 className="font-medium text-gray-900">Novo Condomínio</h4>
              <p className="text-sm text-gray-600">Cadastrar um novo condomínio</p>
            </button>
            
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Users className="w-8 h-8 text-primary-600 mb-2" />
              <h4 className="font-medium text-gray-900">Gerenciar Usuários</h4>
              <p className="text-sm text-gray-600">Adicionar ou editar usuários</p>
            </button>
            
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <TrendingUp className="w-8 h-8 text-primary-600 mb-2" />
              <h4 className="font-medium text-gray-900">Relatórios</h4>
              <p className="text-sm text-gray-600">Visualizar relatórios detalhados</p>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}