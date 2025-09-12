'use client';

import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OpcaoSelect {
  valor: string | number;
  label: string;
  desabilitado?: boolean;
}

export interface SelectProps {
  valor?: string | number;
  aoMudar: (valor: string | number) => void;
  opcoes: OpcaoSelect[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Componente Select reutilizável
 */
export function Select({
  valor,
  aoMudar,
  opcoes,
  placeholder = 'Selecione uma opção',
  label,
  error,
  disabled = false,
  fullWidth = false,
  className,
}: SelectProps) {
  const opcaoSelecionada = opcoes.find(opcao => opcao.valor === valor);
  const hasError = !!error;

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <div className={cn('relative', widthClass, className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <Listbox value={valor} onChange={aoMudar} disabled={disabled}>
        <div className="relative">
          {/* Button */}
          <Listbox.Button className={cn(
            'relative w-full cursor-default rounded-lg border py-2 pl-3 pr-10 text-left text-sm',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
            disabled && 'bg-gray-50'
          )}>
            <span className={cn(
              'block truncate',
              !opcaoSelecionada && 'text-gray-400'
            )}>
              {opcaoSelecionada ? opcaoSelecionada.label : placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown
                className="h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          {/* Options */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {opcoes.map((opcao) => (
                <Listbox.Option
                  key={opcao.valor}
                  className={({ active, disabled: optionDisabled }) =>
                    cn(
                      'relative cursor-default select-none py-2 pl-10 pr-4',
                      active && !optionDisabled && 'bg-primary-100 text-primary-900',
                      optionDisabled && 'opacity-50 cursor-not-allowed',
                      !active && !optionDisabled && 'text-gray-900'
                    )
                  }
                  value={opcao.valor}
                  disabled={opcao.desabilitado}
                >
                  {({ selected }) => (
                    <>
                      <span className={cn(
                        'block truncate',
                        selected ? 'font-medium' : 'font-normal'
                      )}>
                        {opcao.label}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Componente MultiSelect para seleção múltipla
 */
export interface MultiSelectProps {
  valores?: (string | number)[];
  aoMudar: (valores: (string | number)[]) => void;
  opcoes: OpcaoSelect[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  maxItens?: number;
  className?: string;
}

export function MultiSelect({
  valores = [],
  aoMudar,
  opcoes,
  placeholder = 'Selecione opções',
  label,
  error,
  disabled = false,
  fullWidth = false,
  maxItens,
  className,
}: MultiSelectProps) {
  const opcoesSelecionadas = opcoes.filter(opcao => valores.includes(opcao.valor));
  const hasError = !!error;
  const widthClass = fullWidth ? 'w-full' : '';

  const toggleOpcao = (valor: string | number) => {
    if (valores.includes(valor)) {
      aoMudar(valores.filter(v => v !== valor));
    } else {
      if (maxItens && valores.length >= maxItens) return;
      aoMudar([...valores, valor]);
    }
  };

  const obterTextoExibicao = () => {
    if (opcoesSelecionadas.length === 0) return placeholder;
    if (opcoesSelecionadas.length === 1) return opcoesSelecionadas[0].label;
    return `${opcoesSelecionadas.length} itens selecionados`;
  };

  return (
    <div className={cn('relative', widthClass, className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <Listbox value={valores} onChange={aoMudar} disabled={disabled} multiple>
        <div className="relative">
          {/* Button */}
          <Listbox.Button className={cn(
            'relative w-full cursor-default rounded-lg border py-2 pl-3 pr-10 text-left text-sm',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
            disabled && 'bg-gray-50'
          )}>
            <span className={cn(
              'block truncate',
              opcoesSelecionadas.length === 0 && 'text-gray-400'
            )}>
              {obterTextoExibicao()}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown
                className="h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          {/* Options */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {opcoes.map((opcao) => {
                const selecionado = valores.includes(opcao.valor);
                const desabilitado = opcao.desabilitado || 
                  (!selecionado && maxItens && valores.length >= maxItens);

                return (
                  <Listbox.Option
                    key={opcao.valor}
                    className={({ active }) =>
                      cn(
                        'relative cursor-default select-none py-2 pl-10 pr-4',
                        active && !desabilitado && 'bg-primary-100 text-primary-900',
                        desabilitado && 'opacity-50 cursor-not-allowed',
                        !active && !desabilitado && 'text-gray-900'
                      )
                    }
                    value={opcao.valor}
                    disabled={desabilitado}
                    onClick={() => !desabilitado && toggleOpcao(opcao.valor)}
                  >
                    <span className={cn(
                      'block truncate',
                      selecionado ? 'font-medium' : 'font-normal'
                    )}>
                      {opcao.label}
                    </span>
                    {selecionado && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </Listbox.Option>
                );
              })}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}