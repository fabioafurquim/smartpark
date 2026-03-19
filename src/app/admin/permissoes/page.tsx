'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { RefreshCcw, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react';

interface CondominioOpcao {
  id: string;
  nome: string;
}

interface PermissaoCatalogoItem {
  chave: string;
  grupo: string;
  titulo: string;
  descricao: string;
}

interface PerfilConfiguravel {
  tipoPerfil: string;
  rotulo: string;
  permissoesPadrao: Record<string, boolean>;
  permissoesCustomizadas: Record<string, boolean> | null;
  permissoesEfetivas: Record<string, boolean>;
}

interface RespostaPermissoes {
  condominio: {
    id: string;
    nome: string;
    modalidade: string;
  };
  perfis: PerfilConfiguravel[];
  catalogo: PermissaoCatalogoItem[];
}

const GRUPO_LABELS: Record<string, string> = {
  pessoas: 'Pessoas',
  estrutura: 'Estrutura',
  operacao: 'Operacao',
  analise: 'Indicadores',
  administracao: 'Administracao local',
};

export default function AdminPermissoesPage() {
  const { showToast } = useToast();
  const [condominios, setCondominios] = useState<CondominioOpcao[]>([]);
  const [condominioId, setCondominioId] = useState('');
  const [dados, setDados] = useState<RespostaPermissoes | null>(null);
  const [perfilSelecionado, setPerfilSelecionado] = useState('administrador_condominio');
  const [formPermissoes, setFormPermissoes] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [resetando, setResetando] = useState(false);

  const carregarCondominios = useCallback(async () => {
    const response = await fetch('/api/admin/condominios');
    if (!response.ok) {
      throw new Error('Nao foi possivel carregar os condominios');
    }

    const payload = await response.json();
    const lista = Array.isArray(payload) ? payload : payload.condominios || [];
    setCondominios(lista);

    if (!condominioId && lista.length > 0) {
      setCondominioId(lista[0].id);
    }
  }, [condominioId]);

  const carregarPermissoes = useCallback(async () => {
    if (!condominioId) {
      setDados(null);
      setCarregando(false);
      return;
    }

    const response = await fetch(`/api/admin/permissoes?condominioId=${condominioId}`);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || 'Nao foi possivel carregar as permissoes');
    }

    setDados(payload);
  }, [condominioId]);

  useEffect(() => {
    const carregar = async () => {
      try {
        setCarregando(true);
        await carregarCondominios();
      } catch (error) {
        showToast({
          title: 'Falha ao carregar dados',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
          variant: 'error',
        });
      } finally {
        setCarregando(false);
      }
    };

    void carregar();
  }, [carregarCondominios, showToast]);

  useEffect(() => {
    if (!condominioId) {
      return;
    }

    const carregar = async () => {
      try {
        setCarregando(true);
        await carregarPermissoes();
      } catch (error) {
        showToast({
          title: 'Falha ao carregar permissoes',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
          variant: 'error',
        });
      } finally {
        setCarregando(false);
      }
    };

    void carregar();
  }, [carregarPermissoes, condominioId, showToast]);

  const perfilAtual = useMemo(
    () => dados?.perfis.find((perfil) => perfil.tipoPerfil === perfilSelecionado) || null,
    [dados, perfilSelecionado]
  );

  useEffect(() => {
    if (perfilAtual) {
      setFormPermissoes(perfilAtual.permissoesEfetivas);
    }
  }, [perfilAtual]);

  const catalogoAgrupado = useMemo(() => {
    const grupos = new Map<string, PermissaoCatalogoItem[]>();

    for (const permissao of dados?.catalogo || []) {
      const grupoAtual = grupos.get(permissao.grupo) || [];
      grupoAtual.push(permissao);
      grupos.set(permissao.grupo, grupoAtual);
    }

    return Array.from(grupos.entries());
  }, [dados]);

  const salvarConfiguracao = async () => {
    if (!condominioId || !perfilAtual) {
      return;
    }

    try {
      setSalvando(true);
      const response = await fetch('/api/admin/permissoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          condominioId,
          tipoPerfil: perfilAtual.tipoPerfil,
          permissoes: formPermissoes,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Nao foi possivel salvar a configuracao');
      }

      await carregarPermissoes();
      showToast({
        title: 'Permissoes atualizadas',
        description: `O perfil ${perfilAtual.rotulo.toLowerCase()} foi atualizado para este condominio.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Falha ao salvar permissoes',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
        variant: 'error',
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetarParaPadrao = async () => {
    if (!condominioId || !perfilAtual) {
      return;
    }

    try {
      setResetando(true);
      const response = await fetch('/api/admin/permissoes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          condominioId,
          tipoPerfil: perfilAtual.tipoPerfil,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Nao foi possivel resetar a configuracao');
      }

      await carregarPermissoes();
      showToast({
        title: 'Configuracao restaurada',
        description: `O perfil ${perfilAtual.rotulo.toLowerCase()} voltou ao padrao do sistema.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Falha ao resetar configuracao',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
        variant: 'error',
      });
    } finally {
      setResetando(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,_#eff6ff_0%,_#ffffff_65%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                Administracao global
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                <ShieldCheck className="h-7 w-7 text-blue-600" />
                Permissoes por perfil
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
                Personalize o que cada perfil pode fazer em cada condominio, sem depender de regras
                fixas para todos os clientes.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <label className="mb-2 block text-sm font-medium text-slate-700">Condominio</label>
              <select
                value={condominioId}
                onChange={(event) => setCondominioId(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um condominio</option>
                {condominios.map((condominio) => (
                  <option key={condominio.id} value={condominio.id}>
                    {condominio.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {carregando ? (
          <div className="flex h-56 items-center justify-center rounded-[28px] border border-slate-200 bg-white">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : !dados ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500">
            Selecione um condominio para configurar as permissoes.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                Perfis configuraveis
              </div>

              <div className="space-y-2">
                {dados.perfis.map((perfil) => (
                  <button
                    key={perfil.tipoPerfil}
                    type="button"
                    onClick={() => setPerfilSelecionado(perfil.tipoPerfil)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      perfilSelecionado === perfil.tipoPerfil
                        ? 'border-blue-200 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium">{perfil.rotulo}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {Object.values(perfil.permissoesEfetivas).filter(Boolean).length} permissoes
                      ativas
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {dados.condominio.nome}
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">
                    {perfilAtual?.rotulo || 'Perfil'}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Ajuste as acoes disponiveis para este perfil no condominio selecionado. As
                    alteracoes afetam todos os usuarios desse perfil no condominio.
                  </p>
                </div>

                <div className="grid gap-2 sm:min-w-[260px]">
                  <Button
                    type="button"
                    onClick={salvarConfiguracao}
                    loading={salvando}
                    className="h-11 rounded-2xl"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar perfil
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetarParaPadrao}
                    loading={resetando}
                    className="h-11 rounded-2xl"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Voltar ao padrao
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {catalogoAgrupado.map(([grupo, permissoes]) => (
                  <div key={grupo}>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {GRUPO_LABELS[grupo] || grupo}
                    </h3>

                    <div className="grid gap-3">
                      {permissoes.map((permissao) => {
                        const ativa = !!formPermissoes[permissao.chave];
                        const valorPadrao = !!perfilAtual?.permissoesPadrao?.[permissao.chave];

                        return (
                          <label
                            key={permissao.chave}
                            className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors ${
                              ativa
                                ? 'border-blue-200 bg-blue-50/60'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={ativa}
                              onChange={(event) =>
                                setFormPermissoes((current) => ({
                                  ...current,
                                  [permissao.chave]: event.target.checked,
                                }))
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-slate-900">{permissao.titulo}</p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                  Padrao: {valorPadrao ? 'ativo' : 'desligado'}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{permissao.descricao}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                O administrador mestre continua com acesso total. Essa tela altera apenas os
                perfis locais de cada condominio.
              </div>
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}
