'use client';

import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void | Promise<void>;
  titulo: string;
  descricao: string;
  confirmarLabel?: string;
  cancelarLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'primary';
  children?: ReactNode;
}

export function ConfirmDialog({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  descricao,
  confirmarLabel = 'Confirmar',
  cancelarLabel = 'Cancelar',
  loading = false,
  variant = 'danger',
  children,
}: ConfirmDialogProps) {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={titulo} tamanho="sm">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">{descricao}</p>
        </div>

        {children}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={aoFechar} disabled={loading}>
            {cancelarLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => void aoConfirmar()}
            loading={loading}
          >
            {confirmarLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
