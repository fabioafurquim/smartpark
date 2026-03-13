'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin, Search, Filter, Calendar, DollarSign, Building2 } from 'lucide-react';
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
  const { data: session } = useSession();
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODAS');
  const [modalAberto, setModalAberto] = useState(false);
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null);

  const condominios = useMemo(() => {
    const perfis =
      ((session?.user as {
        perfis?: Array<{ condominio: { id: string; nome: string } | null }>;
      })?.perfis || []);

    return Array.from(
      new Map(
        perfis
          .filter((perfil) => perfil.condominio)
          .map((perfil) => [perfil.condominio!.id, perfil.condominio!])
      ).values()
    );
  }, [session?.user]);

  useEffect(() => {
    const carregarVagas = async () => {
      try {
        setCarregando(true);
        const response = await fetch('/api/vagas/disponiveis');
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

    void carregarVagas();
  }, []);

  const vagasFiltradas = vagas.filter((vaga) => {
    const termo = searchTerm.toLowerCase();
    const matchSearch =
      vaga.numero.toLowerCase().includes(termo) ||
      vaga.unidade.numero.toLowerCase().includes(termo) ||
      vaga.unidade.torre.nome.toLowerCase().includes(termo) ||
      vaga.proprietario.nome.toLowerCase().includes(termo);

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
    const valores: string[] = [];
    if (vaga.configuracaoLocacao.valorHora) {
      valores.push(`R$ ${Number(vaga.configuracaoLocacao.valorHora).toFixed(2)}/h`);
    }
    if (vaga.configuracaoLocacao.valorDiaria) {
      valores.push(`R$ ${Number(vaga.configuracaoLocacao.valorDiaria).toFixed(2)}/dia`);
    }
    if (vaga.configuracaoLocacao.valorMensal) {
      valores.push(`R$ ${Number(vaga.configuracaoLocacao.valorMensal).toFixed(2)}/mes`);
    }
    if (vaga.configuracaoLocacao.valorAnual) {
      valores.push(`R$ ${Number(vaga.configuracaoLocacao.valorAnual).toFixed(2)}/ano`);
    }
    return valores.join(' | ');
  };

  const escopoAtual =
    condominios.length === 1
      ? condominios[0]?.nome
      : `${condominios.length} condominios no seu escopo`;

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-8 w-8 text-blue-600" />
            Locacao de vagas
          </h1>
          <p className="text-gray-600 mt-1">
            Veja apenas vagas publicadas no seu proprio condominio e solicite a locacao sem etapas confusas.
          </p>
          <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Escopo atual: {escopoAtual}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="h-4 w-4 inline mr-1" />
                Buscar
              </label>
              <input
                type="text"
                placeholder="Vaga, unidade ou torre"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <p className="font-medium">{vagasFiltradas.length} vaga(s) disponivel(is)</p>
              </div>
            </div>
          </div>
        </div>

        {vagasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-lg">
              Nenhuma vaga disponivel com os filtros selecionados
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {vagasFiltradas.map((vaga) => (
              <div
                key={vaga.id}
                className="bg-white rounded-2xl shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Vaga {vaga.numero}</h3>
                      <p className="text-sm text-gray-600">
                        {vaga.unidade.torre.nome} - Unidade {vaga.unidade.numero}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(vaga.tipo)}`}
                    >
                      {vaga.tipo}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    {vaga.condominio.nome}
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="text-gray-600">Morador responsavel</p>
                    <p className="font-medium text-gray-900">{vaga.proprietario.nome}</p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-3 text-sm">
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <DollarSign className="h-4 w-4" />
                      Valores publicados
                    </div>
                    <p className="font-medium text-blue-900 text-xs">{getValorExibicao(vaga)}</p>
                  </div>

                  <Button
                    onClick={() => abrirModalLocacao(vaga)}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Solicitar locacao
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {vagaSelecionada && (
          <LocacaoModal
            isOpen={modalAberto}
            onClose={fecharModal}
            vaga={vagaSelecionada}
            onSuccess={() => {
              fecharModal();
              window.location.reload();
            }}
          />
        )}
      </div>
    </Layout>
  );
}
