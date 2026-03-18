export const CODIGO_CONDOMINIO_LENGTH = 6;

const CARACTERES_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function gerarCodigoCondominio(): string {
  let codigo = '';

  for (let index = 0; index < CODIGO_CONDOMINIO_LENGTH; index += 1) {
    const posicao = Math.floor(Math.random() * CARACTERES_CODIGO.length);
    codigo += CARACTERES_CODIGO.charAt(posicao);
  }

  return codigo;
}
