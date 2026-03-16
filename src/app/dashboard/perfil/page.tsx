'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Lock, ShieldCheck, User } from 'lucide-react';
import { Layout } from '@/components';
import { Button } from '@/components/ui';

export default function PerfilPage() {
  const { data: session } = useSession();
  const usuario = session?.user as any;

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(
    null
  );

  const handleMudarSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos.' });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'As senhas nao conferem.' });
      return;
    }

    if (novaSenha.length < 6) {
      setMensagem({ tipo: 'erro', texto: 'A nova senha deve ter no minimo 6 caracteres.' });
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch('/api/perfil/mudar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao mudar senha');
      }

      setMensagem({ tipo: 'sucesso', texto: 'Senha alterada com sucesso.' });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err) {
      setMensagem({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,_#eff6ff_0%,_#ffffff_60%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-blue-100">
              <User className="h-10 w-10 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                Minha conta
              </div>
              <h1 className="truncate text-2xl font-bold text-slate-900">{usuario?.nome}</h1>
              <p className="truncate text-sm text-slate-600 sm:text-base">{usuario?.email}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Perfis de acesso</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {usuario?.perfis?.map((perfil: any) => (
              <span
                key={perfil.id}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {perfil.tipo.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Lock className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Alterar senha</h2>
              <p className="text-sm text-slate-500">
                Mantenha sua conta segura com uma senha forte.
              </p>
            </div>
          </div>

          {mensagem && (
            <div
              className={`mb-5 rounded-2xl border p-4 ${
                mensagem.tipo === 'sucesso'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {mensagem.texto}
            </div>
          )}

          <form onSubmit={handleMudarSenha} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Senha atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite sua senha atual"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Nova senha</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimo de 6 caracteres"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
              Dica: combine letras, numeros e um sinal especial para criar uma senha mais segura.
            </div>

            <Button type="submit" disabled={salvando} className="h-12 w-full rounded-2xl sm:w-auto">
              {salvando ? 'Alterando...' : 'Salvar nova senha'}
            </Button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
