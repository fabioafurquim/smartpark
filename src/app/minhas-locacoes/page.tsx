'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layout } from '@/components';
import { Car, Calendar, Clock, DollarSign, CheckCircle, XCircle, AlertCircle, User, Building2 } from 'lucide-react';

interface Locacao {
  id: string;
  vagaId: string;
  vaga: {
    numero: string;
    tipo: string;
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
  locatarioId: string;
  locatario: {
    nome: string;
    email: string;
  };
  proprietarioId: string;
  proprietario: {
    nome: string;
    email: string;
  };
  dataInicio: string;
  dataFim: string;
  tipoLocacao: string;
  valor: number;
  status: string;
  criadoEm: string;
}

type TipoVisualizacao = 'locatario' | 'proprietario';

export default function MinhasLocacoesPage() {
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tipoVisualizacao, setTipoVisualizacao] = useState<TipoVisualizacao>('locatario');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');

  const carregarLocacoes = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await fetch(`/api/locacoes?tipo=${tipoVisualizacao}`);
      if (response.ok) {
        const dados = await response.json();
        setLocacoes(dados);
      }
    } catch (error) {
      console.error('Erro ao carregar locações:', error);
    } finally {
      setCarregando(false);
    }
  }, [tipoVisualizacao]);

  useEffect(() => {
    carregarLocacoes();
  }, [carregarLocacoes]);

  const handleAprovar = async (locacaoId: string) => {
    if (!confirm('Confirma a aprovação desta locação?')) return;
    
    try {
      const response = await fetch(`/api/locacoes/${locacaoId}/aprovar`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Locação aprovada com sucesso!');
        carregarLocacoes();
      } else {
        const erro = await response.json();
        alert(`Erro ao aprovar: ${erro.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao aprovar locação:', error);
      alert('Erro ao aprovar locação');
    }
  };

  const handleRejeitar = async (locacaoId: string) => {
    const motivo = prompt('Informe o motivo da rejeição:');
    if (!motivo) return;
    
    try {
      const response = await fetch(`/api/locacoes/${locacaoId}/rejeitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      });
      
      if (response.ok) {
        alert('Locação rejeitada');
        carregarLocacoes();
      } else {
        const erro = await response.json();
        alert(`Erro ao rejeitar: ${erro.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao rejeitar locação:', error);
      alert('Erro ao rejeitar locação');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </span>
        );
      case 'ATIVA':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ativa
          </span>
        );
      case 'REJEITADA':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitada
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelada
          </span>
        );
      case 'FINALIZADA':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Finalizada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getTipoLocacaoLabel = (tipo: string) => {
    switch (tipo) {
      case 'HORA': return 'Por Hora';
      case 'DIARIA': return 'Diária';
      case 'MENSAL': return 'Mensal';
      case 'ANUAL': return 'Anual';
      default: return tipo;
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

  const locacoesFiltradas = locacoes.filter(locacao => {
    if (filtroStatus === 'TODAS') return true;
    return locacao.status === filtroStatus;
  });

  // Estatísticas
  const estatisticas = {
    total: locacoes.length,
    pendentes: locacoes.filter(l => l.status === 'PENDENTE').length,
    ativas: locacoes.filter(l => l.status === 'ATIVA').length,
    finalizadas: locacoes.filter(l => l.status === 'FINALIZADA').length
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Locações</h1>
          <p className="text-gray-600">Acompanhe suas locações de vagas</p>
        </div>

        {/* Tabs de visualização */}
        <div className="bg-white rounded-lg shadow p-1 inline-flex">
          <button
            onClick={() => setTipoVisualizacao('locatario')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tipoVisualizacao === 'locatario'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Vagas que Aluguei
          </button>
          <button
            onClick={() => setTipoVisualizacao('proprietario')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tipoVisualizacao === 'proprietario'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Car className="w-4 h-4 inline mr-2" />
            Minhas Vagas Alugadas
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.pendentes}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Ativas</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.ativas}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Finalizadas</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.finalizadas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por status:</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Todas</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="ATIVA">Ativas</option>
              <option value="REJEITADA">Rejeitadas</option>
              <option value="CANCELADA">Canceladas</option>
              <option value="FINALIZADA">Finalizadas</option>
            </select>
          </div>
        </div>

        {/* Lista de Locações */}
        {carregando ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : locacoesFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma locação encontrada
            </h3>
            <p className="text-gray-500">
              {tipoVisualizacao === 'locatario'
                ? 'Você ainda não alugou nenhuma vaga.'
                : 'Nenhuma das suas vagas foi alugada ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {locacoesFiltradas.map((locacao) => (
              <div key={locacao.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Car className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Vaga {locacao.vaga.numero}
                      </h3>
                      {getStatusBadge(locacao.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Building2 className="h-4 w-4 mr-2" />
                        <span>
                          {locacao.vaga.condominio.nome} - {locacao.vaga.unidade.torre.nome}, Unidade {locacao.vaga.unidade.numero}
                        </span>
                      </div>

                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {formatarData(locacao.dataInicio)} até {formatarData(locacao.dataFim)}
                        </span>
                      </div>

                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{getTipoLocacaoLabel(locacao.tipoLocacao)}</span>
                      </div>

                      <div className="flex items-center text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span className="font-semibold text-green-600">
                          R$ {locacao.valor.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span>
                          {tipoVisualizacao === 'locatario'
                            ? `Proprietário: ${locacao.proprietario.nome}`
                            : `Locatário: ${locacao.locatario.nome}`}
                        </span>
                      </div>

                      <div className="text-gray-500 text-xs">
                        Solicitado em: {formatarData(locacao.criadoEm)}
                      </div>
                    </div>
                  </div>

                  {/* Ações para proprietário */}
                  {tipoVisualizacao === 'proprietario' && locacao.status === 'PENDENTE' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleAprovar(locacao.id)}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleRejeitar(locacao.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
