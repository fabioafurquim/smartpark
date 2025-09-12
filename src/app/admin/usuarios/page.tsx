'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import { Layout } from '@/components';
import { Button, Input, Modal, Table, Select } from '@/components/ui';
import type { Usuario, PerfilUsuario, TipoPerfilUsuario } from '@/types';

interface UsuarioCompleto extends Usuario {
  perfis: (PerfilUsuario & {
    condominio?: {
      id: string;
      nome: string;
    };
  })[];
}

/**
 * Página de administração de usuários (apenas para administrador mestre)
 */
export default function AdminUsuariosPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioCompleto | null>(null);
  const [filtros, setFiltros] = useState({
    busca: '',
    tipo: '',
    ativo: ''
  });

  useEffect(() => {
    carregarUsuarios();
  }, [filtros]);

  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (filtros.busca) params.append('busca', filtros.busca);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.ativo) params.append('ativo', filtros.ativo);

      const response = await fetch(`/api/admin/usuarios?${params}`);
      if (response.ok) {
        const dados = await response.json();
        setUsuarios(dados);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setCarregando(false);
    }
  };

  const alternarStatusUsuario = async (usuarioId: string, ativo: boolean) => {
    try {
      const response = await fetch(`/api/admin/usuarios/${usuarioId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ativo }),
      });

      if (response.ok) {
        await carregarUsuarios();
      }
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
    }
  };

  const excluirUsuario = async (usuarioId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/usuarios/${usuarioId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await carregarUsuarios();
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
    }
  };

  const colunas = [
    {
      chave: 'nome',
      titulo: 'Nome',
      renderizar: (usuario: UsuarioCompleto) => (
        <div>
          <div className="font-medium text-gray-900">{usuario.nome}</div>
          <div className="text-sm text-gray-500">{usuario.email}</div>
        </div>
      ),
    },
    {
      chave: 'perfis',
      titulo: 'Perfis',
      renderizar: (usuario: UsuarioCompleto) => (
        <div className="space-y-1">
          {usuario.perfis.map((perfil, index) => (
            <div key={index} className="text-sm">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {perfil.tipo}
              </span>
              {perfil.condominio && (
                <span className="ml-2 text-gray-500">
                  {perfil.condominio.nome}
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      chave: 'ativo',
      titulo: 'Status',
      renderizar: (usuario: UsuarioCompleto) => {
        const ativo = usuario.perfis.some(p => p.ativo);
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            ativo 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {ativo ? 'Ativo' : 'Inativo'}
          </span>
        );
      },
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      renderizar: (usuario: UsuarioCompleto) => {
        const ativo = usuario.perfis.some(p => p.ativo);
        return (
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setUsuarioSelecionado(usuario);
                setModalAberto(true);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => alternarStatusUsuario(usuario.id, !ativo)}
            >
              {ativo ? (
                <UserX className="w-4 h-4 text-red-600" />
              ) : (
                <UserCheck className="w-4 h-4 text-green-600" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => excluirUsuario(usuario.id)}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        );
      },
    },
  ];

  const tiposUsuario = [
    { valor: '', label: 'Todos os tipos' },
    { valor: 'ADMINISTRADOR_MESTRE', label: 'Administrador Mestre' },
    { valor: 'ADMINISTRADOR_CONDOMINIO', label: 'Administrador Condomínio' },
    { valor: 'SINDICO', label: 'Síndico' },
    { valor: 'MORADOR', label: 'Morador' },
  ];

  const statusOptions = [
    { valor: '', label: 'Todos os status' },
    { valor: 'true', label: 'Ativo' },
    { valor: 'false', label: 'Inativo' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Administração de Usuários
            </h1>
            <p className="text-gray-600">
              Gerencie todos os usuários do sistema SmartPark
            </p>
          </div>
          
          <Button onClick={() => setModalAberto(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Buscar usuários"
              placeholder="Nome ou email..."
              value={filtros.busca}
              onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              icon={Search}
            />
            
            <Select
              label="Tipo de usuário"
              value={filtros.tipo}
              onChange={(valor) => setFiltros(prev => ({ ...prev, tipo: valor }))}
              opcoes={tiposUsuario}
            />
            
            <Select
              label="Status"
              value={filtros.ativo}
              onChange={(valor) => setFiltros(prev => ({ ...prev, ativo: valor }))}
              opcoes={statusOptions}
            />
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Table
            colunas={colunas}
            dados={usuarios}
            carregando={carregando}
            mensagemVazia="Nenhum usuário encontrado"
          />
        </div>

        {/* Modal de Detalhes */}
        <Modal
          aberto={modalAberto}
          onFechar={() => {
            setModalAberto(false);
            setUsuarioSelecionado(null);
          }}
          titulo={usuarioSelecionado ? 'Detalhes do Usuário' : 'Novo Usuário'}
          tamanho="lg"
        >
          {usuarioSelecionado ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {usuarioSelecionado.nome}
                </h3>
                <p className="text-gray-600">{usuarioSelecionado.email}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Perfis:</h4>
                <div className="space-y-2">
                  {usuarioSelecionado.perfis.map((perfil, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{perfil.tipo}</span>
                        {perfil.condominio && (
                          <span className="text-gray-500 ml-2">
                            - {perfil.condominio.nome}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        perfil.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {perfil.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Funcionalidade de criação de usuário será implementada</p>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}