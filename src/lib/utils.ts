import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes CSS de forma inteligente usando clsx e tailwind-merge
 * @param inputs - Classes CSS para combinar
 * @returns String com classes CSS combinadas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma data para o padrão brasileiro
 * @param date - Data para formatar
 * @returns String formatada (dd/mm/aaaa)
 */
export function formatarData(date: Date | string): string {
  const dataObj = typeof date === 'string' ? new Date(date) : date;
  return dataObj.toLocaleDateString('pt-BR');
}

/**
 * Formata uma data e hora para o padrão brasileiro
 * @param date - Data para formatar
 * @returns String formatada (dd/mm/aaaa às hh:mm)
 */
export function formatarDataHora(date: Date | string): string {
  const dataObj = typeof date === 'string' ? new Date(date) : date;
  return dataObj.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Gera um código único alfanumérico
 * @param length - Tamanho do código (padrão: 8)
 * @returns Código único gerado
 */
export function gerarCodigoUnico(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Capitaliza a primeira letra de cada palavra
 * @param str - String para capitalizar
 * @returns String capitalizada
 */
export function capitalizarPalavras(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Valida se um email é válido
 * @param email - Email para validar
 * @returns Boolean indicando se é válido
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Remove caracteres especiais de uma string, mantendo apenas letras, números e espaços
 * @param str - String para limpar
 * @returns String limpa
 */
export function limparString(str: string): string {
  return str.replace(/[^a-zA-Z0-9\s]/g, '').trim();
}

/**
 * Trunca um texto se exceder o limite de caracteres
 * @param text - Texto para truncar
 * @param limit - Limite de caracteres
 * @returns Texto truncado com "..."
 */
export function truncarTexto(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.substring(0, limit) + '...';
}

/**
 * Converte um status em português para uma cor do tema
 * @param status - Status para converter
 * @returns Classe CSS da cor correspondente
 */
export function obterCorStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pendente': 'text-warning-600 bg-warning-50',
    'aprovado': 'text-success-600 bg-success-50',
    'rejeitado': 'text-danger-600 bg-danger-50',
    'ativo': 'text-success-600 bg-success-50',
    'inativo': 'text-secondary-600 bg-secondary-50',
  };
  
  return statusMap[status.toLowerCase()] || 'text-secondary-600 bg-secondary-50';
}
