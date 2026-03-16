'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  Car,
  Edit,
  Loader,
  MapPin,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Layout } from '@/components';
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

function resumirValores(vaga: Vaga) {
  const valores: string[] = [];
  if (vaga.configuracaoLocacao?.valorHora) valores.push(`R$ ${vaga.configuracaoLocacao.valorHora.toFixed(2)}/h`);
  if (vaga.configuracaoLocacao?.valorDiaria) valores.push(`R$ ${vaga.configuracaoLocacao.valorDiaria.toFixed(2)}/dia`);
  if (vaga.configuracaoLocacao?.valorMensal) valores.push(`R$ ${vaga.configuracaoLocacao.valorMensal.toFixed(2)}/mês`);
  if (vaga.configuracaoLocacao?.valorAnual) valores.push(`R$ ${vaga.configuracaoLocacao.valorAnual.toFixed(2)}/ano`);
  return valores.join(' • ');
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

      const response = await fetch('/api/minhas-vagas');
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
    void carregarUnidade();
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

  const resumo = useMemo(() => {
    if (!unidade) {
      return { total: 0, publicadas: 0 };
    }

    return {
      total: unidade.vagas.length,
      publicadas: unidade.vagas.filter((vaga) => vaga.configuracaoLocacao?.disponivel).length,
    };
  }, [unidade]);

  if (loading) {
    return (
      <Layout titulo="Minhas vagas" subtitulo="Gerencie as vagas da sua unidade">
        <div className="flex h-64 items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout titulo="Minhas vagas" subtitulo="Gerencie as vagas da sua unidade">
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-4">
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
      <Layout titulo="Minhas vagas" subtitulo="Gerencie as vagas da sua unidade">
        <div className="rounded-[28px] border border-blue-200 bg-blue-50 p-6 text-center">
          <Car className="mx-auto mb-4 h-12 w-12 text-blue-400" />
          <h3 className="text-lg font-medium text-blue-900">Nenhuma unidade associada</h3>
          <p className="mt-2 text-sm text-blue-700">
            Você ainda não possui unidade vinculada. Fale com o síndico ou administrador local.
          </p>
        </div>
      </Layout>
    );
  }

  if (!unidade.vagas || unidade.vagas.length === 0) {
    return (
      <Layout titulo="Minhas vagas" subtitulo="Gerencie as vagas da sua unidade">
        <div className="rounded-[28px] border border-blue-200 bg-blue-50 p-6 text-center">
          <Car className="mx-auto mb-4 h-12 w-12 text-blue-400" />
          <h3 className="text-lg font-medium text-blue-900">Nenhuma vaga cadastrada</h3>
          <p className="mt-2 text-sm text-blue-700">
            Sua unidade ainda não possui vagas cadastradas no sistema.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo="Minhas vagas" subtitulo="Publique, pause e ajuste os valores das suas vagas">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,_#ecfdf5_0%,_#ffffff_60%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                Unidade {unidade.numero}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Minhas vagas</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Escolha quais vagas ficam visíveis para locação e defina as modalidades e valores.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:min-w-[340px]">
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">Vagas</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{resumo.total}</p>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">Publicadas</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{resumo.publicadas}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="font-medium text-amber-900">Cobrança pelo app virá depois do piloto</p>
              <p className="mt-1 text-sm text-amber-800">
                Neste momento você publica a vaga, aprova o pedido e acompanha a ocupação. Em uma
                próxima etapa, esta tela também vai exibir cobrança e repasse da locação.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Tipo</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{unidade.tipo}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Andar</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {Number(unidade.andar) === 0 ? 'Térreo' : `${unidade.andar}º`}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Prontas para locação</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">{resumo.publicadas}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Pendentes de configurar</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {resumo.total - resumo.publicadas}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          {unidade.vagas.map((vaga) => (
            <article
              key={vaga.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      <MapPin className="mr-1 h-3.5 w-3.5" />
                      Vaga {vaga.numero}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{vaga.tipo}</h3>
                    <p className="text-sm text-slate-600">
                      {vaga.configuracaoLocacao?.disponivel
                        ? 'Publicada para locação'
                        : 'Ainda não publicada'}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      vaga.configuracaoLocacao?.disponivel
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {vaga.configuracaoLocacao?.disponivel ? 'Disponível' : 'Indisponível'}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <ShieldCheck className="h-4 w-4" />
                      Modalidades
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {vaga.configuracaoLocacao?.tiposPermitidos?.length ? (
                        vaga.configuracaoLocacao.tiposPermitidos.map((tipo) => (
                          <span
                            key={tipo}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                          >
                            {tipo}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">Não configuradas</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 xl:col-span-2">
                    <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <Wallet className="h-4 w-4" />
                      Valores atuais
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {resumirValores(vaga) || 'Defina os valores para publicar sua vaga.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => abrirModalConfiguracao(vaga)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-fit sm:min-w-[180px]"
                >
                  <Edit className="h-4 w-4" />
                  Configurar vaga
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>

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
