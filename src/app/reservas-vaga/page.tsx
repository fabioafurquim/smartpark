'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Calendar, CheckCircle, XCircle, Clock, User, DollarSign, Building2 } from 'lucide-react';
import { Layout } from '@/components';
import { Button } from '@/components/ui';

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
}

export default function ReservasVagaPage() {
  const { data: session } = useSession();
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarLocacoes();
  }, []);

  const carregarLocacoes = async () => {
    try {
      setCarregando(true);
      const response = await fetch('/api/locacoes?tipo=proprietario');
      if (response.ok) {
        const dados = await response.json();
        setLocacoes(dados);
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

  const atualizarStatus = async (locacaoId: string, novoStatus: string) => {
    try {
      const response = await fetch(`/api/locacoes/${locacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });

      if (response.ok) {
        await carregarLocacoes();
        alert(`Locação ${novoStatus.toLowerCase()} com sucesso!`);
      } else {
        alert('Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
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

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Reservas de Minhas Vagas
          </h1>
          <p className="text-gray-600 mt-1">Gerencie as locações das suas vagas</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por Status:</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Todas</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="ATIVA">Ativas</option>
              <option value="FINALIZADA">Finalizadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
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
                        Unidade {locacao.vaga.unidade.numero} • {locacao.vaga.condominio.nome}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(locacao.status)}`}>
                      {getStatusIcon(locacao.status)}
                      {locacao.status}
                    </span>
                  </div>

                  {/* Grid de Informações */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Locatário */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center gap-1 text-gray-600 text-sm mb-1">
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
                      <p className="text-sm text-gray-900">
                        {formatarData(locacao.dataInicio)}
                      </p>
                      <p className="text-xs text-gray-500">até</p>
                      <p className="text-sm text-gray-900">
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

                  {/* Ações */}
                  {locacao.status === 'PENDENTE' && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        onClick={() => atualizarStatus(locacao.id, 'ATIVA')}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={() => atualizarStatus(locacao.id, 'CANCELADA')}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}

                  {locacao.status === 'ATIVA' && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        onClick={() => atualizarStatus(locacao.id, 'CANCELADA')}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => atualizarStatus(locacao.id, 'FINALIZADA')}
                        className="flex-1 bg-gray-600 hover:bg-gray-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Finalizar
                      </Button>
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
