import { z } from 'zod';
import { CODIGO_CONDOMINIO_LENGTH } from '@/lib/condominio-codigo';

// Schema base para validacao de email
const emailSchema = z.string().email('Email invalido').min(1, 'Email e obrigatorio');

// Schema base para validacao de senha
const senhaSchema = z
  .string()
  .min(6, 'Senha deve ter pelo menos 6 caracteres')
  .max(100, 'Senha deve ter no maximo 100 caracteres');

// Schema para validacao de nome
const nomeSchema = z
  .string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome deve ter no maximo 100 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espacos');

// Schema para validacao de telefone
const telefoneSchema = z
  .string()
  .regex(/^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/, 'Formato de telefone invalido')
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
  senha: z.string().min(1, 'Senha e obrigatoria'),
});

// Schemas para Condominio - Movidos para src/lib/validations/condominio.ts

// Schemas para Torre
export const criarTorreSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(50, 'Nome deve ter no maximo 50 caracteres'),
  descricao: z.string().max(200, 'Descricao deve ter no maximo 200 caracteres').optional(),
  condominioId: z.string().uuid('ID do condominio invalido'),
});

export const atualizarTorreSchema = z.object({
  nome: z.string().min(1).max(50).optional(),
  descricao: z.string().max(200).optional(),
});

// Schemas para Unidade
export const criarUnidadeSchema = z.object({
  numero: z.string().min(1, 'Numero e obrigatorio').max(10, 'Numero deve ter no maximo 10 caracteres'),
  andar: z.string().max(10, 'Andar deve ter no maximo 10 caracteres').optional(),
  torreId: z.string().uuid('ID da torre invalido'),
});

export const atualizarUnidadeSchema = z.object({
  numero: z.string().min(1).max(10).optional(),
  andar: z.string().max(10).optional(),
});

// Schemas para Vaga
export const criarVagaSchema = z.object({
  numero: z
    .string()
    .min(1, 'Numero e obrigatorio')
    .max(10, 'Numero deve ter no maximo 10 caracteres'),
  tipo: z.enum(['COBERTA', 'DESCOBERTA', 'DEFICIENTE', 'IDOSO', 'VISITANTE']),
  unidadeId: z.string().uuid('ID da unidade invalido'),
});

export const atualizarVagaSchema = z.object({
  numero: z.string().min(1).max(10).optional(),
  tipo: z.enum(['COBERTA', 'DESCOBERTA', 'DEFICIENTE', 'IDOSO', 'VISITANTE']).optional(),
});

// Schemas para PerfilUsuario
export const criarPerfilUsuarioSchema = z.object({
  usuarioId: z.string().uuid('ID do usuario invalido'),
  condominioId: z.string().uuid('ID do condominio invalido'),
  tipo: z.enum([
    'administrador_mestre',
    'administrador_condominio',
    'sindico',
    'porteiro',
    'morador',
  ]),
  permissoes: z.record(z.string(), z.boolean()).optional(),
});

export const atualizarPerfilUsuarioSchema = z.object({
  tipo: z
    .enum([
      'administrador_mestre',
      'administrador_condominio',
      'sindico',
      'porteiro',
      'morador',
    ])
    .optional(),
  permissoes: z.record(z.string(), z.boolean()).optional(),
  ativo: z.boolean().optional(),
});

// Schemas para SolicitacaoCadastro
export const criarSolicitacaoCadastroSchema = z.object({
  codigoCondominio: z
    .string()
    .trim()
    .length(CODIGO_CONDOMINIO_LENGTH, `Codigo deve ter ${CODIGO_CONDOMINIO_LENGTH} caracteres`)
    .regex(/^[A-Z0-9]+$/, 'Codigo deve conter apenas letras e numeros'),
  unidadeId: z.string().uuid('ID da unidade invalido'),
  vagaId: z.string().uuid('ID da vaga invalido').optional(),
});

