import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Página principal da aplicação
 * Redireciona usuários autenticados para o dashboard
 * Usuários não autenticados são redirecionados pelo middleware para /login
 */
export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    redirect('/dashboard');
  }
  
  // Esta página nunca será renderizada devido ao middleware
  // mas mantemos como fallback
  redirect('/login');
}
