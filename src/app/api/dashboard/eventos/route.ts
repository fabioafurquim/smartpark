import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';
import { ehAdministradorMestre } from '../../../../lib/auth';

interface Evento {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  data: string;
  icone: string;
  cor: string;
}

/**
 * GET /api/dashboard/eventos
 * Retorna eventos recentes baseados no perfil do usuário
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
    const eventos: Evento[] = [];

    // Buscar locações recentes do usuário
    const locacoesRecentes = await prisma.locacao.findMany({
      where: {
        OR: [
          { locatarioId: usuario.id },
          { proprietarioId: usuario.id }
        ]
      },
      include: {
        vaga: {
          select: {
            numero: true
          }
        },
        locatario: {
          select: {
            nome: true
          }
        },
        proprietario: {
          select: {
            nome: true
          }
        }
      },
      orderBy: { criadoEm: 'desc' },
      take: 5
    });

    // Converter locações em eventos
    for (const locacao of locacoesRecentes) {
      const ehProprietario = locacao.proprietarioId === usuario.id;
      
      let titulo = '';
      let descricao = '';
      let icone = 'car';
      let cor = 'blue';

      switch (locacao.status) {
        case 'PENDENTE':
          if (ehProprietario) {
            titulo = 'Nova solicitação de locação';
            descricao = `${locacao.locatario.nome} quer alugar sua vaga ${locacao.vaga.numero}`;
            icone = 'alert-circle';
            cor = 'yellow';
          } else {
            titulo = 'Locação aguardando aprovação';
            descricao = `Sua solicitação para vaga ${locacao.vaga.numero} está pendente`;
            icone = 'clock';
            cor = 'yellow';
          }
          break;
        case 'ATIVA':
          if (ehProprietario) {
            titulo = 'Locação ativa';
            descricao = `Sua vaga ${locacao.vaga.numero} está alugada para ${locacao.locatario.nome}`;
            icone = 'check-circle';
            cor = 'green';
          } else {
            titulo = 'Locação aprovada';
            descricao = `Sua locação da vaga ${locacao.vaga.numero} foi aprovada`;
            icone = 'check-circle';
            cor = 'green';
          }
          break;
        case 'REJEITADA':
          titulo = 'Locação rejeitada';
          descricao = `A locação da vaga ${locacao.vaga.numero} foi rejeitada`;
          icone = 'x-circle';
          cor = 'red';
          break;
        case 'FINALIZADA':
          titulo = 'Locação finalizada';
          descricao = `A locação da vaga ${locacao.vaga.numero} foi concluída`;
          icone = 'check';
          cor = 'blue';
          break;
      }

      eventos.push({
        id: locacao.id,
        tipo: 'locacao',
        titulo,
        descricao,
        data: locacao.criadoEm.toISOString(),
        icone,
        cor
      });
    }

    // Se for admin mestre, adicionar eventos globais
    if (ehAdministradorMestre(usuario)) {
      // Buscar novos usuários
      const novosUsuarios = await prisma.usuario.findMany({
        orderBy: { criadoEm: 'desc' },
        take: 3,
        select: {
          id: true,
          nome: true,
          criadoEm: true
        }
      });

      for (const novoUsuario of novosUsuarios) {
        eventos.push({
          id: `usuario-${novoUsuario.id}`,
          tipo: 'usuario',
          titulo: 'Novo usuário cadastrado',
          descricao: `${novoUsuario.nome} se cadastrou no sistema`,
          data: novoUsuario.criadoEm.toISOString(),
          icone: 'user-plus',
          cor: 'purple'
        });
      }

      // Buscar novas vagas
      const novasVagas = await prisma.vaga.findMany({
        orderBy: { criadoEm: 'desc' },
        take: 3,
        include: {
          condominio: {
            select: { nome: true }
          }
        }
      });

      for (const vaga of novasVagas) {
        eventos.push({
          id: `vaga-${vaga.id}`,
          tipo: 'vaga',
          titulo: 'Nova vaga cadastrada',
          descricao: `Vaga ${vaga.numero} criada em ${vaga.condominio.nome}`,
          data: vaga.criadoEm.toISOString(),
          icone: 'car',
          cor: 'blue'
        });
      }
    }

    // Ordenar por data
    eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // Limitar a 10 eventos
    return NextResponse.json(eventos.slice(0, 10));
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
