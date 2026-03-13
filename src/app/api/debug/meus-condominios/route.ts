import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { UsuarioSessao } from '../../../../types';

/**
 * GET /api/debug/meus-condominios
 * Debug: Listar condomínios do usuário logado
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const usuario = session.user as UsuarioSessao;

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      },
      perfis: usuario.perfis.map(p => ({
        id: p.id,
        tipo: p.tipo,
        condominio: {
          id: p.condominioId,
          nome: p.condominio?.nome || 'N/A'
        }
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar condomínios do usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
