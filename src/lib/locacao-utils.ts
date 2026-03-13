type TipoLocacao = 'HORA' | 'DIARIA' | 'MENSAL' | 'ANUAL';

interface ValoresLocacao {
  valorHora?: number | null;
  valorDiaria?: number | null;
  valorMensal?: number | null;
  valorAnual?: number | null;
}

export function obterValorBasePorTipo(
  tipoLocacao: TipoLocacao,
  valores: ValoresLocacao
): number | null {
  switch (tipoLocacao) {
    case 'HORA':
      return valores.valorHora ?? null;
    case 'DIARIA':
      return valores.valorDiaria ?? null;
    case 'MENSAL':
      return valores.valorMensal ?? null;
    case 'ANUAL':
      return valores.valorAnual ?? null;
    default:
      return null;
  }
}

export function calcularQuantidadeCobrada(
  tipoLocacao: TipoLocacao,
  dataInicio: Date,
  dataFim: Date
): number {
  const diferencaMs = dataFim.getTime() - dataInicio.getTime();
  const hora = 60 * 60 * 1000;
  const dia = 24 * hora;

  switch (tipoLocacao) {
    case 'HORA':
      return Math.max(1, Math.ceil(diferencaMs / hora));
    case 'DIARIA':
      return Math.max(1, Math.ceil(diferencaMs / dia));
    case 'MENSAL':
      return Math.max(1, Math.ceil(diferencaMs / (30 * dia)));
    case 'ANUAL':
      return Math.max(1, Math.ceil(diferencaMs / (365 * dia)));
    default:
      return 1;
  }
}

export function calcularValorLocacao(
  tipoLocacao: TipoLocacao,
  dataInicio: Date,
  dataFim: Date,
  valores: ValoresLocacao
): number | null {
  const valorBase = obterValorBasePorTipo(tipoLocacao, valores);

  if (valorBase == null) {
    return null;
  }

  const quantidade = calcularQuantidadeCobrada(tipoLocacao, dataInicio, dataFim);
  return Number((valorBase * quantidade).toFixed(2));
}
