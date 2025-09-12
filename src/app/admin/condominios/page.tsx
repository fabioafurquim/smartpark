'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Layout } from '@/components/Layout';
import { Button, Input, Modal, Table } from '@/components/ui';
import { 
  Plus, 
  Search, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Car,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  telefone?: string;
  email?: string;
  totalVagas: number;
  vagasOcupadas: number;
  totalUsuarios: number;
  ativo: boolean;
  criadoEm: string;
}

export default function AdminCondominiosPage() {
  const { data: session } = useSession();
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalDetalhes, setModalDetalhes] = useState<{
    aberto: boolean;
    condominio?: Condominio;
  }>({ aberto: false });
  const [modalExclusao, setModalExclusao] = useState<{
    aberto: boolean;
    condominio?: Condominio;
  }>({ aberto: false });

  // Buscar condomínios
  const buscarCondominios = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);

      const response = await fetch(`/api/admin/condominios?${params}`);
      if (response.ok) {
        const dados = await response.json();
        setCondominios(dados);
      }
    } catch (error) {
      console.error('Erro ao buscar condomínios:', error);
    } finally {
      setCarregando(false);
    }
  };

  // Excluir condomínio
  const excluirCondominio = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/condominios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await buscarCondominios();
        setModalExclusao({ aberto: false });
      } else {
        const erro = await response.json();
        alert(erro.erro || 'Erro ao excluir condomínio');
      }
    } catch (error) {
      console.error('Erro ao excluir condomínio:', error);
      alert('Erro ao excluir condomínio');
    }
  };

  // Efeitos
  useEffect(() => {
    buscarCondominios();
  }, [busca]);

  // Colunas da tabela
  const colunas = [
    {
      chave: 'nome' as keyof Condominio,
      titulo: 'Nome',
      renderizar: (condominio: Condominio) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {condominio.nome}
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {condominio.endereco}
            </div>
          </div>
        </div>
      ),
    },
    {
      chave: 'contato' as keyof Condominio,
      titulo: 'Contato',
      renderizar: (condominio: Condominio) => (
        <div className="text-sm">
          {condominio.telefone && (
            <div className="flex items-center text-gray-600">
              <Phone className="h-3 w-3 mr-1" />
              {condominio.telefone}
            </div>
          )}
          {condominio.email && (
            <div className="flex items-center text-gray-600 mt-1">
              <Mail className="h-3 w-3 mr-1" />
              {condominio.email}
            </div>
          )}
        </div>
      ),
    },
    {
      chave: 'estatisticas' as keyof Condominio,
      titulo: 'Estatísticas',
      renderizar: (condominio: Condominio) => (
        <div className="text-sm">
          <div className="flex items-center text-gray-600">
            <Users className="h-3 w-3 mr-1" />
            {condominio.totalUsuarios} usuários
          </div>
          <div className="flex items-center text-gray-600 mt-1">
            <Car className="h-3 w-3 mr-1" />
            {condominio.vagasOcupadas}/{condominio.totalVagas} vagas
          </div>
        </div>
      ),
    },
    {
      chave: 'ativo' as keyof Condominio,
      titulo: 'Status',
      renderizar: (condominio: Condominio) => (
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            condominio.ativo
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          )}
        >
          {condominio.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      chave: 'acoes' as keyof Condominio,
      titulo: 'Ações',
      renderizar: (condominio: Condominio) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModalDetalhes({ aberto: true, condominio })}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Implementar edição
              alert('Funcionalidade de edição será implementada');
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModalExclusao({ aberto: true, condominio })}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Administração de Condomínios
            </h1>
            <p className="text-gray-600">
              Gerencie todos os condomínios do sistema
            </p>
          </div>
          <Button
            onClick={() => {
              // TODO: Implementar criação
              alert('Funcionalidade de criação será implementada');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Condomínio
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar por nome ou endereço..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow">
          <Table
            dados={condominios}
            colunas={colunas}
            carregando={carregando}
            mensagemVazia="Nenhum condomínio encontrado"
          />
        </div>
      </div>

      {/* Modal de Detalhes */}
      <Modal
        aberto={modalDetalhes.aberto}
        aoFechar={() => setModalDetalhes({ aberto: false })}
        titulo="Detalhes do Condomínio"
        tamanho="lg"
      >
        {modalDetalhes.condominio && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {modalDetalhes.condominio.nome}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <p className="mt-1">
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      modalDetalhes.condominio.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    )}
                  >
                    {modalDetalhes.condominio.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Endereço
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {modalDetalhes.condominio.endereco}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Telefone
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {modalDetalhes.condominio.telefone || 'Não informado'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {modalDetalhes.condominio.email || 'Não informado'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total de Vagas
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {modalDetalhes.condominio.totalVagas}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vagas Ocupadas
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {modalDetalhes.condominio.vagasOcupadas}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total de Usuários
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {modalDetalhes.condominio.totalUsuarios}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Criado em
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(modalDetalhes.condominio.criadoEm).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        aberto={modalExclusao.aberto}
        aoFechar={() => setModalExclusao({ aberto: false })}
        titulo="Confirmar Exclusão"
        rodape={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setModalExclusao({ aberto: false })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (modalExclusao.condominio) {
                  excluirCondominio(modalExclusao.condominio.id);
                }
              }}
            >
              Excluir
            </Button>
          </div>
        }
      >
        {modalExclusao.condominio && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir o condomínio{' '}
              <strong>{modalExclusao.condominio.nome}</strong>?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todos os
                dados relacionados ao condomínio serão permanentemente removidos.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}