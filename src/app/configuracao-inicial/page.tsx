'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { configuracaoInicialSchema } from '@/lib/validations';
import { ConfiguracaoInicialForm } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Building, User, Settings, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

/**
 * Página de Configuração Inicial do Sistema SmartPark
 * 
 * Esta página guia o usuário através do processo de configuração inicial
 * do sistema, coletando informações da empresa e criando o administrador mestre.
 */
export default function ConfiguracaoInicial() {
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [verificandoConfiguracao, setVerificandoConfiguracao] = useState(true);
  const router = useRouter();

  // Verifica se o sistema já foi configurado
  useEffect(() => {
    const verificarConfiguracao = async () => {
      try {
        const response = await fetch('/api/configuracao-inicial');
        if (response.ok) {
          const data = await response.json();
          if (data.configurado) {
            // Sistema já configurado, redireciona para login
            router.push('/login?jaConfigurado=true');
            return;
          }
        }
      } catch (error) {
        console.error('Erro ao verificar configuração:', error);
      } finally {
        setVerificandoConfiguracao(false);
      }
    };

    verificarConfiguracao();
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger
  } = useForm<ConfiguracaoInicialForm>({
    resolver: zodResolver(configuracaoInicialSchema),
    mode: 'onChange'
  });

  const watchedValues = watch();

  const proximaEtapa = async () => {
    const camposEtapa1 = ['nomeEmpresa', 'emailContato', 'telefoneContato'];
    const camposEtapa2 = ['nomeAdmin', 'emailAdmin', 'senhaAdmin', 'confirmarSenhaAdmin'];
    
    if (etapaAtual === 1) {
      const isValid = await trigger(camposEtapa1 as any);
      if (isValid) setEtapaAtual(2);
    } else if (etapaAtual === 2) {
      const isValid = await trigger(camposEtapa2 as any);
      if (isValid) setEtapaAtual(3);
    }
  };



  /**
   * Navega para a etapa anterior
   */
  const etapaAnterior = () => {
    if (etapaAtual > 1) {
      setEtapaAtual(etapaAtual - 1);
    }
  };

  const onSubmit = async (data: ConfiguracaoInicialForm) => {
    setLoading(true);
    setErro('');
    
    try {
      const response = await fetch('/api/configuracao-inicial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSucesso(true);
        setTimeout(() => {
          router.push('/login?configurado=true');
        }, 2000);
      } else {
        const error = await response.json();
        setErro(error.message || 'Erro ao configurar o sistema');
      }
    } catch (error) {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };







  // Tela de loading enquanto verifica configuração
  if (verificandoConfiguracao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900">
                Verificando Configuração
              </h2>
              <p className="text-gray-600">
                Aguarde enquanto verificamos se o sistema já foi configurado...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">
                Configuração Concluída!
              </h2>
              <p className="text-gray-600">
                O sistema foi configurado com sucesso. Você será redirecionado para a página de login.
              </p>
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Redirecionando...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Header com design moderno */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl mb-6 shadow-lg">
            <Settings className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent mb-3">
            Configuração Inicial SmartPark
          </h1>
          <p className="text-blue-600 text-lg font-medium">
            Configure sua empresa e crie o administrador mestre do sistema
          </p>
        </div>

        {/* Indicador de progresso moderno */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center bg-white rounded-full p-2 shadow-lg border border-blue-100">
            {[1, 2, 3].map((step, index) => {
              const isAtual = step === etapaAtual;
              const isConcluida = step < etapaAtual;
              const icons = [Building, User, CheckCircle];
              const Icon = icons[index];
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 transform
                    ${
                      isAtual
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white scale-110 shadow-lg'
                        : isConcluida
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-blue-50 text-blue-300 border-2 border-blue-200'
                    }
                  `}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  {index < 2 && (
                    <div className={`
                      w-16 h-1 mx-3 rounded-full transition-all duration-300
                      ${
                        step < etapaAtual
                          ? 'bg-gradient-to-r from-green-400 to-green-500'
                          : 'bg-blue-200'
                      }
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card principal com design moderno */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center justify-center mb-4">
              <Badge className="px-6 py-2 bg-white/20 text-white border-white/30 rounded-full text-sm font-semibold">
                Etapa {etapaAtual} de 3
              </Badge>
            </div>
            <CardTitle className="text-3xl font-bold mb-2">
              {etapaAtual === 1 && 'Dados da Empresa'}
              {etapaAtual === 2 && 'Administrador Mestre'}
              {etapaAtual === 3 && 'Confirmação Final'}
            </CardTitle>
            <CardDescription className="text-blue-100 text-lg">
              {etapaAtual === 1 && 'Informações básicas da sua empresa'}
              {etapaAtual === 2 && 'Criação do usuário administrador principal'}
              {etapaAtual === 3 && 'Revisão e finalização da configuração'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Etapa 1: Dados da Empresa */}
              {etapaAtual === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className="space-y-6">
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 z-10" />
                      <Input
                        className="pl-12 h-14 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-blue-50/50"
                        placeholder="Nome da sua empresa"
                        error={errors.nomeEmpresa?.message}
                        {...register('nomeEmpresa')}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 z-10" />
                        <Input
                          className="pl-12 h-14 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-blue-50/50"
                          type="email"
                          placeholder="contato@empresa.com"
                          error={errors.emailContato?.message}
                          {...register('emailContato')}
                        />
                      </div>
                      
                      <div className="relative">
                        <Settings className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 z-10" />
                        <Input
                          className="pl-12 h-14 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-blue-50/50"
                          placeholder="(11) 99999-9999"
                          error={errors.telefoneContato?.message}
                          {...register('telefoneContato')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 2: Administrador Mestre */}
              {etapaAtual === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className="space-y-6">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 z-10" />
                      <Input
                        className="pl-12 h-14 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-blue-50/50"
                        placeholder="Nome completo do administrador"
                        error={errors.nomeAdmin?.message}
                        {...register('nomeAdmin')}
                      />
                    </div>
                    
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 z-10" />
                      <Input
                        className="pl-12 h-14 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-blue-50/50"
                        type="email"
                        placeholder="admin@empresa.com"
                        error={errors.emailAdmin?.message}
                        {...register('emailAdmin')}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative">
                        <Settings className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 z-10" />
                        <Input
                          className="pl-12 h-14 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-blue-50/50"
                          type="password"
                          placeholder="Senha segura"
                          error={errors.senhaAdmin?.message}
                          {...register('senhaAdmin')}
                        />
                      </div>
                      
                      <div className="relative">
                        <Settings className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 z-10" />
                        <Input
                          className="pl-12 h-14 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-blue-50/50"
                          type="password"
                          placeholder="Confirme a senha"
                          error={errors.confirmarSenhaAdmin?.message}
                          {...register('confirmarSenhaAdmin')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 3: Confirmação */}
              {etapaAtual === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right duration-300">
                  <Alert className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <AlertDescription className="text-blue-800 font-medium">
                      Revise as informações abaixo antes de finalizar a configuração do sistema.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
                      <h3 className="font-bold text-blue-800 mb-4 text-lg flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Dados da Empresa
                      </h3>
                      <div className="space-y-3 text-blue-700">
                        <p className="flex justify-between"><span className="font-semibold">Nome:</span> <span>{watchedValues.nomeEmpresa}</span></p>
                        <p className="flex justify-between"><span className="font-semibold">Email:</span> <span>{watchedValues.emailContato}</span></p>
                        <p className="flex justify-between"><span className="font-semibold">Telefone:</span> <span>{watchedValues.telefoneContato}</span></p>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
                      <h3 className="font-bold text-blue-800 mb-4 text-lg flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Administrador Mestre
                      </h3>
                      <div className="space-y-3 text-blue-700">
                        <p className="flex justify-between"><span className="font-semibold">Nome:</span> <span>{watchedValues.nomeAdmin}</span></p>
                        <p className="flex justify-between"><span className="font-semibold">Email:</span> <span>{watchedValues.emailAdmin}</span></p>
                        <p className="flex justify-between"><span className="font-semibold">Senha:</span> <span>••••••••••</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de navegação modernos */}
              <div className="flex justify-between pt-8 border-t border-blue-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={etapaAnterior}
                  disabled={etapaAtual === 1}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 disabled:opacity-50"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Anterior
                </Button>

                {etapaAtual < 3 ? (
                  <Button
                    type="button"
                    onClick={proximaEtapa}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Próximo
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Configurando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Finalizar Configuração
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}