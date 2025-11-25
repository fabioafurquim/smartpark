'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Calendar, CheckCircle, XCircle, Clock, User, DollarSign, Building2, AlertCircle } from 'lucide-react';
import { Layout } from '@/components';

interface Locacao {
  id: string;
  dataInicio: string;
  dataFim: string;
  tipoLocacao: string;
  valor: number;
  status: string;
  vaga: {
    numero: string;
    unidade: {
      numero: string;
      torre: {
        nome: string;
      };
    };
    condominio: {
      nome: string;
    };
  };
  locatario: {
    id: string;
    nome: string;
    email: string;
  };
  proprietario: {
    id: string;
    nome: string;
    email: string;
  };
}

export default function ReservasSindicoPage() {
  const { data: session } = useSession();
  const usuario = session?.user as any;
  
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [filtroCondominio, setFiltroCondominio] = useState<string>('');
  const [condominios, setCondominios] = useState<{id: string, nome: string}[]>([]);
  const [erro, setErro] = useState('');
  const [acesso, setAcesso] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [filtroCondominio]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      
      // Determinar condomínio
      let condominioId = filtroCondominio;
      if (!condominioId && usuario?.perfis?.[0]?.condominioId) {
        condominioId = usuario.perfis[0].condominioId;
        setFiltroCondominio(condominioId);
      }

      if (!condominioId) {
        setErro('Nenhum condomínio disponível');
        setAcesso(false);
        return;
      }

      // Carregar locações do condomínio
      const response = await fetch(`/api/locacoes/condominio?condominioId=${condominioId}`);
      if (response.ok) {
        const dados = await response.json();
        setLocacoes(dados);
        
        // Extrair condomínios únicos
        const condominiosUnicos = Array.from(
          new Map(dados.map((l: Locacao) => [l.vaga.condominio.nome, l.vaga.condominio])).values()
        );
        setCondominios(condominiosUnicos as any);
      } else if (response.status === 403) {
        setErro('Acesso negado. Apenas síndicos podem visualizar todas as reservas.');
        setAcesso(false);
      } else {
        setErro('Erro ao carregar reservas');
      }
    } catch (error) {
      console.error('Erro ao carregar locações:', error);
      setErro('Erro ao carregar reservas');
    } finally {
      setCarregando(false);
    }
  };

  const locacoesFiltradas = locacoes.filter(loc =>
    filtroStatus === 'TODAS' || loc.status === filtroStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ATIVA':
        return 'bg-green-100 text-green-800';
      case 'CANCELADA':
        return 'bg-red-100 text-red-800';
      case 'FINALIZADA':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return <Clock className="h-4 w-4" />;
      case 'ATIVA':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELADA':
        return <XCircle className="h-4 w-4" />;
      case 'FINALIZADA':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstatisticas = () => {
    return {
      total: locacoes.length,
      pendentes: locacoes.filter(l => l.status === 'PENDENTE').length,
      ativas: locacoes.filter(l => l.status === 'ATIVA').length,
      finalizadas: locacoes.filter(l => l.status === 'FINALIZADA').length,
      canceladas: locacoes.filter(l => l.status === 'CANCELADA').length,
    };
  };

  if (!acesso) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h2 className="font-bold text-red-900">Acesso Negado</h2>
            <p className="text-red-700">{erro}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const stats = getEstatisticas();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Reservas do Condomínio
          </h1>
          <p className="text-gray-600 mt-1">Visualize todas as locações de vagas do condomínio</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-gray-600 text-sm">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-4">
            <p className="text-yellow-700 text-sm">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pendentes}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
            <p className="text-green-700 text-sm">Ativas</p>
            <p className="text-2xl font-bold text-green-900">{stats.ativas}</p>
          </div>
          <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-gray-700 text-sm">Finalizadas</p>
            <p className="text-2xl font-bold text-gray-900">{stats.finalizadas}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
            <p className="text-red-700 text-sm">Canceladas</p>
            <p className="text-2xl font-bold text-red-900">{stats.canceladas}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="h-4 w-4 inline mr-1" />
                Condomínio
              </label>
              <select
                value={filtroCondominio}
                onChange={(e) => setFiltroCondominio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {condominios.map(cond => (
                  <option key={cond.id} value={cond.id}>{cond.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="ATIVA">Ativas</option>
                <option value="FINALIZADA">Finalizadas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {erro}
          </div>
        )}

        {/* Lista de Locações */}
        {locacoesFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-lg">Nenhuma reserva encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {locacoesFiltradas.map(locacao => (
              <div key={locacao.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        Vaga {locacao.vaga.numero} - {locacao.vaga.unidade.torre.nome}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Unidade {locacao.vaga.unidade.numero}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(locacao.status)}`}>
                      {getStatusIcon(locacao.status)}
                      {locacao.status}
                    </span>
                  </div>

                  {/* Grid de Informações */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Proprietário */}
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="flex items-center gap-1 text-blue-600 text-sm mb-1">
                        <User className="h-4 w-4" />
                        Proprietário
                      </div>
                      <p className="font-medium text-gray-900">{locacao.proprietario.nome}</p>
                      <p className="text-xs text-gray-500">{locacao.proprietario.email}</p>
                    </div>

                    {/* Locatário */}
                    <div className="bg-green-50 p-3 rounded">
                      <div className="flex items-center gap-1 text-green-600 text-sm mb-1">
                        <User className="h-4 w-4" />
                        Locatário
                      </div>
                      <p className="font-medium text-gray-900">{locacao.locatario.nome}</p>
                      <p className="text-xs text-gray-500">{locacao.locatario.email}</p>
                    </div>

                    {/* Período */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center gap-1 text-gray-600 text-sm mb-1">
                        <Calendar className="h-4 w-4" />
                        Período
                      </div>
                      <p className="text-xs text-gray-900">
                        {formatarData(locacao.dataInicio)}
                      </p>
                      <p className="text-xs text-gray-500">até</p>
                      <p className="text-xs text-gray-900">
                        {formatarData(locacao.dataFim)}
                      </p>
                    </div>

                    {/* Valor */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center gap-1 text-gray-600 text-sm mb-1">
                        <DollarSign className="h-4 w-4" />
                        Valor
                      </div>
                      <p className="font-medium text-gray-900">
                        R$ {locacao.valor.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {locacao.tipoLocacao}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
