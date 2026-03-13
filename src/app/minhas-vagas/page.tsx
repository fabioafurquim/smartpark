'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Layout } from '@/components';
import { Car, Edit, AlertCircle, Loader } from 'lucide-react';
import ConfiguracaoLocacaoModal from '@/components/modals/ConfiguracaoLocacaoModal';

interface Vaga {
  id: string;
  numero: string;
  tipo: string;
  unidadeId: string;
  condominioId: string;
  proprietarioId?: string;
  configuracaoLocacao?: {
    id: string;
    disponivel: boolean;
    tiposPermitidos: string[];
    valorHora?: number;
    valorDiaria?: number;
    valorMensal?: number;
    valorAnual?: number;
  };
}

interface Unidade {
  id: string;
  numero: string;
  andar: number;
  tipo: string;
  vagas: Vaga[];
}

export default function MinhasVagasPage() {
  const { data: session } = useSession();
  const usuario = session?.user as any;

  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null);

  const carregarUnidade = useCallback(async () => {
    if (!usuario?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/minhas-vagas`);
      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao carregar vagas');
      }

      const dados = await response.json();
      setUnidade(dados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id]);

  useEffect(() => {
    carregarUnidade();
  }, [carregarUnidade]);

  const abrirModalConfiguracao = (vaga: Vaga) => {
    setVagaSelecionada(vaga);
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setVagaSelecionada(null);
  };

  const handleSalvarConfiguracao = async () => {
    await carregarUnidade();
    fecharModal();
  };

  if (loading) {
    return (
      <Layout titulo="Minhas Vagas" subtitulo="Gerencie as vagas da sua unidade">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout titulo="Minhas Vagas" subtitulo="Gerencie as vagas da sua unidade">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!unidade) {
    return (
      <Layout titulo="Minhas Vagas" subtitulo="Gerencie as vagas da sua unidade">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Car className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Nenhuma unidade associada
          </h3>
          <p className="text-blue-700">
            Você não possui uma unidade associada. Entre em contato com o administrador do condomínio.
          </p>
        </div>
      </Layout>
    );
  }

  if (!unidade.vagas || unidade.vagas.length === 0) {
    return (
      <Layout titulo="Minhas Vagas" subtitulo="Gerencie as vagas da sua unidade">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Car className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Nenhuma vaga cadastrada
          </h3>
          <p className="text-blue-700">
            Sua unidade não possui vagas cadastradas. Entre em contato com o administrador.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo="Minhas Vagas" subtitulo="Gerencie as vagas da sua unidade">
      <div className="space-y-6">
        {/* Informações da Unidade */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Unidade {unidade.numero}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Tipo</p>
              <p className="text-lg font-medium text-gray-900">{unidade.tipo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Andar</p>
              <p className="text-lg font-medium text-gray-900">
                {unidade.andar === 0 ? 'Térreo' : `${unidade.andar}º`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Vagas</p>
              <p className="text-lg font-medium text-gray-900">{unidade.vagas.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vagas Disponíveis</p>
              <p className="text-lg font-medium text-green-600">
                {unidade.vagas.filter(v => v.configuracaoLocacao?.disponivel).length}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Vagas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Vagas</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipos de Locação
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {unidade.vagas.map((vaga) => (
                  <tr key={vaga.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Car className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900">
                          {vaga.numero}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {vaga.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vaga.configuracaoLocacao?.disponivel ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Disponível
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Indisponível
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vaga.configuracaoLocacao?.tiposPermitidos?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {vaga.configuracaoLocacao.tiposPermitidos.map((tipo) => (
                            <span
                              key={tipo}
                              className="inline-flex px-2 py-1 text-xs rounded bg-purple-100 text-purple-800"
                            >
                              {tipo}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => abrirModalConfiguracao(vaga)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-2 px-3 py-1 rounded hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                        Configurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Configuração */}
      {vagaSelecionada && (
        <ConfiguracaoLocacaoModal
          isOpen={isModalOpen}
          onClose={fecharModal}
          vaga={vagaSelecionada}
          onSave={handleSalvarConfiguracao}
        />
      )}
    </Layout>
  );
}
