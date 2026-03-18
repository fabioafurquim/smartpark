import { prisma } from '@/lib/prisma';
import { gerarCodigoCondominio } from '@/lib/condominio-codigo';

export async function gerarCodigoCondominioUnico(): Promise<string> {
  const maxTentativas = 25;

  for (let tentativa = 0; tentativa < maxTentativas; tentativa += 1) {
    const codigo = gerarCodigoCondominio();
    const existente = await prisma.condominio.findUnique({
      where: {
        codigoUnico: codigo,
      },
      select: {
        id: true,
      },
    });

    if (!existente) {
      return codigo;
    }
  }

  throw new Error('Nao foi possivel gerar um codigo unico para o condominio');
}
