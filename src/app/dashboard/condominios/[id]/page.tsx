'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, Phone, Mail, Users, Home } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Layout } from '@/components/Layout';

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  telefone?: string;
  email?: string;
  codigoUnico: string;
  logoUrl?: string;
  ativo: boolean;
  criadoEm: string;
  _count: {
    torres: number;
    perfisUsuario: number;
  };
}

/**
 * Página de visualização de condomínio
 */
export default function VisualizarCondominioPage() {
  const params = useParams();
  const router = useRouter();
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const condominioId = params.id as string;

  useEffect(() => {
    if (!condominioId) return;

    const buscarCondominio = async () => {
      try {
        setCarregando(true);
        setErro('');

        const response = await fetch(`/api/condominios/${condominioId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setErro('Condomínio não encontrado');
          } else {
            setErro('Erro ao carregar condomínio');
          }
          return;
        }

        const data = await response.json();
        setCondominio(data);
      } catch (error) {
        console.error('Erro ao buscar condomínio:', error);
        setErro('Erro ao carregar condomínio');
      } finally {
        setCarregando(false);
      }
    };

    buscarCondominio();
  }, [condominioId]);

  if (carregando) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (erro) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-6 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="text-red-500 mb-4">
                <Building2 className="w-12 h-12 mx-auto mb-2" />
              </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{erro}</h2>
            <p className="text-gray-600 mb-4">
              O condomínio solicitado não pôde ser carregado.
            </p>
            <Button onClick={() => router.push('/dashboard/condominios')}>
              Voltar para Lista
            </Button>
          </div>
        </div>
        </div>
      </Layout>
    );
  }

  if (!condominio) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mr-4 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Detalhes do Condomínio
            </h1>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/condominios/${condominioId}/editar`)}
            >
              Editar
            </Button>
          </div>
        </div>

        {/* Informações do Condomínio */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header do Card */}
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {condominio.nome}
                </h2>
                <p className="text-sm text-gray-600">
                  Código: {condominio.codigoUnico}
                </p>
              </div>
              <div className="ml-auto">
                <span className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  condominio.ativo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                )}>
                  {condominio.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Conteúdo do Card */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Informações Básicas
                </h3>
                
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Endereço</p>
                    <p className="text-sm text-gray-600">{condominio.endereco}</p>
                  </div>
                </div>

                {condominio.telefone && (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Telefone</p>
                      <p className="text-sm text-gray-600">{condominio.telefone}</p>
                    </div>
                  </div>
                )}

                {condominio.email && (
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-600">{condominio.email}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Estatísticas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Estatísticas
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Home className="w-5 h-5 text-blue-600 mr-2" />
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {condominio._count.torres}
                        </p>
                        <p className="text-sm text-blue-600">
                          {condominio._count.torres === 1 ? 'Torre' : 'Torres'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-green-600 mr-2" />
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {condominio._count.perfisUsuario}
                        </p>
                        <p className="text-sm text-green-600">
                          {condominio._count.perfisUsuario === 1 ? 'Usuário' : 'Usuários'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações Adicionais */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Informações do Sistema
              </h3>
              
              <div className="text-sm text-gray-600">
                <p>
                  <span className="font-medium">Criado em:</span>{' '}
                  {new Date(condominio.criadoEm).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
}