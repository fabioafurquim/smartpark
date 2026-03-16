import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ehAdministradorMestre } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { UsuarioSessao } from '../../../../types';

interface Evento {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  data: string;
  icone: string;
  cor: string;
}

function mapearVisualEvento(tipo: string) {
  switch (tipo) {
    case 'SOLICITACAO_CRIADA':
      return { icone: 'alert-circle', cor: 'yellow' };
    case 'LOCACAO_APROVADA':
      return { icone: 'check-circle', cor: 'green' };
    case 'LOCACAO_REJEITADA':
      return { icone: 'x-circle', cor: 'red' };
    case 'STATUS_FINALIZADA':
      return { icone: 'check-circle', cor: 'blue' };
    case 'STATUS_CANCELADA':
      return { icone: 'x-circle', cor: 'red' };
    case 'ENTRADA_PORTARIA':
      return { icone: 'car', cor: 'green' };
    case 'SAIDA_PORTARIA':
      return { icone: 'car', cor: 'blue' };
    default:
      return { icone: 'calendar', cor: 'blue' };
  }
}

/**
 * GET /api/dashboard/eventos
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const usuario = session.user as UsuarioSessao;
    const eventos: Evento[] = [];

    const where = ehAdministradorMestre(usuario)
      ? {}
      : {
          OR: [
            { locacao: { locatarioId: usuario.id } },
            { locacao: { proprietarioId: usuario.id } },
            {
              locacao: {
                vaga: {
                  condominioId: {
                    in: usuario.perfis.map((perfil) => perfil.condominioId),
                  },
                },
              },
            },
          ],
        };

    const eventosLocacao = await prisma.locacaoEvento.findMany({
      where,
      include: {
        locacao: {
          include: {
            vaga: {
              select: {
                numero: true,
                condominio: {
                  select: {
                    nome: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
      take: 8,
    });

    for (const evento of eventosLocacao) {
      const visual = mapearVisualEvento(evento.tipo);
      eventos.push({
        id: evento.id,
        tipo: 'locacao',
        titulo: evento.titulo,
        descricao:
          evento.descricao ||
          `${evento.locacao.vaga.condominio.nome} • vaga ${evento.locacao.vaga.numero}`,
        data: evento.criadoEm.toISOString(),
        icone: visual.icone,
        cor: visual.cor,
      });
    }

    if (ehAdministradorMestre(usuario)) {
      const novosUsuarios = await prisma.usuario.findMany({
        orderBy: { criadoEm: 'desc' },
        take: 2,
        select: {
          id: true,
          nome: true,
          criadoEm: true,
        },
      });

      for (const novoUsuario of novosUsuarios) {
        eventos.push({
          id: `usuario-${novoUsuario.id}`,
          tipo: 'usuario',
          titulo: 'Novo usuário cadastrado',
          descricao: `${novoUsuario.nome} entrou no sistema`,
          data: novoUsuario.criadoEm.toISOString(),
          icone: 'user-plus',
          cor: 'purple',
        });
      }
    }

    eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return NextResponse.json(eventos.slice(0, 10));
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
