import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface ColunaTabela<T = Record<string, unknown>> {
  chave: string;
  titulo: string;
  ordenavel?: boolean;
  largura?: string;
  alinhamento?: 'left' | 'center' | 'right';
  renderizar?: (valor: unknown, linha: T) => ReactNode;
}

export interface PropsTabela<T = Record<string, unknown>> {
  colunas: ColunaTabela<T>[];
  dados: T[];
  carregando?: boolean;
  ordenacao?: {
    campo: string;
    direcao: 'asc' | 'desc';
  };
  aoOrdenar?: (campo: string) => void;
  aoClicarLinha?: (linha: T) => void;
  className?: string;
  mensagemVazia?: string;
}

/**
 * Componente Table reutilizável
 */
export function Table({
  colunas,
  dados,
  carregando = false,
  ordenacao,
  aoOrdenar,
  aoClicarLinha,
  className,
  mensagemVazia = 'Nenhum registro encontrado',
}: PropsTabela) {
  const obterAlinhamento = (alinhamento?: string) => {
    switch (alinhamento) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  const renderizarIconeOrdenacao = (coluna: ColunaTabela) => {
    if (!coluna.ordenavel || !ordenacao) return null;

    const estaOrdenado = ordenacao.campo === coluna.chave;
    const direcao = ordenacao.direcao;

    return (
      <span className="ml-1 inline-flex flex-col">
        <ChevronUp 
          className={cn(
            'w-3 h-3 -mb-1',
            estaOrdenado && direcao === 'asc' 
              ? 'text-primary-600' 
              : 'text-gray-400'
          )} 
        />
        <ChevronDown 
          className={cn(
            'w-3 h-3',
            estaOrdenado && direcao === 'desc' 
              ? 'text-primary-600' 
              : 'text-gray-400'
          )} 
        />
      </span>
    );
  };

  if (carregando) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Header */}
          <thead className="bg-gray-50">
            <tr>
              {colunas.map((coluna) => (
                <th
                  key={coluna.chave}
                  className={cn(
                    'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                    obterAlinhamento(coluna.alinhamento),
                    coluna.ordenavel && aoOrdenar && 'cursor-pointer hover:bg-gray-100',
                    coluna.largura
                  )}
                  onClick={() => {
                    if (coluna.ordenavel && aoOrdenar) {
                      aoOrdenar(coluna.chave);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <span>{coluna.titulo}</span>
                    {renderizarIconeOrdenacao(coluna)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {dados.length === 0 ? (
              <tr>
                <td 
                  colSpan={colunas.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {mensagemVazia}
                </td>
              </tr>
            ) : (
              dados.map((linha, indice) => (
                <tr
                  key={indice}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    aoClicarLinha && 'cursor-pointer'
                  )}
                  onClick={() => aoClicarLinha?.(linha)}
                >
                  {colunas.map((coluna) => {
                    const valor = (linha as Record<string, any>)[coluna.chave];
                    const conteudo = coluna.renderizar 
                      ? coluna.renderizar(valor, linha)
                      : valor;

                    return (
                      <td
                        key={coluna.chave}
                        className={cn(
                          'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                          obterAlinhamento(coluna.alinhamento)
                        )}
                      >
                        {conteudo}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Componente para status badge
 */
export function StatusBadge({ 
  status, 
  variant = 'default' 
}: { 
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant]
    )}>
      {status}
    </span>
  );
}