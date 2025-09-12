'use client';

import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo?: string;
  descricao?: string;
  children: ReactNode;
  tamanho?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  mostrarBotaoFechar?: boolean;
  fecharAoClicarFora?: boolean;
}

/**
 * Componente Modal reutilizável
 */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  tamanho = 'md',
  mostrarBotaoFechar = true,
  fecharAoClicarFora = true,
}: ModalProps) {
  const tamanhos = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  };

  return (
    <Transition appear show={aberto} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={fecharAoClicarFora ? aoFechar : () => {}}
      >
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        {/* Container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={cn(
                'w-full transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all',
                tamanhos[tamanho]
              )}>
                {/* Header */}
                {(titulo || mostrarBotaoFechar) && (
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                      {titulo && (
                        <Dialog.Title
                          as="h3"
                          className="text-lg font-semibold leading-6 text-gray-900"
                        >
                          {titulo}
                        </Dialog.Title>
                      )}
                      {descricao && (
                        <p className="mt-1 text-sm text-gray-600">
                          {descricao}
                        </p>
                      )}
                    </div>
                    
                    {mostrarBotaoFechar && (
                      <button
                        type="button"
                        className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        onClick={aoFechar}
                      >
                        <span className="sr-only">Fechar</span>
                        <X className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className={cn(
                  'p-6',
                  !(titulo || mostrarBotaoFechar) && 'pt-6'
                )}>
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * Componente para o rodapé do modal
 */
export function ModalFooter({ children, className }: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50',
      className
    )}>
      {children}
    </div>
  );
}