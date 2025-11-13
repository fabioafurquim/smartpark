import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UsuarioSessao } from '../types';
import { temPermissao, ehAdministradorMestre, obterCondominiosUsuario } from './auth';

/**
 * Tipos de permissões disponíveis no sistema
 */
export type Permissao = 
  | 'gerenciarUsuarios'
  | 'gerenciarEstrutura'
  | 'visualizarRelatorios'
  | 'configurarSistema'
  | 'aprovarSolicitacoes'
  | 'visualizarPerfil';

/**
 * Interface para configuração de autorização de rotas
 */
export interface ConfigAutorizacao {
  permissao: Permissao;
  requerCondominio?: boolean;
  apenasProprioCondominio?: boolean;
}

/**
 * Middleware de autorização para APIs
 * Valida se o usuário tem permissão para acessar a rota e filtra dados por condomínio
 */
export function criarMiddlewareAutorizacao(config: ConfigAutorizacao) {
  return async function middlewareAutorizacao(
    request: NextRequest,
    handler: (req: NextRequest, usuario: UsuarioSessao, condominioId?: string) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Verificar autenticação
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });

      if (!token || !token.perfis) {
        return NextResponse.json(
          { erro: 'Não autorizado. Token inválido ou expirado.' },
          { status: 401 }
        );
      }

      const usuario: UsuarioSessao = {
        id: (token.sub as string) || '',
        nome: (token.name as string) || '',
        email: (token.email as string) || '',
        perfis: (token.perfis as UsuarioSessao['perfis']) || []
      };

      // Obter condominioId da query string ou body
      let condominioId: string | undefined;
      
      if (request.method === 'GET') {
        condominioId = request.nextUrl.searchParams.get('condominioId') || undefined;
      } else {
        try {
          const body = await request.clone().json();
          condominioId = body.condominioId;
        } catch {
          // Ignorar erro se não conseguir parsear o body
        }
      }

      // Se a rota requer condomínio específico
      if (config.requerCondominio && !condominioId) {
        return NextResponse.json(
          { erro: 'ID do condomínio é obrigatório para esta operação.' },
          { status: 400 }
        );
      }

      // Verificar permissão
      if (!temPermissao(usuario, config.permissao, condominioId)) {
        return NextResponse.json(
          { erro: 'Acesso negado. Você não tem permissão para esta operação.' },
          { status: 403 }
        );
      }

      // Se deve filtrar apenas pelo próprio condomínio e não é admin mestre
      if (config.apenasProprioCondominio && !ehAdministradorMestre(usuario)) {
        const condominiosUsuario = obterCondominiosUsuario(usuario);
        
        // Se obterCondominiosUsuario retorna 'TODOS_CONDOMINIOS', é admin mestre
        if (condominiosUsuario === 'TODOS_CONDOMINIOS') {
          // Admin mestre pode acessar qualquer condomínio, não fazer nada
        } else {
          const condominioIds = condominiosUsuario.map(c => c.id);
          
          // Se condominioId foi especificado, verificar se o usuário tem acesso
          if (condominioId && !condominioIds.includes(condominioId)) {
            return NextResponse.json(
              { erro: 'Acesso negado. Você não tem acesso a este condomínio.' },
              { status: 403 }
            );
          }
          
          // Se não foi especificado condominioId, usar o primeiro condomínio do usuário
          if (!condominioId && condominioIds.length > 0) {
            condominioId = condominioIds[0];
          }
        }
      }

      // Chamar o handler com os dados validados
      return await handler(request, usuario, condominioId);
    } catch (error) {
      console.error('Erro no middleware de autorização:', error);
      return NextResponse.json(
        { erro: 'Erro interno do servidor.' },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper para criar resposta de erro padronizada
 */
export function criarRespostaErro(mensagem: string, status: number = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

/**
 * Helper para filtrar dados por condomínio do usuário
 */
export function obterCondominiosPermitidos(usuario: UsuarioSessao): string[] {
  if (ehAdministradorMestre(usuario)) {
    return []; // Array vazio significa "todos os condomínios"
  }
  
  return obterCondominiosUsuario(usuario).map(c => c.id);
}

/**
 * Middleware específico para rotas de estrutura (torres, unidades, vagas)
 */
export const middlewareEstrutura = criarMiddlewareAutorizacao({
  permissao: 'gerenciarEstrutura',
  requerCondominio: true,
  apenasProprioCondominio: true
});

/**
 * Middleware específico para rotas de usuários
 */
export const middlewareUsuarios = criarMiddlewareAutorizacao({
  permissao: 'gerenciarUsuarios',
  apenasProprioCondominio: true
});

/**
 * Middleware específico para rotas de relatórios
 */
export const middlewareRelatorios = criarMiddlewareAutorizacao({
  permissao: 'visualizarRelatorios',
  apenasProprioCondominio: true
});

/**
 * Middleware específico para configurações do sistema
 */
export const middlewareConfiguracoes = criarMiddlewareAutorizacao({
  permissao: 'configurarSistema'
});
