export const MODALIDADES_CONDOMINIO = ['EMPRESTIMO', 'LOCACAO', 'HIBRIDO'] as const;

export type ModalidadeCondominio = (typeof MODALIDADES_CONDOMINIO)[number];

export function getModalidadeCondominioLabel(modalidade: ModalidadeCondominio): string {
  switch (modalidade) {
    case 'EMPRESTIMO':
      return 'Somente emprestimos de vagas';
    case 'LOCACAO':
      return 'Locacao de vagas';
    case 'HIBRIDO':
      return 'Hibrido';
    default:
      return modalidade;
  }
}

export function condominioUsaEmprestimo(modalidade: ModalidadeCondominio): boolean {
  return modalidade === 'EMPRESTIMO' || modalidade === 'HIBRIDO';
}

export function condominioUsaLocacao(modalidade: ModalidadeCondominio): boolean {
  return modalidade === 'LOCACAO' || modalidade === 'HIBRIDO';
}
