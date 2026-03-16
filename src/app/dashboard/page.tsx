'use client';

import Link from 'next/link';
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
  CheckCircle,
  XCircle,
  Bell,
  UserPlus,
  DollarSign,
  Home,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Evento {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  data: string;
  icone: string;
  cor: string;
}

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
}

interface EstatisticasAPI {
  perfil: string;
  cards: Record<string, number>;
  metricas: Record<string, number>;
  graficos?: {
    locacoesPorMes?: Array<{ mes: string; total: number; receita: number }>;
    topCondominios?: Array<{ nome: string; locacoes: number; receita: number }>;
  };
}

/**
 * Página principal do dashboard
 */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [estatisticas, setEstatisticas] = useState<EstatisticasAPI | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [estatisticasRes, eventosRes, notificacoesRes] = await Promise.all([
          fetch('/api/dashboard/estatisticas'),
          fetch('/api/dashboard/eventos'),
          fetch('/api/notificacoes?limite=5')
        ]);

        if (estatisticasRes.ok) {
          const dados = await estatisticasRes.json();
          setEstatisticas(dados);
        }

        if (eventosRes.ok) {
          const dados = await eventosRes.json();
          setEventos(dados);
        }

        if (notificacoesRes.ok) {
          const dados = await notificacoesRes.json();
          setNotificacoes(dados.notificacoes || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setCarregando(false);
      }
    };

    if (status === 'authenticated') {
      carregarDados();
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

  // Cards dinâmicos baseados no perfil
  const getCardsParaPerfil = () => {
    if (!estatisticas) return [];

    const { perfil, cards } = estatisticas;

    if (perfil === 'administrador_mestre') {
      return [
        { titulo: 'Condomínios', valor: cards.totalCondominios, icone: Building2, cor: 'bg-blue-500' },
        { titulo: 'Usuários Ativos', valor: cards.usuariosAtivos, icone: Users, cor: 'bg-green-500' },
        { titulo: 'Total de Vagas', valor: cards.totalVagas, icone: Car, cor: 'bg-purple-500' },
        { titulo: 'Vagas Disponíveis', valor: cards.vagasDisponiveis, icone: MapPin, cor: 'bg-teal-500' },
        { titulo: 'Locações Ativas', valor: cards.locacoesAtivas, icone: CheckCircle, cor: 'bg-emerald-500' },
        { titulo: 'Pendentes', valor: cards.locacoesPendentes, icone: Clock, cor: 'bg-yellow-500' },
        { titulo: 'Total Locações', valor: cards.totalLocacoes, icone: Calendar, cor: 'bg-indigo-500' },
        { titulo: 'Receita Total', valor: `R$ ${(cards.receitaTotal || 0).toFixed(2)}`, icone: DollarSign, cor: 'bg-green-600' },
      ];
    }

    if (perfil === 'sindico' || perfil === 'porteiro') {
      return [
        { titulo: 'Total de Vagas', valor: cards.totalVagas, icone: Car, cor: 'bg-blue-500' },
        { titulo: 'Vagas Disponíveis', valor: cards.vagasDisponiveis, icone: MapPin, cor: 'bg-teal-500' },
        { titulo: 'Unidades', valor: cards.totalUnidades, icone: Home, cor: 'bg-purple-500' },
        { titulo: 'Moradores', valor: cards.totalMoradores, icone: Users, cor: 'bg-green-500' },
        { titulo: 'Locações Ativas', valor: cards.locacoesAtivas, icone: CheckCircle, cor: 'bg-emerald-500' },
        { titulo: 'Pendentes', valor: cards.locacoesPendentes, icone: Clock, cor: 'bg-yellow-500' },
      ];
    }

    // Morador
    return [
      { titulo: 'Vagas Disponíveis', valor: cards.vagasDisponiveis, icone: Car, cor: 'bg-blue-500' },
      { titulo: 'Minhas Locações Ativas', valor: cards.minhasLocacoesAtivas, icone: CheckCircle, cor: 'bg-green-500' },
      { titulo: 'Aguardando Aprovação', valor: cards.minhasLocacoesPendentes, icone: Clock, cor: 'bg-yellow-500' },
      { titulo: 'Minhas Vagas Alugadas', valor: cards.minhasVagasAlugadas, icone: DollarSign, cor: 'bg-purple-500' },
    ];
  };

  // Métricas extras baseadas no perfil
  const getMetricasParaPerfil = () => {
    if (!estatisticas) return [];

    const { perfil, metricas } = estatisticas;

    if (perfil === 'administrador_mestre') {
      return [
        { titulo: 'Locações Hoje', valor: metricas.locacoesHoje, icone: Calendar, tendencia: 'up' },
        { titulo: 'Locações na Semana', valor: metricas.locacoesSemana, icone: BarChart3, tendencia: 'up' },
        { titulo: 'Locações no Mês', valor: metricas.locacoesMes, icone: TrendingUp, tendencia: 'up' },
        { titulo: 'Taxa de Ocupação', valor: `${metricas.taxaOcupacao}%`, icone: PieChart, tendencia: 'neutral' },
      ];
    }

    if (perfil === 'sindico' || perfil === 'porteiro') {
      return [
        { titulo: 'Locações no Mês', valor: metricas.locacoesMes, icone: Calendar, tendencia: 'up' },
        { titulo: 'Receita do Mês', valor: `R$ ${(metricas.receitaMes || 0).toFixed(2)}`, icone: DollarSign, tendencia: 'up' },
        { titulo: 'Taxa de Ocupação', valor: `${metricas.taxaOcupacao}%`, icone: PieChart, tendencia: 'neutral' },
      ];
    }

    // Morador
    return [
      { titulo: 'Gasto no Mês', valor: `R$ ${(metricas.totalGastoMes || 0).toFixed(2)}`, icone: ArrowDownRight, tendencia: 'down' },
      { titulo: 'Recebido no Mês', valor: `R$ ${(metricas.totalRecebidoMes || 0).toFixed(2)}`, icone: ArrowUpRight, tendencia: 'up' },
      { titulo: 'Ocupação do Condomínio', valor: `${metricas.taxaOcupacao}%`, icone: PieChart, tendencia: 'neutral' },
    ];
  };

  const cardsDinamicos = getCardsParaPerfil();
  const metricasDinamicas = getMetricasParaPerfil();

  // Função para obter ícone baseado no tipo
  const getIconeEvento = (icone: string) => {
    switch (icone) {
      case 'car': return Car;
      case 'check-circle': return CheckCircle;
      case 'x-circle': return XCircle;
      case 'alert-circle': return AlertTriangle;
      case 'clock': return Clock;
      case 'user-plus': return UserPlus;
      case 'calendar': return Calendar;
      default: return Bell;
    }
  };

  // Função para obter cor baseada no tipo
  const getCorEvento = (cor: string) => {
    switch (cor) {
      case 'green': return 'text-green-600 bg-green-100';
      case 'red': return 'text-red-600 bg-red-100';
      case 'yellow': return 'text-yellow-600 bg-yellow-100';
      case 'blue': return 'text-blue-600 bg-blue-100';
      case 'purple': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Função para formatar tempo relativo
  const formatarTempoRelativo = (data: string) => {
    const agora = new Date();
    const dataEvento = new Date(data);
    const diffMs = agora.getTime() - dataEvento.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin} min atrás`;
    if (diffHoras < 24) return `${diffHoras} hora${diffHoras > 1 ? 's' : ''} atrás`;
    if (diffDias < 7) return `${diffDias} dia${diffDias > 1 ? 's' : ''} atrás`;
    return dataEvento.toLocaleDateString('pt-BR');
  };

  // Função para obter cor da notificação
  const getCorNotificacao = (tipo: string) => {
    switch (tipo) {
      case 'LOCACAO_SOLICITADA': return { icone: AlertTriangle, cor: 'text-yellow-600 bg-yellow-100' };
      case 'LOCACAO_APROVADA': return { icone: CheckCircle, cor: 'text-green-600 bg-green-100' };
      case 'LOCACAO_REJEITADA': return { icone: XCircle, cor: 'text-red-600 bg-red-100' };
      case 'LOCACAO_CANCELADA': return { icone: XCircle, cor: 'text-gray-600 bg-gray-100' };
      default: return { icone: Bell, cor: 'text-blue-600 bg-blue-100' };
    }
  };

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

        {/* Cards de Estatísticas Principais */}
        <div className={cn(
          "grid gap-4",
          estatisticas?.perfil === 'administrador_mestre' 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" 
            : estatisticas?.perfil === 'sindico' || estatisticas?.perfil === 'porteiro'
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2"
        )}>
          {cardsDinamicos.map((card, index) => {
            const Icone = card.icone;
            return (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
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
                  <div className={cn('p-3 rounded-lg', card.cor)}>
                    <Icone className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Métricas Adicionais */}
        {metricasDinamicas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {metricasDinamicas.map((metrica, index) => {
              const Icone = metrica.icone;
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      metrica.tendencia === 'up' ? 'bg-green-100' : 
                      metrica.tendencia === 'down' ? 'bg-red-100' : 'bg-gray-100'
                    )}>
                      <Icone className={cn(
                        'w-5 h-5',
                        metrica.tendencia === 'up' ? 'text-green-600' : 
                        metrica.tendencia === 'down' ? 'text-red-600' : 'text-gray-600'
                      )} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">{metrica.titulo}</p>
                      <p className="text-lg font-bold text-gray-900">{metrica.valor}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Gráficos para Admin Mestre */}
        {estatisticas?.perfil === 'administrador_mestre' && estatisticas.graficos && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Locações por Mês */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Locações por Mês
              </h3>
              <div className="space-y-3">
                {estatisticas.graficos.locacoesPorMes?.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Sem dados</p>
                ) : (
                  estatisticas.graficos.locacoesPorMes?.map((item, index) => {
                    const maxTotal = Math.max(...(estatisticas.graficos?.locacoesPorMes?.map(l => l.total) || [1]));
                    const porcentagem = (item.total / maxTotal) * 100;
                    const mesFormatado = new Date(item.mes).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-16">{mesFormatado}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4">
                          <div 
                            className="bg-blue-500 h-4 rounded-full transition-all"
                            style={{ width: `${porcentagem}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8">{item.total}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top Condomínios */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Condomínios por Locações
              </h3>
              <div className="space-y-3">
                {estatisticas.graficos.topCondominios?.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Sem dados</p>
                ) : (
                  estatisticas.graficos.topCondominios?.map((cond, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                          index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-400" : "bg-gray-300"
                        )}>
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{cond.nome}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{cond.locacoes} locações</p>
                        <p className="text-xs text-green-600">R$ {cond.receita.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

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
                {eventos.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhuma atividade recente
                  </p>
                ) : (
                  eventos.map((evento) => {
                    const Icone = getIconeEvento(evento.icone);
                    const cor = getCorEvento(evento.cor);
                    return (
                      <div key={evento.id} className="flex items-start space-x-3">
                        <div className={cn('p-2 rounded-lg', cor)}>
                          <Icone className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {evento.titulo}
                          </p>
                          <p className="text-sm text-gray-600">
                            {evento.descricao}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatarTempoRelativo(evento.data)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Notificações */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notificações
              </h3>
              {notificacoes.filter(n => !n.lida).length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {notificacoes.filter(n => !n.lida).length} novas
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {notificacoes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhuma notificação
                  </p>
                ) : (
                  notificacoes.map((notificacao) => {
                    const { icone: Icone, cor } = getCorNotificacao(notificacao.tipo);
                    return (
                      <div 
                        key={notificacao.id} 
                        className={cn(
                          "flex items-start space-x-3",
                          !notificacao.lida && "bg-blue-50 -mx-2 px-2 py-2 rounded-lg"
                        )}
                      >
                        <div className={cn('p-2 rounded-lg', cor)}>
                          <Icone className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notificacao.titulo}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notificacao.mensagem}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatarTempoRelativo(notificacao.criadoEm)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas - Dinâmicas por perfil */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {estatisticas?.perfil === 'administrador_mestre' && (
              <>
                <Link href="/dashboard/condominios/novo" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <Building2 className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Novo Condomínio</h4>
                  <p className="text-sm text-gray-600">Cadastrar um novo condomínio</p>
                </Link>
                <Link href="/dashboard/usuarios" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <Users className="w-8 h-8 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Gerenciar Usuários</h4>
                  <p className="text-sm text-gray-600">Adicionar ou editar usuários</p>
                </Link>
                <Link href="/reservas-admin" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <BarChart3 className="w-8 h-8 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Monitoramento Global</h4>
                  <p className="text-sm text-gray-600">Ver locacoes de todos os condominios</p>
                </Link>
              </>
            )}
            {estatisticas?.perfil === 'sindico' && (
              <>
                <Link href="/dashboard/estrutura/vagas" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <Car className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Gerenciar Vagas</h4>
                  <p className="text-sm text-gray-600">Administrar vagas do condomínio</p>
                </Link>
                <Link href="/dashboard/estrutura/unidades" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <Home className="w-8 h-8 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Gerenciar Unidades</h4>
                  <p className="text-sm text-gray-600">Administrar unidades</p>
                </Link>
                <Link href="/reservas-sindico" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <Calendar className="w-8 h-8 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Monitoramento de Locações</h4>
                  <p className="text-sm text-gray-600">Acompanhar locações, placas e ocorrências</p>
                </Link>
              </>
            )}
            {estatisticas?.perfil === 'porteiro' && (
              <>
                <Link href="/reservas-sindico" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <Calendar className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Monitoramento de Veículos</h4>
                  <p className="text-sm text-gray-600">Consultar locações ativas, placas e acessos</p>
                </Link>
              </>
            )}
            {estatisticas?.perfil === 'morador' && (
              <>
                <Link href="/locacao" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <Car className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Alugar Vaga</h4>
                  <p className="text-sm text-gray-600">Encontrar vagas disponíveis</p>
                </Link>
                <Link href="/minhas-locacoes" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <Calendar className="w-8 h-8 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Minhas Locações</h4>
                  <p className="text-sm text-gray-600">Acompanhar suas locações</p>
                </Link>
                <Link href="/minhas-vagas" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left block">
                  <DollarSign className="w-8 h-8 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Minhas Vagas</h4>
                  <p className="text-sm text-gray-600">Gerenciar suas vagas</p>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
