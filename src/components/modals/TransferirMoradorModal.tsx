'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Search, X } from 'lucide-react';

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Unidade {
  id: string;
  numero: string;
  usuarioId?: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
  torre: {
    nome: string;
    tipo: 'TORRE' | 'BLOCO';
  };
}

interface TransferirMoradorModalProps {
  isOpen: boolean;
  unidade: Unidade | null;
  condominioId: string;
  onClose: () => void;
  onTransferir: (usuarioId: string) => Promise<void>;
}

export default function TransferirMoradorModal({
  isOpen,
  unidade,
  condominioId,
  onClose,
  onTransferir,
}: TransferirMoradorModalProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !condominioId) {
      return;
    }

    const carregarMoradores = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('/api/admin/usuarios?tipo=morador');

        if (!response.ok) {
          throw new Error('Nao foi possivel carregar os moradores');
        }

        const data = await response.json();
        const usuariosDoCondominio = (data.usuarios || []).filter((item: any) =>
          item.perfis?.some(
            (perfil: any) => perfil.condominioId === condominioId && perfil.tipo === 'morador'
          )
        );

        setUsuarios(usuariosDoCondominio);
      } catch (fetchError) {
        console.error('Erro ao carregar moradores:', fetchError);
        setError('Nao foi possivel carregar os moradores deste condominio');
      } finally {
        setIsLoading(false);
      }
    };

    carregarMoradores();
  }, [isOpen, condominioId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (unidade?.usuario) {
      setUsuarioSelecionado({
        id: unidade.usuario.id,
        nome: unidade.usuario.nome,
        email: unidade.usuario.email,
      });
      setBuscaUsuario(unidade.usuario.nome);
    } else {
      setUsuarioSelecionado(null);
      setBuscaUsuario('');
    }

    setDropdownAberto(false);
    setError('');
  }, [isOpen, unidade]);

  const usuariosFiltrados = useMemo(() => {
    const termo = buscaUsuario.trim().toLowerCase();

    if (!termo) {
      return usuarios;
    }

    return usuarios.filter(
      (usuario) =>
        usuario.nome.toLowerCase().includes(termo) ||
        usuario.email.toLowerCase().includes(termo)
    );
  }, [buscaUsuario, usuarios]);

  const selecionarUsuario = (usuario: Usuario) => {
    setUsuarioSelecionado(usuario);
    setBuscaUsuario(usuario.nome);
    setDropdownAberto(false);
    setError('');
  };

  const limparUsuario = () => {
    setUsuarioSelecionado(null);
    setBuscaUsuario('');
    setDropdownAberto(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!usuarioSelecionado) {
      setError('Selecione um morador para concluir a transferencia');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onTransferir(usuarioSelecionado.id);
      onClose();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Erro ao transferir morador';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !unidade) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-6">
          <div className="flex items-center">
            <ArrowRightLeft className="mr-3 h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Transferir Morador</h2>
              <p className="text-sm text-gray-500">
                Unidade {unidade.numero} - {unidade.torre.nome}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            {unidade.usuario ? (
              <p>
                Morador atual: <strong>{unidade.usuario.nome}</strong>. Ao transferir, as vagas
                desta unidade passam a ficar sob responsabilidade do novo morador.
              </p>
            ) : (
              <p>
                Esta unidade ainda nao possui morador principal. Selecione um morador para vincular
                a unidade e liberar a gestao das vagas correspondentes.
              </p>
            )}
          </div>

          <div className="relative">
            <label htmlFor="usuario-transferencia" className="mb-1 block text-sm font-medium text-gray-700">
              Novo morador responsavel
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                id="usuario-transferencia"
                type="text"
                value={buscaUsuario}
                onChange={(event) => {
                  setBuscaUsuario(event.target.value);
                  setUsuarioSelecionado(null);
                }}
                onFocus={() => setDropdownAberto(true)}
                onBlur={() => setTimeout(() => setDropdownAberto(false), 150)}
                placeholder="Digite nome ou email do morador"
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
              {buscaUsuario && (
                <button
                  type="button"
                  onClick={limparUsuario}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {dropdownAberto && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg">
                {isLoading ? (
                  <div className="p-4 text-sm text-gray-500">Carregando moradores...</div>
                ) : usuariosFiltrados.length > 0 ? (
                  usuariosFiltrados.map((usuario) => (
                    <button
                      key={usuario.id}
                      type="button"
                      onClick={() => selecionarUsuario(usuario)}
                      className="flex w-full flex-col border-b px-4 py-3 text-left hover:bg-blue-50 last:border-b-0"
                    >
                      <span className="font-medium text-gray-900">{usuario.nome}</span>
                      <span className="text-xs text-gray-500">{usuario.email}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-sm text-gray-500">Nenhum morador encontrado</div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving || isLoading}
            >
              {isSaving ? 'Transferindo...' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
