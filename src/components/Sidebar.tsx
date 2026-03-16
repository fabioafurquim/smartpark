'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Building2,
  Calendar,
  Car,
  ChevronDown,
  ChevronRight,
  Home,
  MapPin,
  Menu,
  Settings,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ehAdministradorLocal,
  ehAdministradorMestre,
  ehPorteiro,
  temPermissao,
} from '@/lib/auth';
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
  apenasParaPerfisOperacionais?: boolean;
}

export function Sidebar({ aberta, aoAlternar }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [itensExpandidos, setItensExpandidos] = useState<string[]>([
    'dashboard',
    'administracao',
    'estrutura',
  ]);

  const usuario = session?.user as UsuarioSessao;

  const temPerfilOperacional = () => {
    if (!usuario) {
      return false;
    }

    return usuario.perfis.some((perfil) =>
      ['administrador_condominio', 'sindico', 'porteiro'].includes(perfil.tipo)
    );
  };

  const obterRotuloMonitoramento = () => {
    if (!usuario) {
      return 'Monitoramento';
    }

    const condominioIds = Array.from(new Set(usuario.perfis.map((perfil) => perfil.condominioId)));

    if (condominioIds.some((condominioId) => ehAdministradorLocal(usuario, condominioId))) {
      return 'Monitoramento de Locações';
    }

    if (condominioIds.some((condominioId) => ehPorteiro(usuario, condominioId))) {
      return 'Monitoramento de Veículos';
    }

    return 'Monitoramento';
  };

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
          id: 'admin-locacoes',
          rotulo: 'Monitoramento Global',
          icone: Calendar,
          href: '/reservas-admin',
        },
      ],
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
      id: 'locacoes-condominio',
      rotulo: obterRotuloMonitoramento(),
      icone: Calendar,
      permissaoNecessaria: 'monitorarLocacoes',
      href: '/reservas-sindico',
      apenasParaPerfisOperacionais: true,
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
  ];

  const podeVerItem = (item: ItemMenu) => {
    if (!usuario) {
      return false;
    }

    if (item.apenasAdminMestre && !ehAdministradorMestre(usuario)) {
      return false;
    }

    if (item.apenasParaPerfisOperacionais && !temPerfilOperacional()) {
      return false;
    }

    if (item.permissaoNecessaria && !temPermissao(usuario, item.permissaoNecessaria)) {
      return false;
    }

    return true;
  };

  const alternarExpansao = (itemId: string) => {
    setItensExpandidos((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const estaAtivo = (href?: string) => {
    if (!href) {
      return false;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderizarItem = (item: ItemMenu, nivel = 0) => {
    if (!podeVerItem(item)) {
      return null;
    }

    const temSubItens = !!item.subItens?.length;
    const estaExpandido = itensExpandidos.includes(item.id);
    const ativo = estaAtivo(item.href);

    return (
      <div key={item.id}>
        {item.href ? (
          <Link
            href={item.href}
            className={cn(
              'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'hover:bg-primary-50 hover:text-primary-700',
              nivel > 0 && 'ml-4',
              ativo && 'border-r-2 border-primary-600 bg-primary-100 text-primary-700',
              !ativo && 'text-gray-700'
            )}
          >
            <item.icone className={cn('h-5 w-5', aberta ? 'mr-3' : 'mx-auto')} />
            {aberta && <span className="truncate">{item.rotulo}</span>}
          </Link>
        ) : (
          <button
            onClick={() => alternarExpansao(item.id)}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors',
              'hover:bg-primary-50 hover:text-primary-700',
              nivel > 0 && 'ml-4'
            )}
          >
            <item.icone className={cn('h-5 w-5', aberta ? 'mr-3' : 'mx-auto')} />
            {aberta && (
              <>
                <span className="flex-1 truncate text-left">{item.rotulo}</span>
                {temSubItens &&
                  (estaExpandido ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  ))}
              </>
            )}
          </button>
        )}

        {temSubItens && aberta && estaExpandido && (
          <div className="mt-1 space-y-1">
            {item.subItens!.map((subItem) => renderizarItem(subItem, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {aberta && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={aoAlternar}
        />
      )}

      <div
        className={cn(
          'fixed left-0 top-0 z-50 h-full border-r border-gray-200 bg-white transition-all duration-300',
          aberta ? 'w-64' : 'w-16',
          'lg:relative lg:translate-x-0',
          !aberta && '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          {aberta && (
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">SmartPark</h2>
                <p className="text-xs text-gray-500">Gestão de vagas</p>
              </div>
            </div>
          )}

          <button onClick={aoAlternar} className="rounded-lg p-1 hover:bg-gray-100 lg:hidden">
            {aberta ? (
              <X className="h-5 w-5 text-gray-500" />
            ) : (
              <Menu className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>

        <nav className="h-full space-y-2 overflow-y-auto p-4 pb-20">
          {itensMenu.map((item) => renderizarItem(item))}
        </nav>

        {aberta && usuario && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                <span className="text-sm font-medium text-primary-700">
                  {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {usuario?.nome || 'Usuario'}
                </p>
                <p className="truncate text-xs text-gray-500">
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
