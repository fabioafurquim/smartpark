'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  senha: z.string().min(1, 'Senha e obrigatoria'),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [verificandoConfiguracao, setVerificandoConfiguracao] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const configurado = searchParams.get('configurado');
    const jaConfigurado = searchParams.get('jaConfigurado');
    const cadastro = searchParams.get('cadastro');
    const email = searchParams.get('email');

    if (configurado === 'true') {
      setSucesso('Sistema configurado com sucesso. Faca login para continuar.');
    } else if (jaConfigurado === 'true') {
      setSucesso('Sistema ja foi configurado anteriormente. Faca login para continuar.');
    } else if (cadastro === 'pendente') {
      setSucesso('Cadastro enviado com sucesso. Entre para acompanhar a aprovacao do seu vinculo.');
    }

    if (email) {
      setValue('email', email);
    }
  }, [searchParams, setValue]);

  useEffect(() => {
    const verificarConfiguracao = async () => {
      try {
        const response = await fetch('/api/configuracao-inicial');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.erro || 'Nao foi possivel verificar a configuracao');
        }

        if (!data.configurado) {
          router.replace('/configuracao-inicial');
          return;
        }

        setVerificandoConfiguracao(false);
      } catch (error) {
        console.error('Erro ao verificar configuracao:', error);
        setVerificandoConfiguracao(false);
      }
    };

    void verificarConfiguracao();
  }, [router]);

  useEffect(() => {
    if (verificandoConfiguracao) {
      return;
    }

    const verificarSessao = async () => {
      const session = await getSession();
      if (!session) {
        return;
      }

      const perfis = (((session.user as { perfis?: unknown[] } | undefined)?.perfis) || []);
      router.push(perfis.length > 0 ? '/dashboard' : '/cadastro/pendente');
    };

    void verificarSessao();
  }, [router, verificandoConfiguracao]);

  const onSubmit = async (dados: LoginForm) => {
    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resultado = await signIn('credentials', {
        email: dados.email,
        senha: dados.senha,
        redirect: false,
      });

      if (resultado?.error) {
        switch (resultado.error) {
          case 'CredentialsSignin':
            setErro('Email ou senha incorretos');
            break;
          default:
            setErro('Erro ao fazer login. Tente novamente.');
        }
      } else if (resultado?.ok) {
        const session = await getSession();
        const perfis = (((session?.user as { perfis?: unknown[] } | undefined)?.perfis) || []);
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
        router.push(perfis.length > 0 ? callbackUrl : '/cadastro/pendente');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setErro('Erro interno. Tente novamente mais tarde.');
    } finally {
      setCarregando(false);
    }
  };

  if (verificandoConfiguracao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SmartPark</h1>
          <p className="text-gray-600">Verificando ambiente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SmartPark</h1>
          <p className="text-gray-600">Sistema de Gestao de Estacionamentos</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fazer login</h2>
            <p className="text-gray-600">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          {sucesso && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-green-800 text-sm">{sucesso}</p>
            </div>
          )}

          {erro && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-800 text-sm">{erro}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              startIcon={<Mail className="w-4 h-4" />}
              {...register('email')}
              fullWidth
            />

            <Input
              label="Senha"
              type="password"
              placeholder="Digite sua senha"
              error={errors.senha?.message}
              startIcon={<Lock className="w-4 h-4" />}
              {...register('senha')}
              fullWidth
            />

            <Button
              type="submit"
              loading={carregando}
              disabled={carregando}
              fullWidth
              size="lg"
              className="mt-6"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/cadastro"
              className="mb-3 block text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Sou morador e quero solicitar acesso
            </Link>
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
              onClick={() => {
                showToast({
                  title: 'Recuperacao de senha',
                  description:
                    'Esse fluxo ainda sera implementado. Por enquanto, solicite apoio ao administrador do sistema.',
                  variant: 'info',
                });
              }}
            >
              Esqueceu sua senha?
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} SmartPark. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">SmartPark</h1>
              <p className="text-gray-600">Carregando...</p>
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
