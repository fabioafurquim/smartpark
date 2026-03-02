import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

/**
 * Middleware para controle de acesso e redirecionamentos
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rotas que não precisam de verificação
  const rotasPublicas = [
    '/api/configuracao-inicial',
    '/api/auth',
    '/_next',
    '/favicon.ico',
    '/public',
    '/configuracao-inicial',
  ];

  // Verificar se é uma rota pública
  const eRotaPublica = rotasPublicas.some(rota => 
    pathname.startsWith(rota)
  );

  if (eRotaPublica) {
    return NextResponse.next();
  }

  try {
    // Verificar se o sistema foi configurado diretamente no banco
    const config = await prisma.configuracaoSistema.findFirst();
    const configurado = config?.administradorMestreConfigurado || false;

    // Se o sistema não foi configurado
    if (!configurado) {
      // Redirecionar para configuração inicial
      if (pathname !== '/configuracao-inicial') {
        return NextResponse.redirect(new URL('/configuracao-inicial', request.url));
      }
      return NextResponse.next();
    }

    // Se o sistema foi configurado, não permitir acesso à configuração inicial
    if (pathname === '/configuracao-inicial') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verificar autenticação para rotas protegidas
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // Rotas que requerem autenticação
    const rotasProtegidas = [
      '/dashboard',
      '/condominios',
      '/configuracoes',
      '/relatorios',
    ];

    const eRotaProtegida = rotasProtegidas.some(rota => 
      pathname.startsWith(rota)
    );

    // Se é uma rota protegida e não está autenticado
    if (eRotaProtegida && !token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Se está autenticado e tenta acessar login
    if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Redirecionar root para dashboard se autenticado, senão para login
    if (pathname === '/') {
      if (token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Erro no middleware:', error);
    return NextResponse.next();
  }
}

/**
 * Configuração do matcher para definir em quais rotas o middleware deve executar
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
