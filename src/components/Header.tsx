'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { 
  Menu,
  Bell, 
  User, 
  Settings,
  LogOut, 
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock
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

/**
 * Componente Header - Cabeçalho da aplicação
 */
export function Header({ titulo, subtitulo, aoAlternarSidebar }: HeaderProps) {
  const { data: session, status } = useSession();
  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);

  const usuario = session?.user as UsuarioSessao;

  // Carregar notificações
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
      carregarNotificacoes();
      // Atualizar a cada 30 segundos
      const interval = setInterval(carregarNotificacoes, 30000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Marcar notificações como lidas ao abrir
  const handleAbrirNotificacoes = async () => {
    setNotificacoesAbertas(!notificacoesAbertas);
    
    if (!notificacoesAbertas && naoLidas > 0) {
      try {
        await fetch('/api/notificacoes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marcarTodas: true })
        });
        setNaoLidas(0);
        // Atualizar lista marcando como lidas
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      } catch (error) {
        console.error('Erro ao marcar notificações:', error);
      }
    }
  };

  // Formatar tempo relativo
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

  // Obter ícone da notificação
  const getIconeNotificacao = (tipo: string) => {
    switch (tipo) {
      case 'LOCACAO_SOLICITADA': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'LOCACAO_APROVADA': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'LOCACAO_REJEITADA': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'LOCACAO_CANCELADA': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  // Função para fazer logout
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Lado esquerdo - Botão menu e título */}
        <div className="flex items-center space-x-4">
          {/* Botão para alternar sidebar */}
          <button
            onClick={aoAlternarSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Título e subtítulo */}
          {titulo && (
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {titulo}
              </h1>
              {subtitulo && (
                <p className="text-sm text-gray-600 mt-1">
                  {subtitulo}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Lado direito - Notificações e menu do usuário */}
        <div className="flex items-center space-x-4">
          {/* Notificações */}
          <div className="relative">
            <button
              onClick={handleAbrirNotificacoes}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {/* Badge de notificações não lidas */}
              {naoLidas > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              )}
            </button>

            {/* Dropdown de notificações */}
            {notificacoesAbertas && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notificações</h3>
                  {notificacoes.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {notificacoes.length} recentes
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificacoes.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nenhuma notificação</p>
                    </div>
                  ) : (
                    notificacoes.map((notificacao) => (
                      <div 
                        key={notificacao.id} 
                        className={cn(
                          "p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer",
                          !notificacao.lida && "bg-blue-50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getIconeNotificacao(notificacao.tipo)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notificacao.titulo}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {notificacao.mensagem}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatarTempoRelativo(notificacao.criadoEm)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notificacoes.length > 0 && (
                  <div className="p-3 border-t border-gray-200">
                    <a 
                      href="/minhas-locacoes" 
                      className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Ver minhas locações
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu do usuário */}
          {usuario && (
            <div className="relative">
              <button
                onClick={() => setMenuUsuarioAberto(!menuUsuarioAberto)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* Avatar */}
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-700">
                    {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                
                {/* Nome e perfil */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {usuario?.nome || 'Usuário'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {usuario?.perfis?.[0]?.tipo?.replace('_', ' ') || 'Usuário'}
                  </p>
                </div>
                
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>

              {/* Dropdown do usuário */}
              {menuUsuarioAberto && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-2">
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                      <span>Meu Perfil</span>
                    </button>
                    
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                      <span>Configurações</span>
                    </button>
                    
                    <hr className="my-2 border-gray-200" />
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overlay para fechar dropdowns */}
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