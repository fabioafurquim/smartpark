import { z } from 'zod';

// Schema para validação de telefone brasileiro
const telefoneSchema = z.string()
  .regex(/^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/, 'Formato de telefone inválido (ex: (11) 99999-9999)')
  .optional()
  .or(z.literal(''));

// Schema para validação de email
const emailSchema = z.string()
  .email('Email inválido')
  .optional()
  .or(z.literal(''));

// Schema para validação de URL
const urlSchema = z.string()
  .url('URL inválida')
  .optional()
  .or(z.literal(''));

/**
 * Schema para criação de condomínio
 */
export const criarCondominioSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  endereco: z.string()
    .min(10, 'Endereço deve ter pelo menos 10 caracteres')
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .trim(),
  telefone: telefoneSchema,
  email: emailSchema,
  logoUrl: urlSchema
});

/**
 * Schema para atualização de condomínio
 */
export const atualizarCondominioSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
  endereco: z.string()
    .min(10, 'Endereço deve ter pelo menos 10 caracteres')
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .trim()
    .optional(),
  telefone: telefoneSchema,
  email: emailSchema,
  logoUrl: urlSchema,
  ativo: z.boolean().optional()
});

/**
 * Schema para filtros de busca de condomínios
 */
export const filtrosCondominioSchema = z.object({
  busca: z.string().optional(),
  ativo: z.enum(['true', 'false']).optional(),
  pagina: z.coerce.number().min(1).default(1),
  limite: z.coerce.number().min(1).max(100).default(10)
});

/**
 * Tipos TypeScript derivados dos schemas
 */
export type CriarCondominioData = z.infer<typeof criarCondominioSchema>;
export type AtualizarCondominioData = z.infer<typeof atualizarCondominioSchema>;
export type FiltrosCondominioData = z.infer<typeof filtrosCondominioSchema>;