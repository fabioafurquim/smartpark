'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button, Input, Modal, ModalFooter, Table } from '@/components/ui';
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
import { getModalidadeCondominioLabel, MODALIDADES_CONDOMINIO } from '@/lib/condominio-modalidade';
import { criarCondominioSchema, type CriarCondominioData } from '@/lib/validations/condominio';
import { z } from 'zod';
import { useToast } from '@/components/providers/ToastProvider';

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  telefone?: string;
  email?: string;
  modalidade: 'EMPRESTIMO' | 'LOCACAO' | 'HIBRIDO';
  totalVagas: number;
  vagasOcupadas: number;
  totalUsuarios: number;
  ativo: boolean;
  criadoEm: string;
}

export default function AdminCondominiosPage() {
  const { showToast } = useToast();
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
  const [modalCriacao, setModalCriacao] = useState(false);
  const [modalEdicao, setModalEdicao] = useState<{
    aberto: boolean;
    condominio?: Condominio;
  }>({ aberto: false });
  const [formData, setFormData] = useState<CriarCondominioData>({
    nome: '',
    endereco: '',
    telefone: '',
    email: '',
    logoUrl: '',
    modalidade: 'EMPRESTIMO'
  });
  const [salvando, setSalvando] = useState(false);
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});

  // Buscar condomínios
  const buscarCondominios = useCallback(async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);

      const response = await fetch(`/api/admin/condominios?${params}`);
      if (response.ok) {
        const dados = await response.json();
        const lista = Array.isArray(dados) ? dados : dados.condominios;
        setCondominios(Array.isArray(lista) ? lista : []);
      }
    } catch (error) {
      console.error('Erro ao buscar condomínios:', error);
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  // Criar condomínio
  const criarCondominio = async () => {
    try {
      setSalvando(true);
      setErrosValidacao({});

      // Validar dados no frontend
      const dadosValidados = criarCondominioSchema.parse(formData);
      
      const response = await fetch('/api/admin/condominios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosValidados),
      });

      if (response.ok) {
        await buscarCondominios();
        setModalCriacao(false);
        setFormData({
          nome: '',
          endereco: '',
          telefone: '',
          email: '',
          logoUrl: '',
          modalidade: 'EMPRESTIMO'
        });
        setErrosValidacao({});
        showToast({
          title: 'Condominio criado',
          description: 'O condominio foi cadastrado com sucesso.',
          variant: 'success',
        });
      } else {
        const erro = await response.json();
        const detalhes = erro.detalhes ?? erro.details;
        if (Array.isArray(detalhes)) {
          const novosErros: Record<string, string> = {};
          detalhes.forEach((d: any) => {
            if (d.campo && d.mensagem) {
              novosErros[d.campo] = d.mensagem;
            } else if (d.path?.length) {
              novosErros[d.path[0]] = d.message ?? d.mensagem ?? '';
            }
          });
          setErrosValidacao(novosErros);
        } else {
          showToast({
            title: 'Falha ao criar condominio',
            description: erro.error || erro.erro || 'Erro ao criar condominio',
            variant: 'error',
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Erros de validação do Zod
        const novosErros: Record<string, string> = {};
        error.issues.forEach((erro) => {
          const caminho = erro.path && erro.path.length > 0 ? erro.path[0] : undefined;
          if (caminho !== undefined) {
            const chave = typeof caminho === 'string' ? caminho : String(caminho);
            novosErros[chave] = erro.message;
          }
        });
        setErrosValidacao(novosErros);
      } else {
        console.error('Erro ao criar condomínio:', error);
        showToast({
          title: 'Falha ao criar condominio',
          description: 'Erro ao criar condominio',
          variant: 'error',
        });
      }
    } finally {
      setSalvando(false);
    }
  };

  // Editar condomínio
  const editarCondominio = async () => {
    try {
      setSalvando(true);
      setErrosValidacao({});

      if (!modalEdicao.condominio) return;

      // Validar dados no frontend
      const dadosValidados = criarCondominioSchema.parse(formData);
      
      const response = await fetch(`/api/admin/condominios/${modalEdicao.condominio.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosValidados),
      });

      if (response.ok) {
        await buscarCondominios();
        setModalEdicao({ aberto: false });
        setFormData({
          nome: '',
          endereco: '',
          telefone: '',
          email: '',
          logoUrl: '',
          modalidade: 'EMPRESTIMO'
        });
        setErrosValidacao({});
        showToast({
          title: 'Condominio atualizado',
          description: 'As informacoes foram atualizadas com sucesso.',
          variant: 'success',
        });
      } else {
        const erro = await response.json();
        const detalhes = erro.detalhes ?? erro.details;
        if (Array.isArray(detalhes)) {
          const novosErros: Record<string, string> = {};
          detalhes.forEach((d: any) => {
            if (d.campo && d.mensagem) {
              novosErros[d.campo] = d.mensagem;
            } else if (d.path?.length) {
              novosErros[d.path[0]] = d.message ?? d.mensagem ?? '';
            }
          });
          setErrosValidacao(novosErros);
        } else {
          showToast({
            title: 'Falha ao atualizar condominio',
            description: erro.error || erro.erro || 'Erro ao atualizar condominio',
            variant: 'error',
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Erros de validação do Zod
        const novosErros: Record<string, string> = {};
        error.issues.forEach((erro) => {
          const caminho = erro.path && erro.path.length > 0 ? erro.path[0] : undefined;
          if (caminho !== undefined) {
            const chave = typeof caminho === 'string' ? caminho : String(caminho);
            novosErros[chave] = erro.message;
          }
        });
        setErrosValidacao(novosErros);
      } else {
        console.error('Erro ao atualizar condomínio:', error);
        showToast({
          title: 'Falha ao atualizar condominio',
          description: 'Erro ao atualizar condominio',
          variant: 'error',
        });
      }
    } finally {
      setSalvando(false);
    }
  };

  // Abrir modal de edição
  const abrirModalEdicao = (condominio: Condominio) => {
    setFormData({
      nome: condominio.nome,
      endereco: condominio.endereco,
      telefone: condominio.telefone || '',
      email: condominio.email || '',
      logoUrl: '',
      modalidade: condominio.modalidade
    });
    setErrosValidacao({});
    setModalEdicao({ aberto: true, condominio });
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
        showToast({
          title: 'Falha ao excluir condominio',
          description: erro.error || erro.erro || 'Erro ao excluir condominio',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Erro ao excluir condomínio:', error);
      showToast({
        title: 'Falha ao excluir condominio',
        description: 'Erro ao excluir condominio',
        variant: 'error',
      });
    }
  };

  // Efeitos
  useEffect(() => {
    buscarCondominios();
  }, [buscarCondominios]);

  // Colunas da tabela
  const colunas = [
    {
      chave: 'nome' as keyof Condominio,
      titulo: 'Nome',
      renderizar: (_: unknown, condominio: Condominio) => {
        if (!condominio) return null;
        return (
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
        );
      },
    },
    {
      chave: 'contato' as keyof Condominio,
      titulo: 'Contato',
      renderizar: (_: unknown, condominio: Condominio) => {
        if (!condominio) return null;
        return (
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
            <div className="mt-1 text-xs font-medium text-gray-500">
              {getModalidadeCondominioLabel(condominio.modalidade)}
            </div>
          </div>
        );
      },
    },
    {
      chave: 'estatisticas' as keyof Condominio,
      titulo: 'Estatísticas',
      renderizar: (_: unknown, condominio: Condominio) => {
        if (!condominio) return null;
        return (
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
        );
      },
    },
    {
      chave: 'ativo' as keyof Condominio,
      titulo: 'Status',
      renderizar: (_: unknown, condominio: Condominio) => {
        if (!condominio) return null;
        return (
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
        );
      },
    },
    {
      chave: 'acoes' as keyof Condominio,
      titulo: 'Ações',
      renderizar: (_: unknown, condominio: Condominio) => {
        if (!condominio) return null;
        return (
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
              onClick={() => abrirModalEdicao(condominio)}
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
        );
      },
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Administração de Condomínios
            </h1>
            <p className="text-gray-600">
              Gerencie todos os condomínios do sistema
            </p>
          </div>
          <Button
            onClick={() => setModalCriacao(true)}
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
            colunas={colunas as any}
            dados={condominios as unknown as Record<string, unknown>[]}
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Modalidade
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {getModalidadeCondominioLabel(modalDetalhes.condominio.modalidade)}
              </p>
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
      >
        {modalExclusao.condominio && (
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Tem certeza que deseja excluir o condomínio{' '}
              <strong>{modalExclusao.condominio.nome}</strong>?
            </p>
            <p className="text-sm text-red-600">
              Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.
            </p>
          </div>
        )}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setModalExclusao({ aberto: false })}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (modalExclusao.condominio) {
                excluirCondominio(modalExclusao.condominio.id);
              }
            }}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal de Edição */}
      <Modal
        aberto={modalEdicao.aberto}
        aoFechar={() => setModalEdicao({ aberto: false })}
        titulo="Editar Condomínio"
        tamanho="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Condomínio *
            </label>
            <Input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Residencial Jardim das Flores"
              required
              className={errosValidacao.nome ? 'border-red-500' : ''}
            />
            {errosValidacao.nome && (
              <p className="text-red-500 text-sm mt-1">{errosValidacao.nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endereço Completo *
            </label>
            <Input
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              placeholder="Ex: Rua das Flores, 123, Centro, São Paulo - SP"
              required
              className={errosValidacao.endereco ? 'border-red-500' : ''}
            />
            {errosValidacao.endereco && (
              <p className="text-red-500 text-sm mt-1">{errosValidacao.endereco}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <Input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
                className={errosValidacao.telefone ? 'border-red-500' : ''}
              />
              {errosValidacao.telefone && (
                <p className="text-red-500 text-sm mt-1">{errosValidacao.telefone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@condominio.com.br"
                className={errosValidacao.email ? 'border-red-500' : ''}
              />
              {errosValidacao.email && (
                <p className="text-red-500 text-sm mt-1">{errosValidacao.email}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modalidade do condominio *
            </label>
            <select
              value={formData.modalidade}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  modalidade: e.target.value as CriarCondominioData['modalidade'],
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MODALIDADES_CONDOMINIO.map((modalidade) => (
                <option key={modalidade} value={modalidade}>
                  {getModalidadeCondominioLabel(modalidade)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL do Logo (opcional)
            </label>
            <Input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://exemplo.com/logo.png"
              className={errosValidacao.logoUrl ? 'border-red-500' : ''}
            />
            {errosValidacao.logoUrl && (
              <p className="text-red-500 text-sm mt-1">{errosValidacao.logoUrl}</p>
            )}
          </div>

          <div className="text-sm text-gray-500">
            <p>* Campos obrigatórios</p>
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setModalEdicao({ aberto: false })}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            onClick={editarCondominio}
            disabled={salvando || !formData.nome || !formData.endereco}
          >
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal de Criação */}
      <Modal
        aberto={modalCriacao}
        aoFechar={() => setModalCriacao(false)}
        titulo="Novo Condomínio"
        tamanho="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Condomínio *
            </label>
            <Input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Residencial Jardim das Flores"
              required
              className={errosValidacao.nome ? 'border-red-500' : ''}
            />
            {errosValidacao.nome && (
              <p className="text-red-500 text-sm mt-1">{errosValidacao.nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endereço Completo *
            </label>
            <Input
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              placeholder="Ex: Rua das Flores, 123, Centro, São Paulo - SP"
              required
              className={errosValidacao.endereco ? 'border-red-500' : ''}
            />
            {errosValidacao.endereco && (
              <p className="text-red-500 text-sm mt-1">{errosValidacao.endereco}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <Input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
                className={errosValidacao.telefone ? 'border-red-500' : ''}
              />
              {errosValidacao.telefone && (
                <p className="text-red-500 text-sm mt-1">{errosValidacao.telefone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@condominio.com.br"
                className={errosValidacao.email ? 'border-red-500' : ''}
              />
              {errosValidacao.email && (
                <p className="text-red-500 text-sm mt-1">{errosValidacao.email}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modalidade do condominio *
            </label>
            <select
              value={formData.modalidade}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  modalidade: e.target.value as CriarCondominioData['modalidade'],
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MODALIDADES_CONDOMINIO.map((modalidade) => (
                <option key={modalidade} value={modalidade}>
                  {getModalidadeCondominioLabel(modalidade)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL do Logo (opcional)
            </label>
            <Input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://exemplo.com/logo.png"
              className={errosValidacao.logoUrl ? 'border-red-500' : ''}
            />
            {errosValidacao.logoUrl && (
              <p className="text-red-500 text-sm mt-1">{errosValidacao.logoUrl}</p>
            )}
          </div>

          <div className="text-sm text-gray-500">
            <p>* Campos obrigatórios</p>
            <p>Um código único será gerado automaticamente para o condomínio.</p>
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setModalCriacao(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            onClick={criarCondominio}
            disabled={salvando || !formData.nome || !formData.endereco}
          >
            {salvando ? 'Criando...' : 'Criar Condomínio'}
          </Button>
        </ModalFooter>
      </Modal>
    </Layout>
  );
}

