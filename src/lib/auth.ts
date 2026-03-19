import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { prisma } from './prisma';
import { UsuarioSessao } from '../types';
import {
  combinarPermissoesPerfil,
  obterPermissoesPadraoPerfil,
  type MapaPermissoes,
  type PermissaoSistema,
} from './permissoes';

export async function carregarPerfisSessao(usuarioId: string): Promise<UsuarioSessao['perfis']> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      perfis: {
        where: { ativo: true },
        include: {
          condominio: {
            select: {
              id: true,
              nome: true,
              codigoUnico: true,
              configuracoesPermissaoPerfil: {
                select: {
                  tipoPerfil: true,
                  permissoes: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!usuario) {
    return [];
  }

  return usuario.perfis.map((perfil) => {
    const configuracaoPerfil = perfil.condominio.configuracoesPermissaoPerfil.find(
      (configuracao) => configuracao.tipoPerfil === perfil.tipo
    );

    return {
      id: perfil.id,
      tipo: perfil.tipo as UsuarioSessao['perfis'][number]['tipo'],
      condominioId: perfil.condominioId,
      permissoes: combinarPermissoesPerfil(
        perfil.tipo as UsuarioSessao['perfis'][number]['tipo'],
        (configuracaoPerfil?.permissoes as Partial<Record<PermissaoSistema, boolean>> | null) ??
          null,
        (perfil.permissoes as Partial<Record<PermissaoSistema, boolean>> | null) ?? null
      ),
      condominio: {
        id: perfil.condominio.id,
        nome: perfil.condominio.nome,
        codigoUnico: perfil.condominio.codigoUnico,
      },
    };
  });
}

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
          const usuario = await prisma.usuario.findUnique({
            where: { email: credentials.email },
          });

          if (!usuario || !usuario.ativo || !usuario.senha) {
            return null;
          }

          const senhaValida = await compare(credentials.senha, usuario.senha);
          if (!senhaValida) {
            return null;
          }

          return {
            id: usuario.id,
            name: usuario.nome,
            email: usuario.email,
            perfis: await carregarPerfisSessao(usuario.id),
          };
        } catch (error) {
          console.error('Erro na autenticacao:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
      }

      if (token.sub) {
        token.perfis = await carregarPerfisSessao(token.sub);
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub || '';
        (session.user as UsuarioSessao).nome =
          (token.name as string) || session.user.name || '';
        (session.user as UsuarioSessao).perfis =
          (token.perfis as UsuarioSessao['perfis']) || [];
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

export function temPerfil(
  usuario: UsuarioSessao,
  tipoPerfil: string,
  condominioId?: string
): boolean {
  return usuario.perfis.some((perfil) => {
    const tipoCorreto = perfil.tipo === tipoPerfil;
    const condominioCorreto = !condominioId || perfil.condominioId === condominioId;
    return tipoCorreto && condominioCorreto;
  });
}

export function ehAdministradorMestre(usuario: UsuarioSessao): boolean {
  return temPerfil(usuario, 'administrador_mestre');
}

export function ehAdministradorCondominio(
  usuario: UsuarioSessao,
  condominioId: string
): boolean {
  return temPerfil(usuario, 'administrador_condominio', condominioId);
}

export function ehAdministradorLocal(
  usuario: UsuarioSessao,
  condominioId?: string
): boolean {
  return usuario.perfis.some((perfil) => {
    const condominioCorreto = !condominioId || perfil.condominioId === condominioId;
    return condominioCorreto && ['administrador_condominio', 'sindico'].includes(perfil.tipo);
  });
}

export function ehSindico(usuario: UsuarioSessao, condominioId: string): boolean {
  return temPerfil(usuario, 'sindico', condominioId);
}

export function ehPorteiro(usuario: UsuarioSessao, condominioId: string): boolean {
  return temPerfil(usuario, 'porteiro', condominioId);
}

export function ehMorador(usuario: UsuarioSessao, condominioId: string): boolean {
  return temPerfil(usuario, 'morador', condominioId);
}

export function obterCondominiosUsuario(usuario: UsuarioSessao) {
  if (ehAdministradorMestre(usuario)) {
    return 'TODOS_CONDOMINIOS' as const;
  }

  return usuario.perfis.map((perfil) => perfil.condominio);
}

export function temPermissao(
  usuario: UsuarioSessao,
  permissao: PermissaoSistema | string,
  condominioId?: string
): boolean {
  if (ehAdministradorMestre(usuario)) {
    return true;
  }

  return usuario.perfis.some((perfil) => {
    const condominioCorreto = !condominioId || perfil.condominioId === condominioId;
    if (!condominioCorreto) {
      return false;
    }

    const permissoesPerfil =
      perfil.permissoes ||
      obterPermissoesPadraoPerfil(perfil.tipo as UsuarioSessao['perfis'][number]['tipo']);

    return !!permissoesPerfil[permissao as keyof MapaPermissoes];
  });
}
