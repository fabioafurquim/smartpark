import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';

/**
 * GET /api/debug/unidades-sem-morador
 * Debug: Listar unidades sem morador associado
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

    // Verificar se é admin mestre
    const ehAdminMestre = usuario.perfis.some(p => p.tipo === 'administrador_mestre');
    if (!ehAdminMestre) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Buscar unidades sem morador
    const unidadesSemMorador = await prisma.unidade.findMany({
      where: {
        usuarioId: null
      },
      include: {
        condominio: {
          select: {
            nome: true
          }
        },
        torre: {
          select: {
            nome: true
          }
        }
      }
    });

    // Buscar unidades com morador
    const unidadesComMorador = await prisma.unidade.findMany({
      where: {
        usuarioId: { not: null }
      },
      include: {
        condominio: {
          select: {
            nome: true
          }
        },
        torre: {
          select: {
            nome: true
          }
        },
        usuario: {
          select: {
            nome: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      totalUnidades: await prisma.unidade.count(),
      unidadesSemMorador: unidadesSemMorador.length,
      unidadesComMorador: unidadesComMorador.length,
      detalhes: {
        sem_morador: unidadesSemMorador,
        com_morador: unidadesComMorador
      }
    });
  } catch (error) {
    console.error('Erro ao buscar unidades:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
