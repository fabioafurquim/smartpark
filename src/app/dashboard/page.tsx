'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  DollarSign,
  Home,
  MapPin,
  PieChart,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
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
  contexto?: {
    usaEmprestimo: boolean;
    usaLocacao: boolean;
    usaSomenteEmprestimo: boolean;
    usaSomenteLocacao: boolean;
  };
  graficos?: {
    locacoesPorMes?: Array<{ mes: string; total: number; receita: number }>;
    topCondominios?: Array<{ nome: string; locacoes: number; receita: number }>;
  };
}

interface CardDashboard {
  titulo: string;
  valor: string | number;
  icone: React.ComponentType<{ className?: string }>;
  cor: string;
}

interface MetricaDashboard {
  titulo: string;
  valor: string | number;
  icone: React.ComponentType<{ className?: string }>;
  tendencia: 'up' | 'down' | 'neutral';
}

function obterRotuloOperacao(contexto?: EstatisticasAPI['contexto']) {
  if (contexto?.usaSomenteEmprestimo) {
    return {
      plural: 'Emprestimos',
      singular: 'emprestimo',
    };
  }

  if (contexto?.usaSomenteLocacao) {
    return {
      plural: 'Locacoes',
      singular: 'locacao',
    };
  }

  return {
    plural: 'Usos',
    singular: 'uso',
  };
}

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
          fetch('/api/notificacoes?limite=5'),
        ]);

        if (estatisticasRes.ok) {
          setEstatisticas(await estatisticasRes.json());
        }

        if (eventosRes.ok) {
          setEventos(await eventosRes.json());
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
      void carregarDados();
    }
  }, [status]);

  const rotuloOperacao = useMemo(
    () => obterRotuloOperacao(estatisticas?.contexto),
    [estatisticas?.contexto]
  );

  const cardsDinamicos = useMemo<CardDashboard[]>(() => {
    if (!estatisticas) {
      return [];
    }

    const { perfil, cards, contexto } = estatisticas;
    const usaLocacao = !!contexto?.usaLocacao;

    if (perfil === 'administrador_mestre') {
      const base: CardDashboard[] = [
        { titulo: 'Condominios', valor: cards.totalCondominios, icone: Building2, cor: 'bg-blue-500' },
        { titulo: 'Usuarios ativos', valor: cards.usuariosAtivos, icone: Users, cor: 'bg-green-500' },
        { titulo: 'Total de vagas', valor: cards.totalVagas, icone: Car, cor: 'bg-purple-500' },
        { titulo: 'Vagas disponiveis', valor: cards.vagasDisponiveis, icone: MapPin, cor: 'bg-teal-500' },
        { titulo: `${rotuloOperacao.plural} ativos`, valor: cards.locacoesAtivas, icone: CheckCircle, cor: 'bg-emerald-500' },
        { titulo: 'Cadastros pendentes', valor: cards.solicitacoesCadastroPendentes, icone: Clock, cor: 'bg-yellow-500' },
        { titulo: `Total de ${rotuloOperacao.plural.toLowerCase()}`, valor: cards.totalLocacoes, icone: Calendar, cor: 'bg-indigo-500' },
      ];

      if (usaLocacao) {
        return [
          ...base,
          {
            titulo: 'Receita total',
            valor: `R$ ${(cards.receitaTotal || 0).toFixed(2)}`,
            icone: DollarSign,
            cor: 'bg-green-600',
          },
        ];
      }

      return [
        ...base,
        {
          titulo: `${rotuloOperacao.plural} finalizados`,
          valor: cards.locacoesFinalizadas,
          icone: CheckCircle,
          cor: 'bg-slate-500',
        },
      ];
    }

    if (perfil === 'sindico' || perfil === 'porteiro') {
      return [
        { titulo: 'Total de vagas', valor: cards.totalVagas, icone: Car, cor: 'bg-blue-500' },
        { titulo: 'Vagas disponiveis', valor: cards.vagasDisponiveis, icone: MapPin, cor: 'bg-teal-500' },
        { titulo: 'Unidades', valor: cards.totalUnidades, icone: Home, cor: 'bg-purple-500' },
        { titulo: 'Moradores', valor: cards.totalMoradores, icone: Users, cor: 'bg-green-500' },
        { titulo: `${rotuloOperacao.plural} ativos`, valor: cards.locacoesAtivas, icone: CheckCircle, cor: 'bg-emerald-500' },
        perfil === 'porteiro'
          ? {
              titulo: `${rotuloOperacao.plural} finalizados`,
              valor: cards.locacoesFinalizadas,
              icone: Calendar,
              cor: 'bg-slate-500',
            }
          : {
              titulo: 'Cadastros pendentes',
              valor: cards.solicitacoesCadastroPendentes,
              icone: Clock,
              cor: 'bg-yellow-500',
            },
      ];
    }

    return [
      { titulo: 'Vagas disponiveis', valor: cards.vagasDisponiveis, icone: Car, cor: 'bg-blue-500' },
      { titulo: `Meus ${rotuloOperacao.plural.toLowerCase()} ativos`, valor: cards.minhasLocacoesAtivas, icone: CheckCircle, cor: 'bg-green-500' },
      { titulo: `${rotuloOperacao.plural} no mes`, valor: cards.minhasLocacoesMes, icone: Calendar, cor: 'bg-yellow-500' },
      { titulo: 'Minhas vagas em uso', valor: cards.minhasVagasAlugadas, icone: MapPin, cor: 'bg-purple-500' },
    ];
  }, [estatisticas, rotuloOperacao]);

  const metricasDinamicas = useMemo<MetricaDashboard[]>(() => {
    if (!estatisticas) {
      return [];
    }

    const { perfil, cards, metricas, contexto } = estatisticas;
    const usaLocacao = !!contexto?.usaLocacao;

    if (perfil === 'administrador_mestre') {
      return [
        { titulo: `${rotuloOperacao.plural} hoje`, valor: metricas.locacoesHoje, icone: Calendar, tendencia: 'up' },
        { titulo: `${rotuloOperacao.plural} na semana`, valor: metricas.locacoesSemana, icone: BarChart3, tendencia: 'up' },
        { titulo: `${rotuloOperacao.plural} no mes`, valor: metricas.locacoesMes, icone: TrendingUp, tendencia: 'up' },
        { titulo: 'Taxa de ocupacao', valor: `${metricas.taxaOcupacao}%`, icone: PieChart, tendencia: 'neutral' },
      ];
    }

    if (perfil === 'sindico' || perfil === 'porteiro') {
      if (usaLocacao) {
        return [
          { titulo: `${rotuloOperacao.plural} no mes`, valor: metricas.locacoesMes, icone: Calendar, tendencia: 'up' },
          { titulo: 'Receita do mes', valor: `R$ ${(metricas.receitaMes || 0).toFixed(2)}`, icone: DollarSign, tendencia: 'up' },
          { titulo: 'Taxa de ocupacao', valor: `${metricas.taxaOcupacao}%`, icone: PieChart, tendencia: 'neutral' },
        ];
      }

      return [
        { titulo: `${rotuloOperacao.plural} no mes`, valor: metricas.locacoesMes, icone: Calendar, tendencia: 'up' },
        { titulo: `${rotuloOperacao.plural} finalizados`, valor: cards.locacoesFinalizadas, icone: CheckCircle, tendencia: 'neutral' },
        { titulo: 'Taxa de ocupacao', valor: `${metricas.taxaOcupacao}%`, icone: PieChart, tendencia: 'neutral' },
      ];
    }

    if (usaLocacao) {
      return [
        { titulo: 'Gasto no mes', valor: `R$ ${(metricas.totalGastoMes || 0).toFixed(2)}`, icone: ArrowDownRight, tendencia: 'down' },
        { titulo: 'Recebido no mes', valor: `R$ ${(metricas.totalRecebidoMes || 0).toFixed(2)}`, icone: ArrowUpRight, tendencia: 'up' },
        { titulo: 'Ocupacao do condominio', valor: `${metricas.taxaOcupacao}%`, icone: PieChart, tendencia: 'neutral' },
      ];
    }

    return [
      { titulo: `${rotuloOperacao.plural} finalizados no mes`, valor: cards.minhasLocacoesFinalizadasMes, icone: CheckCircle, tendencia: 'neutral' },
      { titulo: 'Minhas vagas publicadas', valor: cards.minhasVagasPublicadas, icone: MapPin, tendencia: 'neutral' },
      { titulo: 'Ocupacao do condominio', valor: `${metricas.taxaOcupacao}%`, icone: PieChart, tendencia: 'neutral' },
    ];
  }, [estatisticas, rotuloOperacao]);

  const getIconeEvento = (icone: string) => {
    switch (icone) {
      case 'car':
        return Car;
      case 'check-circle':
        return CheckCircle;
      case 'x-circle':
        return XCircle;
      case 'alert-circle':
        return AlertTriangle;
      case 'clock':
        return Clock;
      case 'user-plus':
        return UserPlus;
      case 'calendar':
        return Calendar;
      default:
        return Bell;
    }
  };

  const getCorEvento = (cor: string) => {
    switch (cor) {
      case 'green':
        return 'text-green-600 bg-green-100';
      case 'red':
        return 'text-red-600 bg-red-100';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-100';
      case 'blue':
        return 'text-blue-600 bg-blue-100';
      case 'purple':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatarTempoRelativo = (data: string) => {
    const agora = new Date();
    const dataEvento = new Date(data);
    const diffMs = agora.getTime() - dataEvento.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin} min atras`;
    if (diffHoras < 24) return `${diffHoras} hora${diffHoras > 1 ? 's' : ''} atras`;
    if (diffDias < 7) return `${diffDias} dia${diffDias > 1 ? 's' : ''} atras`;
    return dataEvento.toLocaleDateString('pt-BR');
  };

  const getCorNotificacao = (tipo: string) => {
    switch (tipo) {
      case 'LOCACAO_SOLICITADA':
        return { icone: AlertTriangle, cor: 'text-yellow-600 bg-yellow-100' };
      case 'LOCACAO_APROVADA':
        return { icone: CheckCircle, cor: 'text-green-600 bg-green-100' };
      case 'LOCACAO_REJEITADA':
        return { icone: XCircle, cor: 'text-red-600 bg-red-100' };
      case 'LOCACAO_CANCELADA':
        return { icone: XCircle, cor: 'text-gray-600 bg-gray-100' };
      default:
        return { icone: Bell, cor: 'text-blue-600 bg-blue-100' };
    }
  };

  if (status === 'loading' || carregando) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo, {session?.user?.name}!</h1>
          <p className="text-gray-600">
            Aqui esta um resumo das atividades do seu sistema SmartPark.
          </p>
        </div>

        <div
          className={cn(
            'grid gap-4',
            estatisticas?.perfil === 'administrador_mestre'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
              : estatisticas?.perfil === 'sindico' || estatisticas?.perfil === 'porteiro'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 md:grid-cols-2'
          )}
        >
          {cardsDinamicos.map((card, index) => {
            const Icone = card.icone;
            return (
              <div
                key={`${card.titulo}-${index}`}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.titulo}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{card.valor}</p>
                  </div>
                  <div className={cn('rounded-lg p-3', card.cor)}>
                    <Icone className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {metricasDinamicas.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {metricasDinamicas.map((metrica, index) => {
              const Icone = metrica.icone;
              return (
                <div
                  key={`${metrica.titulo}-${index}`}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'rounded-lg p-2',
                        metrica.tendencia === 'up'
                          ? 'bg-green-100'
                          : metrica.tendencia === 'down'
                            ? 'bg-red-100'
                            : 'bg-gray-100'
                      )}
                    >
                      <Icone
                        className={cn(
                          'h-5 w-5',
                          metrica.tendencia === 'up'
                            ? 'text-green-600'
                            : metrica.tendencia === 'down'
                              ? 'text-red-600'
                              : 'text-gray-600'
                        )}
                      />
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

        {estatisticas?.perfil === 'administrador_mestre' && estatisticas.graficos && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {rotuloOperacao.plural} por mes
              </h3>
              <div className="space-y-3">
                {estatisticas.graficos.locacoesPorMes?.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">Sem dados</p>
                ) : (
                  estatisticas.graficos.locacoesPorMes?.map((item, index) => {
                    const maxTotal = Math.max(
                      ...(estatisticas.graficos?.locacoesPorMes?.map((locacao) => locacao.total) || [
                        1,
                      ])
                    );
                    const porcentagem = (item.total / maxTotal) * 100;
                    const mesFormatado = new Date(item.mes).toLocaleDateString('pt-BR', {
                      month: 'short',
                      year: '2-digit',
                    });

                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-16 text-sm text-gray-600">{mesFormatado}</span>
                        <div className="h-4 flex-1 rounded-full bg-gray-100">
                          <div
                            className="h-4 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${porcentagem}%` }}
                          />
                        </div>
                        <span className="w-8 text-sm font-medium text-gray-900">{item.total}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Top condominios por {rotuloOperacao.plural.toLowerCase()}
              </h3>
              <div className="space-y-3">
                {estatisticas.graficos.topCondominios?.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">Sem dados</p>
                ) : (
                  estatisticas.graficos.topCondominios?.map((condominio, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white',
                            index === 0
                              ? 'bg-yellow-500'
                              : index === 1
                                ? 'bg-gray-400'
                                : index === 2
                                  ? 'bg-orange-400'
                                  : 'bg-gray-300'
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {condominio.nome}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {condominio.locacoes} {rotuloOperacao.singular}
                          {condominio.locacoes === 1 ? '' : 's'}
                        </p>
                        {estatisticas.contexto?.usaLocacao && (
                          <p className="text-xs text-green-600">
                            R$ {condominio.receita.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Atividades recentes</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {eventos.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">
                    Nenhuma atividade recente
                  </p>
                ) : (
                  eventos.map((evento) => {
                    const Icone = getIconeEvento(evento.icone);
                    const cor = getCorEvento(evento.cor);
                    return (
                      <div key={evento.id} className="flex items-start space-x-3">
                        <div className={cn('rounded-lg p-2', cor)}>
                          <Icone className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{evento.titulo}</p>
                          <p className="text-sm text-gray-600">{evento.descricao}</p>
                          <p className="mt-1 text-xs text-gray-500">
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

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Notificacoes</h3>
              {notificacoes.filter((notificacao) => !notificacao.lida).length > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                  {notificacoes.filter((notificacao) => !notificacao.lida).length} novas
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {notificacoes.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">
                    Nenhuma notificacao
                  </p>
                ) : (
                  notificacoes.map((notificacao) => {
                    const { icone: Icone, cor } = getCorNotificacao(notificacao.tipo);
                    return (
                      <div
                        key={notificacao.id}
                        className={cn(
                          'flex items-start space-x-3',
                          !notificacao.lida && '-mx-2 rounded-lg bg-blue-50 px-2 py-2'
                        )}
                      >
                        <div className={cn('rounded-lg p-2', cor)}>
                          <Icone className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notificacao.titulo}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {notificacao.mensagem}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
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

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Acoes rapidas</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {estatisticas?.perfil === 'administrador_mestre' && (
              <>
                <Link
                  href="/admin/condominios"
                  className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <Building2 className="mb-2 h-8 w-8 text-blue-600" />
                  <h4 className="font-medium text-gray-900">Novo condominio</h4>
                  <p className="text-sm text-gray-600">Cadastrar um novo condominio</p>
                </Link>
                <Link
                  href="/dashboard/usuarios"
                  className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <Users className="mb-2 h-8 w-8 text-green-600" />
                  <h4 className="font-medium text-gray-900">Gerenciar usuarios</h4>
                  <p className="text-sm text-gray-600">Adicionar ou editar usuarios</p>
                </Link>
                <Link
                  href="/reservas-admin"
                  className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <BarChart3 className="mb-2 h-8 w-8 text-purple-600" />
                  <h4 className="font-medium text-gray-900">Monitoramento global</h4>
                  <p className="text-sm text-gray-600">
                    Ver {rotuloOperacao.plural.toLowerCase()} de todos os condominios
                  </p>
                </Link>
              </>
            )}

            {estatisticas?.perfil === 'sindico' && (
              <>
                <Link
                  href="/dashboard/estrutura/vagas"
                  className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <Car className="mb-2 h-8 w-8 text-blue-600" />
                  <h4 className="font-medium text-gray-900">Gerenciar vagas</h4>
                  <p className="text-sm text-gray-600">Administrar vagas do condominio</p>
                </Link>
                <Link
                  href="/dashboard/estrutura/unidades"
                  className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <Home className="mb-2 h-8 w-8 text-green-600" />
                  <h4 className="font-medium text-gray-900">Gerenciar unidades</h4>
                  <p className="text-sm text-gray-600">Administrar unidades</p>
                </Link>
                <Link
                  href="/reservas-sindico"
                  className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <Calendar className="mb-2 h-8 w-8 text-purple-600" />
                  <h4 className="font-medium text-gray-900">Monitoramento de locacoes</h4>
                  <p className="text-sm text-gray-600">
                    Acompanhar {rotuloOperacao.plural.toLowerCase()}, placas e ocorrencias
                  </p>
                </Link>
              </>
            )}

            {estatisticas?.perfil === 'porteiro' && (
              <Link
                href="/reservas-sindico"
                className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
              >
                <Calendar className="mb-2 h-8 w-8 text-blue-600" />
                <h4 className="font-medium text-gray-900">Monitoramento de veiculos</h4>
                <p className="text-sm text-gray-600">
                  Consultar {rotuloOperacao.plural.toLowerCase()} ativos, placas e acessos
                </p>
              </Link>
            )}

            {estatisticas?.perfil === 'morador' && (
              <>
                <Link
                  href="/locacao"
                  className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <Car className="mb-2 h-8 w-8 text-blue-600" />
                  <h4 className="font-medium text-gray-900">
                    {rotuloOperacao.singular === 'emprestimo' ? 'Encontrar vaga' : 'Solicitar vaga'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Encontrar vagas disponiveis no seu condominio
                  </p>
                </Link>
                <Link
                  href="/minhas-locacoes"
                  className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <Calendar className="mb-2 h-8 w-8 text-green-600" />
                  <h4 className="font-medium text-gray-900">Meus {rotuloOperacao.plural.toLowerCase()}</h4>
                  <p className="text-sm text-gray-600">
                    Acompanhar seus {rotuloOperacao.plural.toLowerCase()}
                  </p>
                </Link>
                <Link
                  href="/minhas-vagas"
                  className="block rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <MapPin className="mb-2 h-8 w-8 text-purple-600" />
                  <h4 className="font-medium text-gray-900">Minhas vagas</h4>
                  <p className="text-sm text-gray-600">
                    Gerenciar a publicacao das suas vagas
                  </p>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
