'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { 
  Menu,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UsuarioSessao } from '@/types';

interface HeaderProps {
  titulo?: string;
  subtitulo?: string;
  aoAlternarSidebar: () => void;
}

/**
 * Componente Header - Cabeçalho da aplicação
 */
export function Header({ titulo, subtitulo, aoAlternarSidebar }: HeaderProps) {
  const { data: session } = useSession();
  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);

  const usuario = session?.user as UsuarioSessao;

  // Função para fazer logout
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
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
              onClick={() => setNotificacoesAbertas(!notificacoesAbertas)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {/* Badge de notificações */}
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            {/* Dropdown de notificações */}
            {notificacoesAbertas && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notificações</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {/* Exemplo de notificações */}
                  <div className="p-4 hover:bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      Nova solicitação de cadastro
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      João Silva solicitou cadastro no Condomínio ABC
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Há 2 minutos</p>
                  </div>
                  <div className="p-4 hover:bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      Usuário aprovado
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Maria Santos foi aprovada como moradora
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Há 1 hora</p>
                  </div>
                  <div className="p-4 hover:bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">
                      Sistema atualizado
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Nova versão do sistema foi instalada
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Há 3 horas</p>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200">
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    Ver todas as notificações
                  </button>
                </div>
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