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
      return 'Aguardando aprovação';
    case 'ATIVA':
      return 'Locação ativa';
    case 'REJEITADA':
      return 'Solicitação rejeitada';
    case 'CANCELADA':
      return 'Locação cancelada';
    case 'FINALIZADA':
      return 'Locação finalizada';
    default:
      return status;
  }
}

export function getStatusPagamentoLocacaoLabel(status: string) {
  switch (status) {
    case 'PENDENTE':
      return 'Pagamento previsto fora do app';
    case 'CONFIRMADO':
      return 'Pagamento confirmado';
    case 'CANCELADO':
      return 'Pagamento cancelado';
    case 'REEMBOLSADO':
      return 'Pagamento reembolsado';
    default:
      return status;
  }
}
