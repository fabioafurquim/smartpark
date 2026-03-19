'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Search, Trash2, UserSquare2, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Layout } from '@/components';
import { Button } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { temPermissao } from '@/lib/auth';

type TipoPerfil =
  | 'administrador_mestre'
  | 'administrador_condominio'
  | 'sindico'
  | 'porteiro'
  | 'morador';

interface Condominio {
  id: string;
  nome: string;
}

interface UnidadeOption {
  id: string;
  numero: string;
  condominioId: string;
  usuarioId?: string | null;
  torre: {
    id: string;
    nome: string;
  };
}

interface PerfilUsuario {
  id?: string;
  condominioId: string;
  tipo: TipoPerfil;
  ativo: boolean;
  condominio?: Condominio;
  unidadeId?: string | null;
}

interface UnidadeAssociada {
  id: string;
  numero: string;
  condominioId: string;
  condominio: Condominio;
  torre: {
    id: string;
    nome: string;
  };
}

interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  perfis: PerfilUsuario[];
  unidades: UnidadeAssociada[];
}

interface PerfilForm {
  condominioId: string;
  tipo: TipoPerfil;
  ativo: boolean;
  unidadeId: string;
}

const TIPOS_PERFIL_LABEL: Record<TipoPerfil, string> = {
  administrador_mestre: 'Administrador mestre',
  administrador_condominio: 'Administrador do condominio',
  sindico: 'Sindico',
  porteiro: 'Porteiro',
  morador: 'Morador',
};

const TIPOS_GESTAO_LOCAL: TipoPerfil[] = [
  'administrador_condominio',
  'sindico',
  'porteiro',
  'morador',
];

