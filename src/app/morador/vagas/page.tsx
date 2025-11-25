'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { GerenciadorVagas, VisualizadorVagas, MinhasReservas } from '@/components/vagas';

type TabAtiva = 'gerenciar' | 'visualizar' | 'reservas';

export default function PaginaVagas() {
  const { data: session, status } = useSession();
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('visualizar');

  if (status === 'loading') {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (status === 'unauthenticated') {
    return <div className="text-center py-8">Você precisa estar autenticado</div>;
  }

  const usuarioId = (session?.user as any)?.id;
  const condominioId = (session?.user as any)?.perfis?.[0]?.condominioId;

  if (!usuarioId || !condominioId) {
    return <div className="text-center py-8">Dados de sessão inválidos</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Vagas</h1>
          <p className="text-gray-600 mt-2">
            Gerencie suas vagas e crie reservas
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setTabAtiva('visualizar')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              tabAtiva === 'visualizar'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Visualizar Vagas
          </button>
          <button
            onClick={() => setTabAtiva('reservas')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              tabAtiva === 'reservas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Minhas Reservas
          </button>
          <button
            onClick={() => setTabAtiva('gerenciar')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              tabAtiva === 'gerenciar'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Gerenciar Minhas Vagas
          </button>
        </div>

        {/* Conteúdo das Tabs */}
        <div>
          {tabAtiva === 'visualizar' && (
            <VisualizadorVagas
              condominioId={condominioId}
              usuarioId={usuarioId}
            />
          )}
          {tabAtiva === 'reservas' && (
            <MinhasReservas usuarioId={usuarioId} />
          )}
          {tabAtiva === 'gerenciar' && (
            <GerenciadorVagas
              condominioId={condominioId}
              usuarioId={usuarioId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
