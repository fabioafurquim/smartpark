'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Building2, CheckCircle, Home, KeyRound, Mail, User } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface UnidadeCadastro {
  id: string;
  numero: string;
  andar: number;
  tipo: string;
  totalVagas: number;
  disponivelParaVinculo: boolean;
  statusVinculo: 'disponivel' | 'ocupada' | 'pendente';
}

interface TorreCadastro {
  id: string;
  nome: string;
  tipo: string;
  unidades: UnidadeCadastro[];
}

interface CondominioCadastro {
  id: string;
  nome: string;
  codigoUnico: string;
  torres: TorreCadastro[];
}

export default function CadastroPage() {
  const router = useRouter();
  const [codigoCondominio, setCodigoCondominio] = useState('');
  const [condominio, setCondominio] = useState<CondominioCadastro | null>(null);
  const [torreId, setTorreId] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [formulario, setFormulario] = useState({
    nome: '',
    email: '',
    senha: '',
  });
  const [carregandoCondominio, setCarregandoCondominio] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const torreSelecionada = useMemo(
    () => condominio?.torres.find((torre) => torre.id === torreId) || null,
    [condominio, torreId]
  );

  const unidades = torreSelecionada?.unidades || [];

  const buscarCondominio = async () => {
    if (!codigoCondominio.trim()) {
      setErro('Informe o codigo do condominio para continuar.');
      return;
    }

    try {
      setErro('');
      setCarregandoCondominio(true);
      const response = await fetch(
        `/api/cadastro/condominio?codigo=${encodeURIComponent(
          codigoCondominio.trim().toUpperCase()
        )}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel validar o condominio');
      }

      setCondominio(data);
      setTorreId('');
      setUnidadeId('');
    } catch (error) {
      setCondominio(null);
      setTorreId('');
      setUnidadeId('');
      setErro(error instanceof Error ? error.message : 'Erro ao consultar condominio');
    } finally {
      setCarregandoCondominio(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!condominio) {
      setErro('Valide primeiro o codigo do condominio.');
      return;
    }

    if (!unidadeId) {
      setErro('Selecione a sua unidade.');
      return;
    }

    try {
      setErro('');
      setEnviando(true);

      const response = await fetch('/api/cadastro/solicitacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formulario,
          codigoCondominio: condominio.codigoUnico,
          unidadeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel enviar o cadastro');
      }

      router.push(
        `/login?cadastro=pendente&email=${encodeURIComponent(formulario.email)}`
      );
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao enviar cadastro');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
              Cadastro de Morador
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Solicite seu acesso ao SmartPark
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Informe o codigo do seu condominio, selecione sua unidade e aguarde a aprovacao do sindico ou administrador local.
            </p>
          </div>

          <Link
            href="/login"
            className="text-sm font-medium text-primary-700 transition-colors hover:text-primary-800"
          >
            Ja tenho conta
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="mb-6 rounded-2xl border border-primary-100 bg-primary-50/70 p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Codigo do condominio
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={codigoCondominio}
                  onChange={(event) => setCodigoCondominio(event.target.value.toUpperCase())}
                  placeholder="Ex.: COND123"
                  startIcon={<KeyRound className="h-4 w-4" />}
                  fullWidth
                />
                <Button
                  type="button"
                  onClick={buscarCondominio}
                  loading={carregandoCondominio}
                  className="sm:min-w-40"
                >
                  Validar codigo
                </Button>
              </div>
            </div>

            {condominio && (
              <div className="mb-6 rounded-2xl border border-green-100 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">{condominio.nome}</p>
                    <p className="text-sm text-green-700">
                      Codigo confirmado. Agora escolha sua torre e unidade.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nome completo"
                  value={formulario.nome}
                  onChange={(event) =>
                    setFormulario((atual) => ({ ...atual, nome: event.target.value }))
                  }
                  startIcon={<User className="h-4 w-4" />}
                  fullWidth
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  value={formulario.email}
                  onChange={(event) =>
                    setFormulario((atual) => ({ ...atual, email: event.target.value }))
                  }
                  startIcon={<Mail className="h-4 w-4" />}
                  fullWidth
                  required
                />
              </div>

              <Input
                label="Senha"
                type="password"
                value={formulario.senha}
                onChange={(event) =>
                  setFormulario((atual) => ({ ...atual, senha: event.target.value }))
                }
                startIcon={<KeyRound className="h-4 w-4" />}
                helperText="Minimo de 6 caracteres."
                fullWidth
                required
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Torre ou bloco
                  </label>
                  <select
                    value={torreId}
                    onChange={(event) => {
                      setTorreId(event.target.value);
                      setUnidadeId('');
                    }}
                    disabled={!condominio}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Selecione</option>
                    {condominio?.torres.map((torre) => (
                      <option key={torre.id} value={torre.id}>
                        {torre.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Unidade
                  </label>
                  <select
                    value={unidadeId}
                    onChange={(event) => setUnidadeId(event.target.value)}
                    disabled={!torreId}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Selecione</option>
                    {unidades.map((unidade) => (
                      <option
                        key={unidade.id}
                        value={unidade.id}
                        disabled={!unidade.disponivelParaVinculo}
                      >
                        {`Unidade ${unidade.numero} - ${
                          unidade.disponivelParaVinculo
                            ? 'disponivel'
                            : unidade.statusVinculo === 'pendente'
                              ? 'com solicitacao pendente'
                              : 'ja vinculada'
                        }`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {erro && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <span>{erro}</span>
                  </div>
                </div>
              )}

              <Button type="submit" loading={enviando} fullWidth size="lg">
                Enviar solicitacao
              </Button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/70 bg-slate-900 p-6 text-white shadow-sm">
              <Building2 className="mb-4 h-8 w-8 text-primary-300" />
              <h2 className="text-xl font-semibold">Como funciona</h2>
              <div className="mt-5 space-y-4 text-sm text-slate-200">
                <div>
                  <p className="font-medium text-white">1. Valide seu condominio</p>
                  <p>Use o codigo unico recebido do seu condominio.</p>
                </div>
                <div>
                  <p className="font-medium text-white">2. Escolha sua unidade</p>
                  <p>Selecione a torre e a unidade que devem ser vinculadas ao seu perfil.</p>
                </div>
                <div>
                  <p className="font-medium text-white">3. Aguarde a aprovacao</p>
                  <p>O sindico ou administrador local libera seu acesso e suas vagas.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Home className="h-6 w-6 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  O que voce ganha depois da aprovacao
                </h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                <li>Visualizar apenas vagas do seu proprio condominio.</li>
                <li>Publicar as vagas da sua unidade quando quiser disponibiliza-las.</li>
                <li>Acompanhar solicitacoes, aprovacoes e suas locacoes no app.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
