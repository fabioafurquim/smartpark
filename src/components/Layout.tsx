'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  titulo?: string;
  subtitulo?: string;
}

/**
 * Componente de layout principal da aplicação
 * Inclui sidebar, header e área de conteúdo
 */
export function Layout({ children, titulo, subtitulo }: LayoutProps) {
  const { status } = useSession();
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [montado, setMontado] = useState(false);

  // Carregar estado da sidebar do localStorage
  useEffect(() => {
    const estadoSalvo = localStorage.getItem('sidebarAberta');
    if (estadoSalvo !== null) {
      setSidebarAberta(JSON.parse(estadoSalvo));
    }
    setMontado(true);
  }, []);

  // Salvar estado da sidebar no localStorage
  const alternarSidebar = () => {
    const novoEstado = !sidebarAberta;
    setSidebarAberta(novoEstado);
    localStorage.setItem('sidebarAberta', JSON.stringify(novoEstado));
  };

  // Se não estiver autenticado, renderizar apenas o conteúdo
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Não renderizar até estar montado (evita hidratação incorreta)
  if (!montado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        aberta={sidebarAberta} 
        aoAlternar={alternarSidebar}
      />
      
      {/* Conteúdo principal */}
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300',
        sidebarAberta ? 'ml-64' : 'ml-16'
      )}>
        {/* Header */}
        <Header 
          titulo={titulo}
          subtitulo={subtitulo}
          aoAlternarSidebar={alternarSidebar}
        />
        
        {/* Área de conteúdo */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Componente de layout para páginas de autenticação
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-xl mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SmartPark</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestão de Vagas</p>
        </div>
        
        {/* Conteúdo */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente de layout para páginas de erro
 */
export function ErrorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        {children}
      </div>
    </div>
  );
}