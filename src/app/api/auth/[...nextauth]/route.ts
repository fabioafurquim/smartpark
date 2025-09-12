import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Configuração das rotas de autenticação do NextAuth.js
 * Handles GET e POST requests para /api/auth/*
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };