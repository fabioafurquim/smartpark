'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Filter, Calendar, DollarSign, Building2 } from 'lucide-react';
import { Layout } from '@/components';
import { Button } from '@/components/ui';
import LocacaoModal from '@/components/modals/LocacaoModal';

interface Vaga {
  id: string;
  numero: string;
  tipo: string;
  unidade: {
    id: string;
    numero: string;
    andar: number;
    torre: {
      id: string;
      nome: string;
      tipo: string;
    };
  };
  condominio: {
    id: string;
    nome: string;
  };
  proprietario: {
    id: string;
    nome: string;
    email: string;
  };
  configuracaoLocacao: {
    disponivel: boolean;
    tiposPermitidos: string[];
    valorHora: number | null;
    valorDiaria: number | null;
    valorMensal: number | null;
    valorAnual: number | null;
  };
}

export default function LocacaoPage() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [condominioFiltro, setCondominioFiltro] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODAS');
  const [condominios, setCondominios] = useState<{id: string, nome: string}[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null);

  // Carregar condomínios na primeira vez
  useEffect(() => {
    const carregarCondominios = async () => {
      try {
        const response = await fetch('/api/condominios');
        if (response.ok) {
          const dados = await response.json();
          const lista = dados.condominios || [];
          setCondominios(lista);
        }
      } catch (error) {
        console.error('Erro ao carregar condomínios:', error);
      }
    };

    carregarCondominios();
  }, []);

  // Carregar vagas disponíveis
  useEffect(() => {
    const carregarVagas = async () => {
      try {
        setCarregando(true);
        const url = new URL('/api/vagas/disponiveis', window.location.origin);
        if (condominioFiltro) {
          url.searchParams.append('condominioId', condominioFiltro);
        }
        
        const response = await fetch(url.toString());
        if (response.ok) {
          const dados = await response.json();
          setVagas(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar vagas:', error);
      } finally {
        setCarregando(false);
      }
    };

    carregarVagas();
  }, [condominioFiltro]);

  // Filtrar vagas
  const vagasFiltradas = vagas.filter(vaga => {
    const matchSearch = 
      vaga.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.unidade.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.unidade.torre.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.proprietario.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchTipo = tipoFiltro === 'TODAS' || vaga.tipo === tipoFiltro;
    
    return matchSearch && matchTipo;
  });

  const abrirModalLocacao = (vaga: Vaga) => {
    setVagaSelecionada(vaga);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setVagaSelecionada(null);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'COBERTA':
        return 'bg-blue-100 text-blue-800';
      case 'DESCOBERTA':
        return 'bg-gray-100 text-gray-800';
      case 'DEFICIENTE':
        return 'bg-purple-100 text-purple-800';
      case 'IDOSO':
        return 'bg-orange-100 text-orange-800';
      case 'VISITANTE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getValorExibicao = (vaga: Vaga) => {
    const valores = [];
    if (vaga.configuracaoLocacao.valorHora) {
      const valor = typeof vaga.configuracaoLocacao.valorHora === 'number' 
        ? vaga.configuracaoLocacao.valorHora 
        : parseFloat(String(vaga.configuracaoLocacao.valorHora));
      valores.push(`R$ ${valor.toFixed(2)}/h`);
    }
    if (vaga.configuracaoLocacao.valorDiaria) {
      const valor = typeof vaga.configuracaoLocacao.valorDiaria === 'number' 
        ? vaga.configuracaoLocacao.valorDiaria 
        : parseFloat(String(vaga.configuracaoLocacao.valorDiaria));
      valores.push(`R$ ${valor.toFixed(2)}/dia`);
    }
    if (vaga.configuracaoLocacao.valorMensal) {
      const valor = typeof vaga.configuracaoLocacao.valorMensal === 'number' 
        ? vaga.configuracaoLocacao.valorMensal 
        : parseFloat(String(vaga.configuracaoLocacao.valorMensal));
      valores.push(`R$ ${valor.toFixed(2)}/mês`);
    }
    if (vaga.configuracaoLocacao.valorAnual) {
      const valor = typeof vaga.configuracaoLocacao.valorAnual === 'number' 
        ? vaga.configuracaoLocacao.valorAnual 
        : parseFloat(String(vaga.configuracaoLocacao.valorAnual));
      valores.push(`R$ ${valor.toFixed(2)}/ano`);
    }
    return valores.join(' • ');
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
            <MapPin className="h-8 w-8 text-blue-600" />
            Locação de Vagas
          </h1>
          <p className="text-gray-600 mt-1">Encontre e locue vagas disponíveis de outros moradores</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="h-4 w-4 inline mr-1" />
                Buscar
              </label>
              <input
                type="text"
                placeholder="Vaga, unidade, torre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Condomínio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="h-4 w-4 inline mr-1" />
                Condomínio
              </label>
              <select
                value={condominioFiltro}
                onChange={(e) => setCondominioFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {condominios.map(cond => (
                  <option key={cond.id} value={cond.id}>{cond.nome}</option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Filter className="h-4 w-4 inline mr-1" />
                Tipo
              </label>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas</option>
                <option value="COBERTA">Coberta</option>
                <option value="DESCOBERTA">Descoberta</option>
                <option value="DEFICIENTE">Deficiente</option>
                <option value="IDOSO">Idoso</option>
                <option value="VISITANTE">Visitante</option>
              </select>
            </div>

            {/* Info */}
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <p className="font-medium">{vagasFiltradas.length} vaga(s) disponível(is)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Vagas */}
        {vagasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-lg">Nenhuma vaga disponível com os filtros selecionados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vagasFiltradas.map(vaga => (
              <div key={vaga.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Vaga {vaga.numero}</h3>
                      <p className="text-sm text-gray-600">
                        {vaga.unidade.torre.nome} - Unidade {vaga.unidade.numero}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(vaga.tipo)}`}>
                      {vaga.tipo}
                    </span>
                  </div>

                  {/* Condomínio */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    {vaga.condominio.nome}
                  </div>

                  {/* Proprietário */}
                  {vaga.proprietario && (
                    <div className="bg-gray-50 p-2 rounded text-sm">
                      <p className="text-gray-600">Proprietário</p>
                      <p className="font-medium text-gray-900">{vaga.proprietario.nome}</p>
                      <p className="text-xs text-gray-500">{vaga.proprietario.email}</p>
                    </div>
                  )}

                  {/* Valores */}
                  <div className="bg-blue-50 p-2 rounded text-sm">
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <DollarSign className="h-4 w-4" />
                      Valores
                    </div>
                    <p className="font-medium text-blue-900 text-xs">
                      {getValorExibicao(vaga)}
                    </p>
                  </div>

                  {/* Botão */}
                  <Button
                    onClick={() => abrirModalLocacao(vaga)}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Locar Vaga
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Locação */}
        {vagaSelecionada && (
          <LocacaoModal
            isOpen={modalAberto}
            onClose={fecharModal}
            vaga={vagaSelecionada}
            onSuccess={() => {
              fecharModal();
              // Recarregar vagas
              window.location.reload();
            }}
          />
        )}
      </div>
    </Layout>
  );
}
