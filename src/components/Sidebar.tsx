'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Home,
  Building2,
  Users,
  UserCheck,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Calendar,
  MapPin,
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { temPermissao, ehAdministradorMestre } from '@/lib/auth';
import { UsuarioSessao } from '@/types';

interface SidebarProps {
  aberta: boolean;
  aoAlternar: () => void;
}

interface ItemMenu {
  id: string;
  rotulo: string;
  icone: React.ComponentType<{ className?: string }>;
  href?: string;
  permissaoNecessaria?: string;
  subItens?: ItemMenu[];
  apenasAdminMestre?: boolean;
  apenasParaSindico?: boolean;
}

/**
 * Componente Sidebar - Menu lateral da aplicação
 */
export function Sidebar({ aberta, aoAlternar }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [itensExpandidos, setItensExpandidos] = useState<string[]>(['dashboard']);

  const usuario = session?.user as UsuarioSessao;

  // Função para verificar se é síndico
  const ehSindico = (): boolean => {
    if (!usuario) return false;
    return usuario.perfis.some(perfil => perfil.tipo === 'sindico');
  };

  // Definição dos itens do menu
  const itensMenu: ItemMenu[] = [
    {
      id: 'dashboard',
      rotulo: 'Dashboard',
      icone: Home,
      href: '/dashboard',
    },
    {
      id: 'administracao',
      rotulo: 'Administração',
      icone: Settings,
      apenasAdminMestre: true,
      subItens: [
        {
          id: 'admin-usuarios',
          rotulo: 'Usuários',
          icone: Users,
          href: '/dashboard/usuarios',
        },
        {
          id: 'admin-condominios',
          rotulo: 'Condomínios',
          icone: Building2,
          href: '/dashboard/condominios',
        },
        {
          id: 'admin-reservas',
          rotulo: 'Reservas Globais',
          icone: Calendar,
          href: '/reservas-admin',
        }
      ]
    },
    {
      id: 'condominios',
      rotulo: 'Condomínios',
      icone: Building2,
      apenasAdminMestre: true,
      subItens: [
        {
          id: 'condominios-lista',
          rotulo: 'Listar Condomínios',
          icone: Building2,
          href: '/dashboard/condominios',
        },
        {
          id: 'condominios-novo',
          rotulo: 'Novo Condomínio',
          icone: Building2,
          href: '/dashboard/condominios/novo',
        },
      ],
    },
    {
      id: 'estrutura',
      rotulo: 'Estrutura',
      icone: Building2,
      permissaoNecessaria: 'gerenciarEstrutura',
      subItens: [
        {
          id: 'torres',
          rotulo: 'Torres',
          icone: Building2,
          href: '/dashboard/estrutura/torres',
        },
        {
          id: 'unidades',
          rotulo: 'Unidades',
          icone: Building2,
          href: '/dashboard/estrutura/unidades',
        },
        {
          id: 'vagas',
          rotulo: 'Vagas',
          icone: MapPin,
          href: '/dashboard/estrutura/vagas',
        },
      ],
    },
    {
      id: 'locacao',
      rotulo: 'Locação',
      icone: MapPin,
      permissaoNecessaria: 'gerenciarReservas',
      href: '/locacao',
    },
    {
      id: 'minhas-locacoes',
      rotulo: 'Minhas Locações',
      icone: Calendar,
      permissaoNecessaria: 'gerenciarReservas',
      href: '/minhas-locacoes',
    },
    {
      id: 'minhas-vagas',
      rotulo: 'Minhas Vagas',
      icone: Car,
      permissaoNecessaria: 'gerenciarReservas',
      href: '/minhas-vagas',
    },
    {
      id: 'reservas',
      rotulo: 'Reservas',
      icone: Calendar,
      permissaoNecessaria: 'gerenciarReservas',
      subItens: [
        {
          id: 'reservas-vaga',
          rotulo: 'Minhas Reservas',
          icone: Calendar,
          href: '/reservas-vaga',
        },
        {
          id: 'reservas-sindico',
          rotulo: 'Reservas do Condomínio',
          icone: Calendar,
          href: '/reservas-sindico',
          apenasParaSindico: true,
        },
      ]
    },
    {
      id: 'solicitacoes',
      rotulo: 'Solicitações',
      icone: UserCheck,
      permissaoNecessaria: 'aprovarSolicitacoes',
      href: '/solicitacoes',
    },
    {
      id: 'perfil',
      rotulo: 'Meu Perfil',
      icone: Users,
      href: '/dashboard/perfil',
    },
    {
      id: 'configuracoes',
      rotulo: 'Configurações',
      icone: Settings,
      href: '/configuracoes',
    },
  ];

  // Função para verificar se o usuário pode ver o item
  const podeVerItem = (item: ItemMenu): boolean => {
    if (!usuario) return false;

    // Verificar se é apenas para admin mestre
    if (item.apenasAdminMestre && !ehAdministradorMestre(usuario)) {
      return false;
    }

    // Verificar se é apenas para síndico
    if (item.apenasParaSindico && !ehSindico()) {
      return false;
    }

    // Verificar permissão específica
    if (item.permissaoNecessaria && !temPermissao(usuario, item.permissaoNecessaria)) {
      return false;
    }

    return true;
  };

  // Função para alternar expansão de item
  const alternarExpansao = (itemId: string) => {
    setItensExpandidos(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Função para verificar se o item está ativo
  const estaAtivo = (href?: string): boolean => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Renderizar item do menu
  const renderizarItem = (item: ItemMenu, nivel = 0) => {
    if (!podeVerItem(item)) return null;

    const temSubItens = item.subItens && item.subItens.length > 0;
    const estaExpandido = itensExpandidos.includes(item.id);
    const ativo = estaAtivo(item.href);

    return (
      <div key={item.id}>
        {/* Item principal */}
        {item.href ? (
          <Link
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              'hover:bg-primary-50 hover:text-primary-700',
              nivel > 0 && 'ml-4',
              ativo && 'bg-primary-100 text-primary-700 border-r-2 border-primary-600',
              !ativo && 'text-gray-700'
            )}
          >
            <item.icone className={cn('w-5 h-5', aberta ? 'mr-3' : 'mx-auto')} />
            {aberta && (
              <span className="truncate">{item.rotulo}</span>
            )}
          </Link>
        ) : (
          <button
            onClick={() => alternarExpansao(item.id)}
            className={cn(
              'w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              'hover:bg-primary-50 hover:text-primary-700 text-gray-700',
              nivel > 0 && 'ml-4'
            )}
          >
            <item.icone className={cn('w-5 h-5', aberta ? 'mr-3' : 'mx-auto')} />
            {aberta && (
              <>
                <span className="flex-1 text-left truncate">{item.rotulo}</span>
                {temSubItens && (
                  estaExpandido ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                )}
              </>
            )}
          </button>
        )}

        {/* Subitens */}
        {temSubItens && aberta && estaExpandido && (
          <div className="mt-1 space-y-1">
            {item.subItens!.map(subItem => renderizarItem(subItem, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Overlay para mobile */}
      {aberta && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={aoAlternar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300',
        aberta ? 'w-64' : 'w-16',
        'lg:relative lg:translate-x-0',
        !aberta && '-translate-x-full lg:translate-x-0'
      )}>
        {/* Header da sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {aberta && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">SmartPark</h2>
                <p className="text-xs text-gray-500">Gestão de Vagas</p>
              </div>
            </div>
          )}
          
          <button
            onClick={aoAlternar}
            className="p-1 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            {aberta ? (
              <X className="w-5 h-5 text-gray-500" />
            ) : (
              <Menu className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-2 overflow-y-auto h-full pb-20">
          {itensMenu.map(item => renderizarItem(item))}
        </nav>

        {/* Informações do usuário */}
        {aberta && usuario && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {usuario?.nome || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {usuario?.email || 'email@exemplo.com'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}