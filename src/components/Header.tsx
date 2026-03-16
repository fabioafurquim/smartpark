'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UsuarioSessao } from '@/types';

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
  locacaoId?: string;
}

interface HeaderProps {
  titulo?: string;
  subtitulo?: string;
  aoAlternarSidebar: () => void;
}

export function Header({ titulo, subtitulo, aoAlternarSidebar }: HeaderProps) {
  const { data: session, status } = useSession();
  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);

  const usuario = session?.user as UsuarioSessao;

  useEffect(() => {
    const carregarNotificacoes = async () => {
      try {
        const response = await fetch('/api/notificacoes?limite=5');
        if (response.ok) {
          const dados = await response.json();
          setNotificacoes(dados.notificacoes || []);
          setNaoLidas(dados.naoLidas || 0);
        }
      } catch (error) {
        console.error('Erro ao carregar notificações:', error);
      }
    };

    if (status === 'authenticated') {
      void carregarNotificacoes();
      const interval = setInterval(carregarNotificacoes, 30000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const handleAbrirNotificacoes = async () => {
    const vaiAbrir = !notificacoesAbertas;
    setNotificacoesAbertas(vaiAbrir);
    setMenuUsuarioAberto(false);

    if (vaiAbrir && naoLidas > 0) {
      try {
        await fetch('/api/notificacoes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marcarTodas: true }),
        });
        setNaoLidas(0);
        setNotificacoes((prev) => prev.map((notificacao) => ({ ...notificacao, lida: true })));
      } catch (error) {
        console.error('Erro ao marcar notificações:', error);
      }
    }
  };

  const formatarTempoRelativo = (data: string) => {
    const agora = new Date();
    const dataNotif = new Date(data);
    const diffMs = agora.getTime() - dataNotif.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHoras < 24) return `Há ${diffHoras}h`;
    if (diffDias < 7) return `Há ${diffDias}d`;
    return dataNotif.toLocaleDateString('pt-BR');
  };

  const getIconeNotificacao = (tipo: string) => {
    switch (tipo) {
      case 'LOCACAO_SOLICITADA':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'LOCACAO_APROVADA':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'LOCACAO_REJEITADA':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'LOCACAO_CANCELADA':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Bell className="h-4 w-4 text-blue-600" />;
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            onClick={aoAlternarSidebar}
            className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </button>

          {(titulo || subtitulo) && (
            <div className="min-w-0">
              {titulo && (
                <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
                  {titulo}
                </h1>
              )}
              {subtitulo && (
                <p className="mt-0.5 hidden text-sm text-slate-600 sm:block">{subtitulo}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              onClick={handleAbrirNotificacoes}
              className="relative rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Bell className="h-5 w-5 text-slate-700" />
              {naoLidas > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              )}
            </button>

            {notificacoesAbertas && (
              <div className="absolute right-0 top-14 z-50 w-[min(92vw,24rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">Notificações</h3>
                  {notificacoes.length > 0 && (
                    <span className="text-xs text-slate-500">{notificacoes.length} recentes</span>
                  )}
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {notificacoes.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-sm text-slate-500">Nenhuma notificação</p>
                    </div>
                  ) : (
                    notificacoes.map((notificacao) => (
                      <div
                        key={notificacao.id}
                        className={cn(
                          'border-b border-slate-100 px-4 py-3',
                          !notificacao.lida && 'bg-blue-50/70'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getIconeNotificacao(notificacao.tipo)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{notificacao.titulo}</p>
                            <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                              {notificacao.mensagem}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {formatarTempoRelativo(notificacao.criadoEm)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notificacoes.length > 0 && (
                  <div className="border-t border-slate-100 p-3">
                    <Link
                      href="/minhas-locacoes"
                      onClick={() => setNotificacoesAbertas(false)}
                      className="block rounded-2xl bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      Ver minhas locações
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {usuario && (
            <div className="relative">
              <button
                onClick={() => {
                  setMenuUsuarioAberto((prev) => !prev);
                  setNotificacoesAbertas(false);
                }}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-colors hover:bg-slate-50 sm:px-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
                  <span className="text-sm font-medium text-primary-700">
                    {usuario.nome?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>

                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium text-slate-900">{usuario.nome || 'Usuario'}</p>
                  <p className="text-xs capitalize text-slate-500">
                    {usuario.perfis?.[0]?.tipo?.replace('_', ' ') || 'Usuario'}
                  </p>
                </div>

                <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
              </button>

              {menuUsuarioAberto && (
                <div className="absolute right-0 top-14 z-50 w-60 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200">
                  <Link
                    href="/dashboard/perfil"
                    onClick={() => setMenuUsuarioAberto(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <User className="h-4 w-4" />
                    <span>Meu perfil</span>
                  </Link>

                  <Link
                    href="/dashboard/perfil"
                    onClick={() => setMenuUsuarioAberto(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Conta e senha</span>
                  </Link>

                  <div className="my-2 border-t border-slate-100" />

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {(menuUsuarioAberto || notificacoesAbertas) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setMenuUsuarioAberto(false);
            setNotificacoesAbertas(false);
          }}
        />
      )}
    </header>
  );
}
