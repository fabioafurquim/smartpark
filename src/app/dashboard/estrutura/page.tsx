'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Home, Car } from 'lucide-react';
import { Layout } from '@/components';
import { cn } from '@/lib/utils';

interface EstatisticasEstrutura {
  totalTorres: number;
  totalUnidades: number;
  totalVagas: number;
  vagasOcupadas: number;
}

/**
 * Página principal de gerenciamento de estrutura do condomínio
 */
export default function EstruturaPage() {
  const [estatisticas, setEstatisticas] = useState<EstatisticasEstrutura | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        const response = await fetch('/api/estrutura/estatisticas');
        if (response.ok) {
          const dados = await response.json();
          setEstatisticas(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setCarregando(false);
      }
    };

    carregarEstatisticas();
  }, []);

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  const cards = [
    {
      titulo: 'Torres/Blocos',
      valor: estatisticas?.totalTorres || 0,
      icone: Building2,
      cor: 'bg-blue-500',
      href: '/dashboard/estrutura/torres',
      descricao: 'Gerenciar torres e blocos'
    },
    {
      titulo: 'Unidades',
      valor: estatisticas?.totalUnidades || 0,
      icone: Home,
      cor: 'bg-green-500',
      href: '/dashboard/estrutura/unidades',
      descricao: 'Gerenciar unidades'
    },
    {
      titulo: 'Vagas',
      valor: estatisticas?.totalVagas || 0,
      icone: Car,
      cor: 'bg-purple-500',
      href: '/dashboard/estrutura/vagas',
      descricao: 'Gerenciar vagas de estacionamento'
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Estrutura do Condomínio
            </h1>
            <p className="text-gray-600">
              Gerencie torres, unidades e vagas de estacionamento
            </p>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, index) => {
            const Icone = card.icone;
            return (
              <Link
                key={index}
                href={card.href}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {card.titulo}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {card.valor}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {card.descricao}
                    </p>
                  </div>
                  <div className={cn(
                    'p-3 rounded-lg',
                    card.cor
                  )}>
                    <Icone className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Ações Rápidas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/estrutura/torres/nova"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Building2 className="w-8 h-8 text-primary-600 mb-2" />
              <h4 className="font-medium text-gray-900">Nova Torre/Bloco</h4>
              <p className="text-sm text-gray-600">Cadastrar nova torre ou bloco</p>
            </Link>
            
            <Link
              href="/dashboard/estrutura/unidades/nova"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Home className="w-8 h-8 text-primary-600 mb-2" />
              <h4 className="font-medium text-gray-900">Nova Unidade</h4>
              <p className="text-sm text-gray-600">Cadastrar nova unidade</p>
            </Link>
            
            <Link
              href="/dashboard/estrutura/vagas/nova"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Car className="w-8 h-8 text-primary-600 mb-2" />
              <h4 className="font-medium text-gray-900">Nova Vaga</h4>
              <p className="text-sm text-gray-600">Cadastrar nova vaga</p>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