export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const usuario = session?.user as
    | {
        perfis?: Array<{ tipo: TipoPerfil; condominioId: string }>;
      }
    | undefined;
  const { showToast } = useToast();

  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidadesPorCondominio, setUnidadesPorCondominio] = useState<Record<string, UnidadeOption[]>>(
    {}
  );
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroCondominio, setFiltroCondominio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioItem | null>(null);
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<UsuarioItem | null>(null);
  const [formData, setFormData] = useState<{
    nome: string;
    email: string;
    senha: string;
    perfis: PerfilForm[];
  }>({
    nome: '',
    email: '',
    senha: '',
    perfis: [{ condominioId: '', tipo: 'morador' as TipoPerfil, ativo: true, unidadeId: '' }],
  });

  const ehAdministradorMestre = useMemo(
    () => usuario?.perfis?.some((perfil) => perfil.tipo === 'administrador_mestre') ?? false,
    [usuario]
  );

  const temAcesso = useMemo(
    () =>
      !!usuario &&
      (usuario.perfis?.some((perfil) => perfil.tipo === 'administrador_mestre') ||
        usuario.perfis?.some((perfil) =>
          temPermissao(
            usuario as any,
            'gerenciarUsuarios',
            perfil.condominioId
          )
        )),
    [usuario]
  );

  const condominiosDisponiveis = useMemo(() => {
    if (ehAdministradorMestre) {
      return condominios;
    }

    const permitidos = new Set(
      (usuario?.perfis || [])
        .filter((perfil) => ['administrador_condominio', 'sindico'].includes(perfil.tipo))
        .map((perfil) => perfil.condominioId)
    );

    return condominios.filter((condominio) => permitidos.has(condominio.id));
  }, [condominios, ehAdministradorMestre, usuario]);

  const carregarCondominios = useCallback(async () => {
    const params = new URLSearchParams({ limit: '200' });
    const response = await fetch(`/api/condominios?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Nao foi possivel carregar os condominios');
    }

    const data = await response.json();
    const lista = Array.isArray(data) ? data : data.condominios || [];
    setCondominios(
      lista.map((condominio: any) => ({
        id: condominio.id,
        nome: condominio.nome,
      }))
    );
  }, []);

  const carregarUsuarios = useCallback(async () => {
    const response = await fetch('/api/admin/usuarios?limite=200');
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.erro || 'Nao foi possivel carregar os usuarios');
    }

    const data = await response.json();
    setUsuarios(Array.isArray(data.usuarios) ? data.usuarios : []);
  }, []);

  const carregarUnidades = useCallback(async (condominioId: string) => {
    if (!condominioId || unidadesPorCondominio[condominioId]) {
      return;
    }

    const response = await fetch(`/api/unidades?condominioId=${condominioId}`);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || 'Nao foi possivel carregar as unidades');
    }

    const data = await response.json();
    setUnidadesPorCondominio((current) => ({
      ...current,
      [condominioId]: (Array.isArray(data) ? data : []).map((unidade: any) => ({
        id: unidade.id,
        numero: unidade.numero,
        condominioId: unidade.condominioId,
        usuarioId: unidade.usuarioId,
        torre: {
          id: unidade.torre.id,
          nome: unidade.torre.nome,
        },
      })),
    }));
  }, [unidadesPorCondominio]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (!temAcesso) {
      setCarregando(false);
      setErro('Voce nao tem permissao para acessar esta pagina.');
      return;
    }

    const carregar = async () => {
      try {
        setCarregando(true);
        setErro('');
        await Promise.all([carregarCondominios(), carregarUsuarios()]);
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Erro ao carregar usuarios');
      } finally {
        setCarregando(false);
      }
    };

    void carregar();
  }, [carregarCondominios, carregarUsuarios, status, temAcesso]);

  const prepararPerfisParaFormulario = useCallback(
    async (perfis: PerfilUsuario[], unidadesAssociadas: UnidadeAssociada[]) => {
      const perfisFormatados: PerfilForm[] = perfis.map((perfil) => ({
        condominioId: perfil.condominioId,
        tipo: perfil.tipo,
        ativo: perfil.ativo,
        unidadeId:
          perfil.tipo === 'morador'
            ? unidadesAssociadas.find((unidade) => unidade.condominioId === perfil.condominioId)?.id ||
              ''
            : '',
      }));

      await Promise.all(
        perfisFormatados
          .map((perfil) => perfil.condominioId)
          .filter(Boolean)
          .map((condominioId) => carregarUnidades(condominioId))
      );

      return perfisFormatados.length > 0
        ? perfisFormatados
        : ([{ condominioId: '', tipo: 'morador', ativo: true, unidadeId: '' }] as PerfilForm[]);
    },
    [carregarUnidades]
  );

  const abrirModalNovoUsuario = useCallback(async () => {
    const primeiroCondominio = filtroCondominio || condominiosDisponiveis[0]?.id || '';
    if (primeiroCondominio) {
      await carregarUnidades(primeiroCondominio);
    }

    setUsuarioEditando(null);
    setFormData({
      nome: '',
      email: '',
      senha: '',
      perfis: [
        {
          condominioId: primeiroCondominio,
          tipo: 'morador',
          ativo: true,
          unidadeId: '',
        },
      ],
    });
    setModalAberto(true);
  }, [carregarUnidades, condominiosDisponiveis, filtroCondominio]);

  const abrirModalEditarUsuario = useCallback(
    async (usuarioSelecionado: UsuarioItem) => {
      const perfis = await prepararPerfisParaFormulario(
        usuarioSelecionado.perfis,
        usuarioSelecionado.unidades
      );

      setUsuarioEditando(usuarioSelecionado);
      setFormData({
        nome: usuarioSelecionado.nome,
        email: usuarioSelecionado.email,
        senha: '',
        perfis,
      });
      setModalAberto(true);
    },
    [prepararPerfisParaFormulario]
  );

  const atualizarPerfil = (index: number, campo: keyof PerfilForm, valor: string | boolean) => {
    setFormData((current) => {
      const perfis = [...current.perfis];
      perfis[index] = {
        ...perfis[index],
        [campo]: valor,
        ...(campo === 'tipo' && valor !== 'morador' ? { unidadeId: '' } : {}),
      };
      return {
        ...current,
        perfis,
      };
    });
  };

  const adicionarPerfil = async () => {
    const condominioPadrao = condominiosDisponiveis[0]?.id || '';
    if (condominioPadrao) {
      await carregarUnidades(condominioPadrao);
    }

    setFormData((current) => ({
      ...current,
      perfis: [
        ...current.perfis,
        { condominioId: condominioPadrao, tipo: 'morador', ativo: true, unidadeId: '' },
      ],
    }));
  };

  const removerPerfil = (index: number) => {
    setFormData((current) => ({
      ...current,
      perfis: current.perfis.filter((_, perfilIndex) => perfilIndex !== index),
    }));
  };

  const unidadesDisponiveisParaPerfil = (perfil: PerfilForm) => {
    const unidades = unidadesPorCondominio[perfil.condominioId] || [];
    const unidadeAtual =
      usuarioEditando?.unidades.find((unidade) => unidade.condominioId === perfil.condominioId)?.id || '';

    return unidades.filter(
      (unidade) => !unidade.usuarioId || unidade.usuarioId === usuarioEditando?.id || unidade.id === unidadeAtual
    );
  };

  const validarFormulario = () => {
    if (!formData.nome.trim() || !formData.email.trim()) {
      showToast({
        title: 'Campos obrigatorios',
        description: 'Preencha nome e e-mail antes de continuar.',
        variant: 'warning',
      });
      return false;
    }

    if (!usuarioEditando && !formData.senha.trim()) {
      showToast({
        title: 'Senha obrigatoria',
        description: 'Defina uma senha para o novo usuario.',
        variant: 'warning',
      });
      return false;
    }

    if (formData.perfis.some((perfil) => !perfil.condominioId)) {
      showToast({
        title: 'Perfil incompleto',
        description: 'Selecione o condominio em todos os perfis.',
        variant: 'warning',
      });
      return false;
    }

    if (formData.perfis.some((perfil) => perfil.tipo === 'morador' && !perfil.unidadeId)) {
      showToast({
        title: 'Unidade obrigatoria',
        description: 'Associe a unidade quando o perfil for de morador.',
        variant: 'warning',
      });
      return false;
    }

    return true;
  };

  const salvarUsuario = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        ...(formData.senha.trim() ? { senha: formData.senha } : {}),
        perfis: formData.perfis.map((perfil) => ({
          condominioId: perfil.condominioId,
          tipo: perfil.tipo,
          ativo: perfil.ativo,
          unidadeId: perfil.tipo === 'morador' ? perfil.unidadeId || null : null,
        })),
      };

      const response = await fetch(
        usuarioEditando ? `/api/admin/usuarios/${usuarioEditando.id}` : '/api/admin/usuarios',
        {
          method: usuarioEditando ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.erro || 'Nao foi possivel salvar o usuario');
      }

      await carregarUsuarios();
      setModalAberto(false);
      setUsuarioEditando(null);
      showToast({
        title: usuarioEditando ? 'Usuario atualizado' : 'Usuario criado',
        description: usuarioEditando
          ? 'Os dados do usuario foram atualizados com sucesso.'
          : 'O novo usuario ja esta pronto para acessar o sistema.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Falha ao salvar usuario',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
        variant: 'error',
      });
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!usuarioExcluindo) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/usuarios/${usuarioExcluindo.id}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.erro || 'Nao foi possivel excluir o usuario');
      }

      await carregarUsuarios();
      setUsuarioExcluindo(null);
      showToast({
        title: 'Usuario excluido',
        description: 'O usuario foi removido com sucesso.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Falha ao excluir usuario',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
        variant: 'error',
      });
    }
  };

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return usuarios.filter((usuarioItem) => {
      const correspondeBusca =
        !termo ||
        usuarioItem.nome.toLowerCase().includes(termo) ||
        usuarioItem.email.toLowerCase().includes(termo);

      const correspondeCondominio =
        !filtroCondominio ||
        usuarioItem.perfis.some((perfil) => perfil.condominioId === filtroCondominio);

      const correspondeTipo =
        !filtroTipo || usuarioItem.perfis.some((perfil) => perfil.tipo === filtroTipo);

      return correspondeBusca && correspondeCondominio && correspondeTipo;
    });
  }, [busca, filtroCondominio, filtroTipo, usuarios]);

  if (status !== 'loading' && !temAcesso) {
    return (
      <Layout>
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-800">
          Voce nao tem permissao para acessar esta pagina.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Operacao local de usuarios
            </div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 sm:text-3xl">
              <Users className="h-8 w-8 text-blue-600" />
              Usuarios e vinculos
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Cadastre moradores, porteiros, sindicos e administradores, com vinculacao direta a
              unidade quando necessario.
            </p>
          </div>

          <Button onClick={() => void abrirModalNovoUsuario()} className="h-12 rounded-2xl">
            <Plus className="mr-2 h-4 w-4" />
            Novo usuario
          </Button>
        </section>

        {erro && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Nome ou e-mail"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Condominio</label>
              <select
                value={filtroCondominio}
                onChange={(event) => setFiltroCondominio(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {condominiosDisponiveis.map((condominio) => (
                  <option key={condominio.id} value={condominio.id}>
                    {condominio.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Perfil</label>
              <select
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {(ehAdministradorMestre
                  ? (['administrador_mestre', ...TIPOS_GESTAO_LOCAL] as TipoPerfil[])
                  : TIPOS_GESTAO_LOCAL
                ).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {TIPOS_PERFIL_LABEL[tipo]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setFiltroCondominio('');
                  setFiltroTipo('');
                }}
                className="h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Limpar
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{usuariosFiltrados.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs text-emerald-700">Moradores</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {usuariosFiltrados.filter((item) => item.perfis.some((perfil) => perfil.tipo === 'morador')).length}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs text-blue-700">Gestores locais</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {
                usuariosFiltrados.filter((item) =>
                  item.perfis.some((perfil) =>
                    ['administrador_condominio', 'sindico'].includes(perfil.tipo)
                  )
                ).length
              }
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Com unidade vinculada</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {usuariosFiltrados.filter((item) => item.unidades.length > 0).length}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          {carregando ? (
            <div className="p-10 text-center text-sm text-slate-600">Carregando usuarios...</div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-600">
              Nenhum usuario encontrado neste filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Perfis e condominios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Unidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuariosFiltrados.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{item.nome}</p>
                        <p className="text-sm text-slate-500">{item.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {item.perfis.map((perfil) => (
                            <div key={`${perfil.condominioId}-${perfil.tipo}`} className="text-sm">
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                {TIPOS_PERFIL_LABEL[perfil.tipo]}
                              </span>
                              <span className="ml-2 text-slate-600">
                                {perfil.condominio?.nome || 'Condominio'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.unidades.length === 0 ? (
                          <span className="text-sm text-slate-500">Sem unidade vinculada</span>
                        ) : (
                          <div className="space-y-2">
                            {item.unidades.map((unidade) => (
                              <div key={unidade.id} className="text-sm text-slate-600">
                                <div className="font-medium text-slate-900">
                                  Unidade {unidade.numero}
                                </div>
                                <div>
                                  {unidade.torre.nome} - {unidade.condominio.nome}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void abrirModalEditarUsuario(item)}
                            className="rounded-2xl p-2 text-blue-600 transition-colors hover:bg-blue-50"
                            title="Editar usuario"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUsuarioExcluindo(item)}
                            className="rounded-2xl p-2 text-red-600 transition-colors hover:bg-red-50"
                            title="Excluir usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {modalAberto && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]">
            <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
              <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {usuarioEditando ? 'Editar usuario' : 'Novo usuario'}
                      </h2>
                      <p className="text-sm text-slate-500">
                        Para moradores, ja e possivel definir a unidade responsavel nesta etapa.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalAberto(false)}
                      className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <span className="sr-only">Fechar</span>
                      x
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto px-5 py-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Nome</label>
                      <input
                        value={formData.nome}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, nome: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome completo"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">E-mail</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, email: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Senha {usuarioEditando ? '(opcional)' : ''}
                    </label>
                    <input
                      type="password"
                      value={formData.senha}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, senha: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={
                        usuarioEditando ? 'Preencha apenas se quiser trocar a senha' : 'Minimo de 6 caracteres'
                      }
                    />
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">Perfis do usuario</p>
                        <p className="text-sm text-slate-500">
                          Sindico e administrador local tambem podem vincular a unidade do morador aqui.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void adicionarPerfil()}
                        className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Adicionar perfil
                      </button>
                    </div>

                    {formData.perfis.map((perfil, index) => (
                      <div
                        key={`${perfil.condominioId}-${perfil.tipo}-${index}`}
                        className="rounded-[28px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Condominio
                            </label>
                            <select
                              value={perfil.condominioId}
                              onChange={(event) => {
                                const condominioId = event.target.value;
                                atualizarPerfil(index, 'condominioId', condominioId);
                                void carregarUnidades(condominioId);
                              }}
                              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Selecione</option>
                              {condominiosDisponiveis.map((condominio) => (
                                <option key={condominio.id} value={condominio.id}>
                                  {condominio.nome}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Perfil
                            </label>
                            <select
                              value={perfil.tipo}
                              onChange={(event) =>
                                atualizarPerfil(index, 'tipo', event.target.value as TipoPerfil)
                              }
                              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {(ehAdministradorMestre
                                ? (['administrador_mestre', ...TIPOS_GESTAO_LOCAL] as TipoPerfil[])
                                : TIPOS_GESTAO_LOCAL
                              ).map((tipo) => (
                                <option key={tipo} value={tipo}>
                                  {TIPOS_PERFIL_LABEL[tipo]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Status
                            </label>
                            <label className="flex h-[50px] items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4">
                              <input
                                type="checkbox"
                                checked={perfil.ativo}
                                onChange={(event) =>
                                  atualizarPerfil(index, 'ativo', event.target.checked)
                                }
                              />
                              <span className="text-sm text-slate-700">
                                {perfil.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </label>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Unidade
                            </label>
                            <select
                              value={perfil.unidadeId}
                              disabled={perfil.tipo !== 'morador' || !perfil.condominioId}
                              onChange={(event) =>
                                atualizarPerfil(index, 'unidadeId', event.target.value)
                              }
                              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                            >
                              <option value="">
                                {perfil.tipo === 'morador'
                                  ? 'Selecione a unidade'
                                  : 'Disponivel apenas para morador'}
                              </option>
                              {unidadesDisponiveisParaPerfil(perfil).map((unidade) => (
                                <option key={unidade.id} value={unidade.id}>
                                  {`${unidade.torre.nome} - Unidade ${unidade.numero}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <UserSquare2 className="h-4 w-4" />
                            {perfil.tipo === 'morador'
                              ? 'Ao salvar, a unidade e as vagas passam para este morador.'
                              : 'Perfis operacionais nao exigem unidade.'}
                          </div>

                          {formData.perfis.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removerPerfil(index)}
                              className="text-sm font-medium text-red-600 transition-colors hover:text-red-700"
                            >
                              Remover perfil
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setModalAberto(false)}
                      className="h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <Button
                      onClick={salvarUsuario}
                      loading={salvando}
                      className="h-12 rounded-2xl"
                    >
                      {usuarioEditando ? 'Salvar alteracoes' : 'Criar usuario'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {usuarioExcluindo && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]">
            <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
              <div className="w-full max-w-lg rounded-t-[32px] bg-white p-6 shadow-2xl sm:rounded-[32px]">
                <h2 className="text-xl font-bold text-slate-900">Excluir usuario</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Tem certeza que deseja excluir <strong>{usuarioExcluindo.nome}</strong>?
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Essa acao remove o acesso do usuario e todos os perfis dele no condominio.
                </p>

                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setUsuarioExcluindo(null)}
                    className="h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmarExclusao()}
                    className="h-12 rounded-2xl bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Excluir usuario
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
