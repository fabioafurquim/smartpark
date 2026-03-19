'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Building2, Calendar, Filter, MapPin, Search, ShieldCheck } from 'lucide-react';
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
  };
}

const TIPO_OPTIONS = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'COBERTA', label: 'Coberta' },
  { value: 'DESCOBERTA', label: 'Descoberta' },
  { value: 'DEFICIENTE', label: 'PCD' },
  { value: 'IDOSO', label: 'Idoso' },
  { value: 'VISITANTE', label: 'Visitante' },
];

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

  const vagasFiltradas = useMemo(
    () =>
      vagas.filter((vaga) => {
        const termo = searchTerm.toLowerCase();
        const matchSearch =
          vaga.numero.toLowerCase().includes(termo) ||
          vaga.unidade.numero.toLowerCase().includes(termo) ||
          vaga.unidade.torre.nome.toLowerCase().includes(termo) ||
          vaga.proprietario.nome.toLowerCase().includes(termo);

        const matchTipo = tipoFiltro === 'TODAS' || vaga.tipo === tipoFiltro;
        return matchSearch && matchTipo;
      }),
    [searchTerm, tipoFiltro, vagas]
  );

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'COBERTA':
        return 'bg-blue-100 text-blue-800';
      case 'DESCOBERTA':
        return 'bg-slate-100 text-slate-700';
      case 'DEFICIENTE':
        return 'bg-violet-100 text-violet-800';
      case 'IDOSO':
        return 'bg-orange-100 text-orange-800';
      case 'VISITANTE':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const escopoAtual =
    condominios.length === 1
      ? condominios[0]?.nome
      : `${condominios.length} condominios no seu escopo`;

  return (
    <Layout>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,_#eff6ff_0%,_#ffffff_60%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                Vagas do seu condominio
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                <MapPin className="h-7 w-7 text-blue-600" />
                Emprestimo de vagas
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Veja vagas publicadas no seu condominio e registre o emprestimo em poucos toques.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:min-w-[340px]">
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">Disponiveis</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{vagasFiltradas.length}</p>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">Escopo</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{escopoAtual}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.6fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                <Search className="mr-1 inline h-4 w-4" />
                Buscar
              </label>
              <input
                type="text"
                placeholder="Vaga, unidade, torre ou morador"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                <Filter className="mr-1 inline h-4 w-4" />
                Tipo de vaga
              </label>
              <select
                value={tipoFiltro}
                onChange={(event) => setTipoFiltro(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                Regras de disponibilidade
              </div>
              <p className="text-sm text-slate-700">Somente vagas do seu condominio aparecem aqui.</p>
            </div>
          </div>
        </section>

        {carregando ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : vagasFiltradas.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">Nenhuma vaga encontrada</h3>
            <p className="mt-2 text-sm text-slate-500">
              Ajuste a busca ou o filtro para encontrar outra vaga disponivel.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {vagasFiltradas.map((vaga) => (
              <article
                key={vaga.id}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Vaga {vaga.numero}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {vaga.unidade.torre.nome} - Unidade {vaga.unidade.numero}
                      </h3>
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="h-4 w-4" />
                        {vaga.condominio.nome}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getTipoColor(vaga.tipo)}`}
                    >
                      {vaga.tipo}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Morador responsavel
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{vaga.proprietario.nome}</p>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-4">
                      <div className="mb-1 text-xs uppercase tracking-wide text-blue-700">
                        Uso permitido
                      </div>
                      <p className="text-sm font-medium text-blue-950">
                        Emprestimo registrado pelo app para moradores do condominio
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {vaga.configuracaoLocacao.tiposPermitidos.map((tipo) => (
                      <span
                        key={tipo}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {tipo === 'HORA' && 'Por hora'}
                        {tipo === 'DIARIA' && 'Diaria'}
                        {tipo === 'MENSAL' && 'Mensal'}
                        {tipo === 'ANUAL' && 'Anual'}
                      </span>
                    ))}
                  </div>

                  <Button
                    onClick={() => {
                      setVagaSelecionada(vaga);
                      setModalAberto(true);
                    }}
                    className="mt-5 h-12 w-full rounded-2xl text-sm font-medium"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Registrar emprestimo
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        {vagaSelecionada && (
          <LocacaoModal
            isOpen={modalAberto}
            onClose={() => {
              setModalAberto(false);
              setVagaSelecionada(null);
            }}
            vaga={vagaSelecionada}
            onSuccess={() => {
              setModalAberto(false);
              setVagaSelecionada(null);
              void (async () => {
                const response = await fetch('/api/vagas/disponiveis');
                if (response.ok) {
                  const dados = await response.json();
                  setVagas(dados);
                }
              })();
            }}
          />
        )}
      </div>
    </Layout>
  );
}
