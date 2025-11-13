'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';

// Schema de validação para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

type LoginForm = z.infer<typeof loginSchema>;

/**
 * Componente interno que usa useSearchParams
 */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Verificar se o sistema foi configurado com sucesso
  useEffect(() => {
    const configurado = searchParams.get('configurado');
    const jaConfigurado = searchParams.get('jaConfigurado');
    
    if (configurado === 'true') {
      setSucesso('Sistema configurado com sucesso! Faça login para continuar.');
    } else if (jaConfigurado === 'true') {
      setSucesso('Sistema já foi configurado anteriormente. Faça login para continuar.');
    }
  }, [searchParams]);

  // Verificar se já está logado
  useEffect(() => {
    const verificarSessao = async () => {
      const session = await getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    verificarSessao();
  }, [router]);

  const onSubmit = async (dados: LoginForm) => {
    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      console.log('Dados enviados:', { email: dados.email, senha: dados.senha });
      
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
          case 'UserNotFound':
            setErro('Usuário não encontrado');
            break;
          case 'UserInactive':
            setErro('Usuário inativo. Entre em contato com o administrador.');
            break;
          default:
            setErro('Erro ao fazer login. Tente novamente.');
        }
      } else if (resultado?.ok) {
        // Login bem-sucedido
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
        router.push(callbackUrl);
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setErro('Erro interno. Tente novamente mais tarde.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SmartPark
          </h1>
          <p className="text-gray-600">
            Sistema de Gestão de Estacionamentos
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Fazer Login
            </h2>
            <p className="text-gray-600">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          {/* Mensagens de feedback */}
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

          {/* Formulário */}
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

          {/* Links adicionais */}
          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
              onClick={() => {
                // TODO: Implementar recuperação de senha
                alert('Funcionalidade em desenvolvimento');
              }}
            >
              Esqueceu sua senha?
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} SmartPark. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Página de login do SmartPark
 */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              SmartPark
            </h1>
            <p className="text-gray-600">
              Carregando...
            </p>
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}