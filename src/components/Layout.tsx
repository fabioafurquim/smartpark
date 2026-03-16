'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  titulo?: string;
  subtitulo?: string;
}

export function Layout({ children, titulo, subtitulo }: LayoutProps) {
  const { status } = useSession();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const estadoSalvo = localStorage.getItem('sidebarAberta');

    if (estadoSalvo !== null) {
      setSidebarAberta(JSON.parse(estadoSalvo));
    } else if (window.innerWidth >= 1024) {
      setSidebarAberta(true);
    }

    setMontado(true);
  }, []);

  const alternarSidebar = () => {
    const novoEstado = !sidebarAberta;
    setSidebarAberta(novoEstado);
    localStorage.setItem('sidebarAberta', JSON.stringify(novoEstado));
  };

  if (status === 'unauthenticated') {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  if (status === 'loading' || !montado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-14 w-14 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] lg:flex">
      <Sidebar aberta={sidebarAberta} aoAlternar={alternarSidebar} />

      <div
        className={cn(
          'flex min-h-screen flex-1 flex-col transition-all duration-300',
          sidebarAberta ? 'lg:ml-64' : 'lg:ml-16'
        )}
      >
        <Header titulo={titulo} subtitulo={subtitulo} aoAlternarSidebar={alternarSidebar} />

        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pb-10 sm:pt-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_100%)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-200">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SmartPark</h1>
          <p className="mt-2 text-slate-600">Sistema de gestão de vagas</p>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200 backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ErrorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center">{children}</div>
    </div>
  );
}
