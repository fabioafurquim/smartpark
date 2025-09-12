import { z } from 'zod';
import { TipoPerfilUsuario, StatusSolicitacao, TipoVaga } from '@/types';

// Schema base para validação de email
const emailSchema = z.string()
  .email('Email inválido')
  .min(1, 'Email é obrigatório');

// Schema base para validação de senha
const senhaSchema = z.string()
  .min(6, 'Senha deve ter pelo menos 6 caracteres')
  .max(100, 'Senha deve ter no máximo 100 caracteres');

// Schema para validação de nome
const nomeSchema = z.string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços');

// Schema para validação de telefone
const telefoneSchema = z.string()
  .regex(/^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/, 'Formato de telefone inválido')
  .optional();

// Schemas para Usuario
export const criarUsuarioSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaSchema,
});

export const atualizarUsuarioSchema = z.object({
  nome: nomeSchema.optional(),
  email: emailSchema.optional(),
  ativo: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Senha é obrigatória'),
});

// Schemas para Condominio
export const criarCondominioSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  endereco: z.string()
    .min(10, 'Endereço deve ter pelo menos 10 caracteres')
    .max(200, 'Endereço deve ter no máximo 200 caracteres'),
  telefone: telefoneSchema,
  email: emailSchema.optional(),
});

export const atualizarCondominioSchema = z.object({
  nome: z.string().min(2).max(100).optional(),
  endereco: z.string().min(10).max(200).optional(),
  telefone: telefoneSchema,
  email: emailSchema.optional(),
  logoUrl: z.string().url('URL inválida').optional(),
  ativo: z.boolean().optional(),
});

// Schemas para Torre
export const criarTorreSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  descricao: z.string().max(200, 'Descrição deve ter no máximo 200 caracteres').optional(),
  condominioId: z.string().uuid('ID do condomínio inválido'),
});

export const atualizarTorreSchema = z.object({
  nome: z.string().min(1).max(50).optional(),
  descricao: z.string().max(200).optional(),
});

// Schemas para Unidade
export const criarUnidadeSchema = z.object({
  numero: z.string()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número deve ter no máximo 10 caracteres'),
  andar: z.string().max(10, 'Andar deve ter no máximo 10 caracteres').optional(),
  torreId: z.string().uuid('ID da torre inválido'),
});

export const atualizarUnidadeSchema = z.object({
  numero: z.string().min(1).max(10).optional(),
  andar: z.string().max(10).optional(),
});

// Schemas para Vaga
export const criarVagaSchema = z.object({
  numero: z.string()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número deve ter no máximo 10 caracteres'),
  tipo: z.enum(['comum', 'deficiente', 'idoso'] as const, {
    errorMap: () => ({ message: 'Tipo de vaga inválido' }),
  }),
  unidadeId: z.string().uuid('ID da unidade inválido'),
});

export const atualizarVagaSchema = z.object({
  numero: z.string().min(1).max(10).optional(),
  tipo: z.enum(['comum', 'deficiente', 'idoso'] as const).optional(),
  proprietarioId: z.string().uuid().optional(),
});

// Schemas para PerfilUsuario
export const criarPerfilUsuarioSchema = z.object({
  usuarioId: z.string().uuid('ID do usuário inválido'),
  condominioId: z.string().uuid('ID do condomínio inválido'),
  tipo: z.enum(['administrador_mestre', 'administrador_condominio', 'sindico', 'morador'] as const, {
    errorMap: () => ({ message: 'Tipo de perfil inválido' }),
  }),
  permissoes: z.record(z.boolean()).optional(),
});

export const atualizarPerfilUsuarioSchema = z.object({
  tipo: z.enum(['administrador_mestre', 'administrador_condominio', 'sindico', 'morador'] as const).optional(),
  permissoes: z.record(z.boolean()).optional(),
  ativo: z.boolean().optional(),
});

