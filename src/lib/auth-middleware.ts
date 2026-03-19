import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UsuarioSessao } from '../types';
import {
  carregarPerfisSessao,
  temPermissao,
  ehAdministradorMestre,
  obterCondominiosUsuario,
} from './auth';
import { PermissaoSistema } from './permissoes';

export type Permissao = PermissaoSistema;

export interface ConfigAutorizacao {
  permissao?: Permissao;
  permissoesAlternativas?: Permissao[];
  requerCondominio?: boolean;
  apenasProprioCondominio?: boolean;
}

export function criarMiddlewareAutorizacao(config: ConfigAutorizacao) {
  return async function middlewareAutorizacao(
    request: NextRequest,
    handler: (
      req: NextRequest,
      usuario: UsuarioSessao,
      condominioId?: string
    ) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token || !token.sub) {
        return NextResponse.json(
          { erro: 'Nao autorizado. Token invalido ou expirado.' },
          { status: 401 }
        );
      }

      const usuario: UsuarioSessao = {
        id: token.sub,
        nome: (token.name as string) || '',
        email: (token.email as string) || '',
        perfis: await carregarPerfisSessao(token.sub),
      };

      let condominioId: string | undefined;

      if (request.method === 'GET') {
        condominioId = request.nextUrl.searchParams.get('condominioId') || undefined;
      } else {
        try {
          const body = await request.clone().json();
          condominioId = body.condominioId;
        } catch {
          condominioId = undefined;
        }
      }

      if (config.requerCondominio && !condominioId) {
        return NextResponse.json(
          { erro: 'ID do condominio e obrigatorio para esta operacao.' },
          { status: 400 }
        );
      }

      const permissoesPermitidas = [
        ...(config.permissao ? [config.permissao] : []),
        ...(config.permissoesAlternativas || []),
      ];

      if (
        permissoesPermitidas.length > 0 &&
        !permissoesPermitidas.some((permissao) => temPermissao(usuario, permissao, condominioId))
      ) {
        return NextResponse.json(
          { erro: 'Acesso negado. Voce nao tem permissao para esta operacao.' },
          { status: 403 }
        );
      }

      if (config.apenasProprioCondominio && !ehAdministradorMestre(usuario)) {
        const condominiosUsuario = obterCondominiosUsuario(usuario);

        if (condominiosUsuario !== 'TODOS_CONDOMINIOS') {
          const condominioIds = condominiosUsuario.map((condominio) => condominio.id);

          if (condominioId && !condominioIds.includes(condominioId)) {
            return NextResponse.json(
              { erro: 'Acesso negado. Voce nao tem acesso a este condominio.' },
              { status: 403 }
            );
          }

          if (!condominioId && condominioIds.length > 0) {
            condominioId = condominioIds[0];
          }
        }
      }

      return await handler(request, usuario, condominioId);
    } catch (error) {
      console.error('Erro no middleware de autorizacao:', error);
      return NextResponse.json({ erro: 'Erro interno do servidor.' }, { status: 500 });
    }
  };
}

export function criarRespostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export function obterCondominiosPermitidos(usuario: UsuarioSessao): string[] {
  if (ehAdministradorMestre(usuario)) {
    return [];
  }

  const condominiosUsuario = obterCondominiosUsuario(usuario);
  return condominiosUsuario === 'TODOS_CONDOMINIOS'
    ? []
    : condominiosUsuario.map((condominio) => condominio.id);
}

export const middlewareEstrutura = criarMiddlewareAutorizacao({
  permissao: 'gerenciarEstrutura',
  requerCondominio: true,
  apenasProprioCondominio: true,
});

export const middlewareEstruturaOperacional = criarMiddlewareAutorizacao({
  requerCondominio: true,
  apenasProprioCondominio: true,
  permissoesAlternativas: [
    'gerenciarEstrutura',
    'vincularMoradorUnidade',
    'vincularVagaUnidade',
  ],
});

export const middlewareUsuarios = criarMiddlewareAutorizacao({
  permissao: 'gerenciarUsuarios',
  apenasProprioCondominio: true,
});

export const middlewareRelatorios = criarMiddlewareAutorizacao({
  permissao: 'visualizarRelatorios',
  apenasProprioCondominio: true,
});

export const middlewareConfiguracoes = criarMiddlewareAutorizacao({
  permissao: 'configurarSistema',
});
