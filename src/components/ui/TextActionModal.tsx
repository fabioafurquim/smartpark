'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface TextActionModalProps {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: (valor: string) => void | Promise<void>;
  titulo: string;
  descricao: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  confirmarLabel?: string;
  cancelarLabel?: string;
  valorInicial?: string;
  obrigatorio?: boolean;
  loading?: boolean;
}

export function TextActionModal({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  descricao,
  label,
  placeholder,
  helperText,
  confirmarLabel = 'Salvar',
  cancelarLabel = 'Cancelar',
  valorInicial = '',
  obrigatorio = false,
  loading = false,
}: TextActionModalProps) {
  const [valor, setValor] = useState(valorInicial);

  useEffect(() => {
    if (aberto) {
      setValor(valorInicial);
    }
  }, [aberto, valorInicial]);

  const valorTrimado = valor.trim();
  const confirmDisabled = loading || (obrigatorio && !valorTrimado);

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={titulo} descricao={descricao} tamanho="md">
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
          <textarea
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {helperText && <p className="mt-2 text-xs text-slate-500">{helperText}</p>}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={aoFechar} disabled={loading}>
            {cancelarLabel}
          </Button>
          <Button
            type="button"
            onClick={() => void aoConfirmar(valorTrimado)}
            loading={loading}
            disabled={confirmDisabled}
          >
            {confirmarLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