// Schemas para SolicitacaoCadastro
export const criarSolicitacaoCadastroSchema = z.object({
  codigoCondominio: z.string()
    .min(1, 'Código do condomínio é obrigatório')
    .max(20, 'Código deve ter no máximo 20 caracteres'),
  unidadeId: z.string().uuid('ID da unidade inválido'),
  vagaId: z.string().uuid('ID da vaga inválido').optional(),
});

export const processarSolicitacaoSchema = z.object({
  status: z.enum(['aprovado', 'rejeitado'] as const, {
    errorMap: () => ({ message: 'Status inválido' }),
  }),
  observacoes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
});

// Schema para configuração inicial do sistema
export const configuracaoInicialSchema = z.object({
  // Dados da empresa
  nomeEmpresa: z.string()
    .min(2, 'Nome da empresa deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da empresa deve ter no máximo 100 caracteres'),
  emailContato: emailSchema,
  telefoneContato: telefoneSchema.refine(val => val && val.length > 0, {
    message: 'Telefone de contato é obrigatório'
  }),
  
  // Dados do administrador
  nomeAdmin: nomeSchema,
  emailAdmin: emailSchema,
  senhaAdmin: senhaSchema,
  confirmarSenhaAdmin: z.string()
}).refine(data => data.senhaAdmin === data.confirmarSenhaAdmin, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenhaAdmin']
});

// Schema para busca e filtros
export const filtrosBuscaSchema = z.object({
  termo: z.string().optional(),
  status: z.string().optional(),
  tipo: z.string().optional(),
  condominioId: z.string().uuid().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  pagina: z.number().int().min(1).default(1),
  itensPorPagina: z.number().int().min(1).max(100).default(10),
});

// Schema para paginação
export const paginacaoSchema = z.object({
  pagina: z.number().int().min(1).default(1),
  itensPorPagina: z.number().int().min(1).max(100).default(10),
});

// Schema para IDs
export const idSchema = z.string().uuid('ID inválido');

// Schema para códigos únicos
export const codigoUnicoSchema = z.string()
  .min(6, 'Código deve ter pelo menos 6 caracteres')
  .max(20, 'Código deve ter no máximo 20 caracteres')
  .regex(/^[A-Z0-9]+$/, 'Código deve conter apenas letras maiúsculas e números');

// Schema para notificações por email
export const notificacaoEmailSchema = z.object({
  para: emailSchema,
  assunto: z.string().min(1, 'Assunto é obrigatório').max(200, 'Assunto deve ter no máximo 200 caracteres'),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  template: z.string().optional(),
  dados: z.record(z.any()).optional(),
});

// Tipos inferidos dos schemas
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;
export type AtualizarUsuarioInput = z.infer<typeof atualizarUsuarioSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CriarCondominioInput = z.infer<typeof criarCondominioSchema>;
export type AtualizarCondominioInput = z.infer<typeof atualizarCondominioSchema>;
export type CriarTorreInput = z.infer<typeof criarTorreSchema>;
export type AtualizarTorreInput = z.infer<typeof atualizarTorreSchema>;
export type CriarUnidadeInput = z.infer<typeof criarUnidadeSchema>;
export type AtualizarUnidadeInput = z.infer<typeof atualizarUnidadeSchema>;
export type CriarVagaInput = z.infer<typeof criarVagaSchema>;
export type AtualizarVagaInput = z.infer<typeof atualizarVagaSchema>;
export type CriarPerfilUsuarioInput = z.infer<typeof criarPerfilUsuarioSchema>;
export type AtualizarPerfilUsuarioInput = z.infer<typeof atualizarPerfilUsuarioSchema>;
export type CriarSolicitacaoCadastroInput = z.infer<typeof criarSolicitacaoCadastroSchema>;
export type ProcessarSolicitacaoInput = z.infer<typeof processarSolicitacaoSchema>;
export type ConfiguracaoInicialInput = z.infer<typeof configuracaoInicialSchema>;
export type FiltrosBuscaInput = z.infer<typeof filtrosBuscaSchema>;
export type PaginacaoInput = z.infer<typeof paginacaoSchema>;
export type NotificacaoEmailInput = z.infer<typeof notificacaoEmailSchema>;