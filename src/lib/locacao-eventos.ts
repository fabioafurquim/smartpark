import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

type EventoWriter = Pick<Prisma.TransactionClient, 'locacaoEvento'> | typeof prisma;

interface RegistrarEventoParams {
  locacaoId: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  usuarioId?: string | null;
}

export async function registrarEventoLocacao(
  db: EventoWriter,
  params: RegistrarEventoParams
) {
  return db.locacaoEvento.create({
    data: {
      locacaoId: params.locacaoId,
      tipo: params.tipo,
      titulo: params.titulo,
      descricao: params.descricao,
      usuarioId: params.usuarioId ?? null,
    },
  });
}

export function getStatusLocacaoLabel(status: string) {
  switch (status) {
    case 'PENDENTE':
      return 'Registro pendente';
    case 'ATIVA':
      return 'Uso ativo';
    case 'REJEITADA':
      return 'Registro recusado';
    case 'CANCELADA':
      return 'Uso cancelado';
    case 'FINALIZADA':
      return 'Uso finalizado';
    default:
      return status;
  }
}
