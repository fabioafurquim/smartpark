'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Edit, Plus, Search, Trash2 } from 'lucide-react';
import TorreModal from '@/components/modals/TorreModal';
import { Layout } from '@/components/Layout';
import { ConfirmDialog } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';

interface Torre {
  id: string;
  nome: string;
  tipo: 'TORRE' | 'BLOCO';
  totalUnidades: number;
  condominioId: string;
  condominio: {
    id: string;
    nome: string;
  };
  createdAt: string;
}

interface Condominio {
  id: string;
  nome: string;
}

interface TorreFormData {
  nome: string;
  tipo: 'TORRE' | 'BLOCO';
  condominioId: string;
}

const extrairMensagemErro = (errorData: unknown, fallback: string) => {
  if (!errorData || typeof errorData !== 'object') {
    return fallback;
  }

  const payload = errorData as { error?: string; details?: string };
  return payload.details || payload.error || fallback;
};

export default function TorresPage() {
  const { showToast } = useToast();
  const [torres, setTorres] = useState<Torre[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [selectedCondominio, setSelectedCondominio] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTorre, setEditingTorre] = useState<Torre | null>(null);
  const [torreExcluindo, setTorreExcluindo] = useState<Torre | null>(null);
  const [error, setError] = useState('');

  const fetchCondominios = useCallback(async () => {
    try {
      const response = await fetch('/api/condominios');
      if (!response.ok) {
        throw new Error('Erro ao carregar condominios');
      }

      const data = await response.json();
      const lista = data.condominios || [];
      setCondominios(lista);

      if (!selectedCondominio && lista.length > 0) {
        setSelectedCondominio(lista[0].id);
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro ao carregar condominios';
      setError(mensagem);
      showToast({
        title: 'Falha ao carregar condominios',
        description: mensagem,
        variant: 'error',
      });
    }
  }, [selectedCondominio, showToast]);

  const fetchTorres = useCallback(async () => {
    if (!selectedCondominio) {
      setTorres([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/torres?condominioId=${selectedCondominio}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.erro || errorData?.error || 'Erro ao carregar torres');
      }

      const data = await response.json();
      setTorres(Array.isArray(data) ? data : []);
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro ao carregar torres';
      setError(mensagem);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCondominio]);

  useEffect(() => {
    void fetchCondominios();
  }, [fetchCondominios]);

  useEffect(() => {
    void fetchTorres();
  }, [fetchTorres]);

  const handleSaveTorre = async (formData: TorreFormData) => {
    try {
      const url = editingTorre ? `/api/torres/${editingTorre.id}` : '/api/torres';
      const method = editingTorre ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Erro ao salvar torre');
      }

      await fetchTorres();
      setError('');
      showToast({
        title: editingTorre ? 'Estrutura atualizada' : 'Estrutura criada',
        description: editingTorre
          ? 'A torre ou bloco foi atualizado com sucesso.'
          : 'A nova torre ou bloco foi cadastrada com sucesso.',
        variant: 'success',
      });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro ao salvar torre';
      setError(mensagem);
      showToast({
        title: 'Falha ao salvar estrutura',
        description: mensagem,
        variant: 'error',
      });
      throw error;
    }
  };

  const handleDeleteTorre = (torre: Torre) => {
    if (torre.totalUnidades > 0) {
      const mensagem = `A ${torre.tipo.toLowerCase()} "${torre.nome}" nao pode ser excluida porque ainda possui ${torre.totalUnidades} unidade(s).`;
      setError(mensagem);
      showToast({
        title: 'Exclusao bloqueada',
        description: mensagem,
        variant: 'warning',
      });
      return;
    }

    setTorreExcluindo(torre);
  };

  const confirmarExclusaoTorre = async () => {
    if (!torreExcluindo) {
      return;
    }

    try {
      const response = await fetch(`/api/torres/${torreExcluindo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(extrairMensagemErro(errorData, 'Erro ao excluir torre'));
      }

      await fetchTorres();
      setError('');
      showToast({
        title: 'Estrutura excluida',
        description: 'A torre ou bloco foi removido com sucesso.',
        variant: 'success',
      });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro ao excluir torre';
      setError(mensagem);
      showToast({
        title: 'Falha ao excluir estrutura',
        description: mensagem,
        variant: 'error',
      });
    } finally {
      setTorreExcluindo(null);
    }
  };

  const filteredTorres = useMemo(
    () =>
      torres.filter((torre) => torre.nome.toLowerCase().includes(searchTerm.trim().toLowerCase())),
    [searchTerm, torres]
  );

  return (
    <Layout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Torres e blocos</h1>
          <p className="text-gray-600">Organize a estrutura vertical de cada condominio.</p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          A exclusao so e permitida quando a torre ou o bloco nao possui unidades vinculadas.
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="condominio" className="mb-1 block text-sm font-medium text-gray-700">
                Condominio
              </label>
              <select
                id="condominio"
                value={selectedCondominio}
                onChange={(event) => setSelectedCondominio(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um condominio</option>
                {condominios.map((condominio) => (
                  <option key={condominio.id} value={condominio.id}>
                    {condominio.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-700">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome"
                  className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setEditingTorre(null);
                  setIsModalOpen(true);
                }}
                disabled={!selectedCondominio}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova torre ou bloco
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-3 text-sm text-gray-600">Carregando estrutura...</p>
          </div>
        ) : filteredTorres.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedCondominio ? 'Nenhuma torre encontrada' : 'Selecione um condominio'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {selectedCondominio
                ? 'Cadastre a primeira torre ou bloco para organizar as unidades.'
                : 'Escolha um condominio para visualizar a estrutura.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTorres.map((torre) => (
              <article
                key={torre.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{torre.nome}</h2>
                        <p className="text-sm text-gray-500">{torre.condominio.nome}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <span
                        className={`rounded-full px-3 py-1 font-medium ${
                          torre.tipo === 'TORRE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {torre.tipo === 'TORRE' ? 'Torre' : 'Bloco'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                        {torre.totalUnidades} unidade(s)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTorre(torre);
                        setIsModalOpen(true);
                      }}
                      className="rounded-xl border border-slate-200 p-2 text-blue-600 transition-colors hover:bg-blue-50"
                      title="Editar estrutura"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTorre(torre)}
                      className="rounded-xl border border-slate-200 p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300"
                      title={
                        torre.totalUnidades > 0
                          ? 'Remova primeiro as unidades vinculadas'
                          : 'Excluir estrutura'
                      }
                      disabled={torre.totalUnidades > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <TorreModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTorre(null);
          }}
          onSave={handleSaveTorre}
          torre={editingTorre}
          condominios={condominios}
          selectedCondominioId={selectedCondominio}
        />

        <ConfirmDialog
          aberto={!!torreExcluindo}
          aoFechar={() => setTorreExcluindo(null)}
          aoConfirmar={confirmarExclusaoTorre}
          titulo="Excluir torre ou bloco"
          descricao={
            torreExcluindo
              ? `Voce esta prestes a excluir ${torreExcluindo.tipo.toLowerCase()} "${torreExcluindo.nome}". Essa acao e permanente e so deve ser usada quando a estrutura estiver vazia.`
              : ''
          }
          confirmarLabel="Excluir estrutura"
        />
      </div>
    </Layout>
  );
}
