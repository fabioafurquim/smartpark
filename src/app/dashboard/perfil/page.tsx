'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { User, Lock } from 'lucide-react';
import { Layout } from '@/components';
import { Button } from '@/components/ui';

export default function PerfilPage() {
  const { data: session } = useSession();
  const usuario = session?.user as any;

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const handleMudarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos' });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'As senhas não conferem' });
      return;
    }

    if (novaSenha.length < 6) {
      setMensagem({ tipo: 'erro', texto: 'A nova senha deve ter no mínimo 6 caracteres' });
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch('/api/perfil/mudar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senhaAtual,
          novaSenha
        })
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || 'Erro ao mudar senha');
      }

      setMensagem({ tipo: 'sucesso', texto: 'Senha alterada com sucesso!' });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err) {
      setMensagem({ 
        tipo: 'erro', 
        texto: err instanceof Error ? err.message : 'Erro desconhecido' 
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        {/* Informações do Usuário */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{usuario?.nome}</h1>
              <p className="text-gray-600">{usuario?.email}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Perfis</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {usuario?.perfis?.map((p: any) => (
                  <span key={p.id} className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                    {p.tipo}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mudar Senha */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Mudar Senha</h2>
          </div>

          {mensagem && (
            <div className={`p-4 rounded-lg mb-6 ${
              mensagem.tipo === 'sucesso' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={mensagem.tipo === 'sucesso' ? 'text-green-700' : 'text-red-700'}>
                {mensagem.texto}
              </p>
            </div>
          )}

          <form onSubmit={handleMudarSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha Atual *
              </label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite sua senha atual"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha *
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite a nova senha (mínimo 6 caracteres)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha *
              </label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirme a nova senha"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={salvando}
                className="flex-1"
              >
                {salvando ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Dica de segurança:</strong> Use uma senha forte com letras, números e caracteres especiais.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
