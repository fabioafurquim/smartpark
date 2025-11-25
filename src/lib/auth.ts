import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';
import { compare } from 'bcryptjs';
import { UsuarioSessao } from '../types';

/**
 * Configuração do NextAuth.js para autenticação
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        senha: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          return null;
        }

        try {
          // Buscar usuário no banco de dados
          const usuario = await prisma.usuario.findUnique({
            where: { email: credentials.email },
            include: {
              perfis: {
                where: { ativo: true },
                include: {
                  condominio: {
                    select: {
                      id: true,
                      nome: true,
                      codigoUnico: true,
                    },
                  },
                },
              },
            },
          });

          if (!usuario || !usuario.ativo) {
            return null;
          }

          // Verificar senha usando bcrypt
          if (!usuario.senha) {
            return null;
          }
          
          const senhaValida = await compare(credentials.senha, usuario.senha);
          if (!senhaValida) {
            return null;
          }

          // Retornar dados do usuário para a sessão
          return {
            id: usuario.id,
            name: usuario.nome,
            email: usuario.email,
            perfis: usuario.perfis.map(perfil => ({
              id: perfil.id,
              tipo: perfil.tipo,
              condominioId: perfil.condominioId,
              condominio: perfil.condominio ? {
                id: perfil.condominio.id,
                nome: perfil.condominio.nome
              } : null,
            })),
          };
        } catch (error) {
          console.error('Erro na autenticação:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.perfis = (user as any).perfis;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub!;
        (session.user as UsuarioSessao).perfis = token.perfis as UsuarioSessao['perfis'] || [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login?error=true',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Função para verificar se o usuário tem um perfil específico
 * @param usuario - Dados do usuário da sessão
 * @param tipoPerfil - Tipo de perfil a verificar
 * @param condominioId - ID do condomínio (opcional)
 * @returns boolean
 */
export function temPerfil(
  usuario: UsuarioSessao,
  tipoPerfil: string,
  condominioId?: string
): boolean {
  return usuario.perfis.some(perfil => {
    const tipoCorreto = perfil.tipo === tipoPerfil;
    const condominioCorreto = !condominioId || perfil.condominioId === condominioId;
    return tipoCorreto && condominioCorreto;
  });
}

/**
 * Função para verificar se o usuário é administrador mestre
 * @param usuario - Dados do usuário da sessão
 * @returns boolean
 */
export function ehAdministradorMestre(usuario: UsuarioSessao): boolean {
  return temPerfil(usuario, 'administrador_mestre');
}

/**
 * Função para verificar se o usuário é administrador de condomínio
 * @param usuario - Dados do usuário da sessão
 * @param condominioId - ID do condomínio
 * @returns boolean
 */
export function ehAdministradorCondominio(
  usuario: UsuarioSessao,
  condominioId: string
): boolean {
  return temPerfil(usuario, 'administrador_condominio', condominioId);
}

/**
 * Função para verificar se o usuário é síndico
 * @param usuario - Dados do usuário da sessão
 * @param condominioId - ID do condomínio
 * @returns boolean
 */
export function ehSindico(usuario: UsuarioSessao, condominioId: string): boolean {
  return temPerfil(usuario, 'sindico', condominioId);
}

/**
 * Função para verificar se o usuário é morador
 * @param usuario - Dados do usuário da sessão
 * @param condominioId - ID do condomínio
 * @returns boolean
 */
export function ehMorador(usuario: UsuarioSessao, condominioId: string): boolean {
  return temPerfil(usuario, 'morador', condominioId);
}

/**
 * Função para obter condomínios do usuário
 * @param usuario - Dados do usuário da sessão
 * @returns Array de condomínios ou Promise<Array> para administrador mestre
 */
export function obterCondominiosUsuario(usuario: UsuarioSessao) {
  // Administrador mestre tem acesso a todos os condomínios
  if (ehAdministradorMestre(usuario)) {
    // Para administrador mestre, retornamos uma função que busca todos os condomínios
    // Isso será tratado de forma especial na API
    return 'TODOS_CONDOMINIOS' as any;
  }
  
  return usuario.perfis.map(perfil => perfil.condominio);
}

/**
 * Função para verificar permissões específicas
 * @param usuario - Dados do usuário da sessão
 * @param permissao - Nome da permissão
 * @param condominioId - ID do condomínio (opcional)
 * @returns boolean
 */
export function temPermissao(
  usuario: UsuarioSessao,
  permissao: string,
  condominioId?: string
): boolean {
  // Administrador mestre tem todas as permissões
  if (ehAdministradorMestre(usuario)) {
    return true;
  }

  // Verificar permissões específicas do perfil
  return usuario.perfis.some(perfil => {
    const condominioCorreto = !condominioId || perfil.condominioId === condominioId;
    if (!condominioCorreto) return false;

    // Definir permissões por tipo de perfil
    switch (perfil.tipo) {
      case 'administrador_mestre':
        // Administrador mestre tem todas as permissões
        return true;
        
      case 'administrador_condominio':
        return [
          'gerenciarUsuarios',
          'gerenciarEstrutura',
          'visualizarRelatorios',
          'configurarSistema',
        ].includes(permissao);
      
      case 'sindico':
        return [
          'aprovarSolicitacoes',
          'visualizarRelatorios',
          'gerenciarReservas',
        ].includes(permissao);
      
      case 'morador':
        return [
          'visualizarPerfil',
          'gerenciarReservas',
        ].includes(permissao);
      
      default:
        return false;
    }
  });
}
