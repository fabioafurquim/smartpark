import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware para controle de acesso e redirecionamentos
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const temPerfisAtivos = Array.isArray(token?.perfis) && token.perfis.length > 0;

  const rotasPublicas = [
    '/api/configuracao-inicial',
    '/api/auth',
    '/_next',
    '/favicon.ico',
    '/public',
    '/configuracao-inicial',
    '/cadastro',
  ];

  const eRotaPublica = rotasPublicas.some((rota) => pathname.startsWith(rota));

  if (eRotaPublica) {
    return NextResponse.next();
  }

  try {
    if (pathname === '/configuracao-inicial') {
      return NextResponse.next();
    }

    const rotasProtegidas = [
      '/dashboard',
      '/condominios',
      '/configuracoes',
      '/relatorios',
      '/locacao',
      '/minhas-locacoes',
      '/minhas-vagas',
      '/reservas-admin',
      '/reservas-sindico',
      '/reservas-vaga',
      '/solicitacoes',
    ];

    const eRotaProtegida = rotasProtegidas.some((rota) => pathname.startsWith(rota));

    if (eRotaProtegida && !token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (eRotaProtegida && token && !temPerfisAtivos) {
      return NextResponse.redirect(new URL('/cadastro/pendente', request.url));
    }

    if (pathname === '/login' && token) {
      return NextResponse.redirect(
        new URL(temPerfisAtivos ? '/dashboard' : '/cadastro/pendente', request.url)
      );
    }

    if (pathname === '/cadastro' && token) {
      return NextResponse.redirect(
        new URL(temPerfisAtivos ? '/dashboard' : '/cadastro/pendente', request.url)
      );
    }

    if (pathname === '/') {
      if (token) {
        return NextResponse.redirect(
          new URL(temPerfisAtivos ? '/dashboard' : '/cadastro/pendente', request.url)
        );
      }

      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Erro no middleware:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
