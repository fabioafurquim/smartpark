'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock3, Home, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';

interface CadastroStatus {
  possuiPerfisAtivos: boolean;
  solicitacao: {
    id: string;
    status: 'pendente' | 'aprovado' | 'rejeitado';
    observacoes?: string | null;
    criadoEm: string;
    condominio?: {
      nome: string;
      codigoUnico: string;
    } | null;
    unidade?: {
      numero: string;
      torre?: {
        nome: string;
      } | null;
    } | null;
  } | null;
}

export default function CadastroPendentePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dados, setDados] = useState<CadastroStatus | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const carregarStatus = async () => {
      try {
        const response = await fetch('/api/cadastro/status');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Nao foi possivel carregar o status');
        }

        if (data.possuiPerfisAtivos) {
          router.replace('/dashboard');
          return;
        }

        setDados(data);
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Erro ao carregar status');
      } finally {
        setCarregando(false);
      }
    };

    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated') {
      void carregarStatus();
    }
  }, [router, status]);

  const statusAtual = dados?.solicitacao?.status || 'pendente';

  const statusConfig = {
    pendente: {
      titulo: 'Sua solicitacao esta em analise',
      descricao:
        'Assim que o sindico ou administrador local aprovar seu vinculo, seu acesso de morador sera liberado automaticamente.',
      icone: Clock3,
      cor: 'text-amber-600 bg-amber-100 border-amber-200',
    },
    aprovado: {
      titulo: 'Seu acesso foi aprovado',
      descricao:
        'Seu perfil ja esta pronto. Entre no dashboard para visualizar suas vagas e locacoes.',
      icone: CheckCircle2,
      cor: 'text-green-600 bg-green-100 border-green-200',
    },
    rejeitado: {
      titulo: 'Sua solicitacao nao foi aprovada',
      descricao:
        dados?.solicitacao?.observacoes ||
        'Revise seus dados com o condominio e envie uma nova solicitacao se necessario.',
      icone: XCircle,
      cor: 'text-red-600 bg-red-100 border-red-200',
    },
  }[statusAtual];

  if (status === 'loading' || carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  const IconeStatus = statusConfig.icone;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-300">
            Acompanhamento de cadastro
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Olá, {session?.user?.name || 'morador'}
          </h1>
          <p className="mt-3 text-sm text-slate-200">
            Enquanto seu vinculo nao e aprovado, seu acesso fica restrito a esta tela de acompanhamento.
          </p>
        </div>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">Nao foi possivel carregar seu status</p>
                <p className="mt-1 text-sm">{erro}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl border p-6 ${statusConfig.cor}`}>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/70 p-3">
                <IconeStatus className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{statusConfig.titulo}</h2>
                <p className="mt-2 text-sm">{statusConfig.descricao}</p>
              </div>
            </div>
          </div>
        )}

        {dados?.solicitacao && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-gray-900">
              <Home className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold">Dados da solicitacao</h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Condominio</p>
                <p className="mt-1 font-medium text-gray-900">
                  {dados.solicitacao.condominio?.nome || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Codigo</p>
                <p className="mt-1 font-medium text-gray-900">
                  {dados.solicitacao.condominio?.codigoUnico || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Torre</p>
                <p className="mt-1 font-medium text-gray-900">
                  {dados.solicitacao.unidade?.torre?.nome || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Unidade</p>
                <p className="mt-1 font-medium text-gray-900">
                  {dados.solicitacao.unidade?.numero || '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {statusAtual === 'aprovado' ? (
            <Button onClick={() => router.push('/dashboard')} fullWidth>
              Ir para o dashboard
            </Button>
          ) : (
            <Button onClick={() => window.location.reload()} variant="outline" fullWidth>
              Atualizar status
            </Button>
          )}

          <Button
            variant="ghost"
            fullWidth
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sair da conta
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-primary-700 hover:text-primary-800">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