export const autoCadastroMoradorSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaSchema,
  codigoCondominio: z
    .string()
    .trim()
    .length(
      CODIGO_CONDOMINIO_LENGTH,
      `Codigo do condominio deve ter ${CODIGO_CONDOMINIO_LENGTH} caracteres`
    )
    .regex(/^[A-Z0-9]+$/, 'Codigo do condominio deve conter apenas letras e numeros'),
  unidadeId: z.string().min(1, 'Unidade e obrigatoria'),
});

export const processarSolicitacaoSchema = z.object({
  status: z.enum(['aprovado', 'rejeitado']),
  observacoes: z.string().max(500, 'Observacoes devem ter no maximo 500 caracteres').optional(),
});

// Schema para configuracao inicial do sistema
export const configuracaoInicialSchema = z
  .object({
    // Dados da empresa
    nomeEmpresa: z
      .string()
      .min(2, 'Nome da empresa deve ter pelo menos 2 caracteres')
      .max(100, 'Nome da empresa deve ter no maximo 100 caracteres'),
    emailContato: emailSchema,
    telefoneContato: telefoneSchema,

    // Dados do administrador
    nomeAdmin: nomeSchema,
    emailAdmin: emailSchema,
    senhaAdmin: senhaSchema,
    confirmarSenhaAdmin: z.string(),
  })
  .refine((data) => data.senhaAdmin === data.confirmarSenhaAdmin, {
    message: 'As senhas nao coincidem',
    path: ['confirmarSenhaAdmin'],
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

// Schema para paginacao
export const paginacaoSchema = z.object({
  pagina: z.number().int().min(1).default(1),
  itensPorPagina: z.number().int().min(1).max(100).default(10),
});

// Schema para IDs
export const idSchema = z.string().uuid('ID invalido');

// Schema para codigos unicos
export const codigoUnicoSchema = z
  .string()
  .trim()
  .length(CODIGO_CONDOMINIO_LENGTH, `Codigo deve ter ${CODIGO_CONDOMINIO_LENGTH} caracteres`)
  .regex(/^[A-Z0-9]+$/, 'Codigo deve conter apenas letras maiusculas e numeros');

// Schema para notificacoes por email
export const notificacaoEmailSchema = z.object({
  para: emailSchema,
  assunto: z
    .string()
    .min(1, 'Assunto e obrigatorio')
    .max(200, 'Assunto deve ter no maximo 200 caracteres'),
  conteudo: z.string().min(1, 'Conteudo e obrigatorio'),
  template: z.string().optional(),
  dados: z.record(z.string(), z.any()).optional(),
});

// Tipos inferidos dos schemas
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;
export type AtualizarUsuarioInput = z.infer<typeof atualizarUsuarioSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CriarCondominioInput = z.infer<
  typeof import('./validations/condominio').criarCondominioSchema
>;
export type AtualizarCondominioInput = z.infer<
  typeof import('./validations/condominio').atualizarCondominioSchema
>;
export type CriarTorreInput = z.infer<typeof criarTorreSchema>;
export type AtualizarTorreInput = z.infer<typeof atualizarTorreSchema>;
export type CriarUnidadeInput = z.infer<typeof criarUnidadeSchema>;
export type AtualizarUnidadeInput = z.infer<typeof atualizarUnidadeSchema>;
export type CriarVagaInput = z.infer<typeof criarVagaSchema>;
export type AtualizarVagaInput = z.infer<typeof atualizarVagaSchema>;
export type CriarPerfilUsuarioInput = z.infer<typeof criarPerfilUsuarioSchema>;
export type AtualizarPerfilUsuarioInput = z.infer<typeof atualizarPerfilUsuarioSchema>;
export type CriarSolicitacaoCadastroInput = z.infer<typeof criarSolicitacaoCadastroSchema>;
export type AutoCadastroMoradorInput = z.infer<typeof autoCadastroMoradorSchema>;
export type ProcessarSolicitacaoInput = z.infer<typeof processarSolicitacaoSchema>;
export type ConfiguracaoInicialInput = z.infer<typeof configuracaoInicialSchema>;
export type FiltrosBuscaInput = z.infer<typeof filtrosBuscaSchema>;
export type PaginacaoInput = z.infer<typeof paginacaoSchema>;
export type NotificacaoEmailInput = z.infer<typeof notificacaoEmailSchema>;
