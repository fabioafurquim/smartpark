const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CODIGO_LENGTH = 6;
const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function gerarCodigo(usados) {
  let codigo = '';

  do {
    codigo = '';

    for (let index = 0; index < CODIGO_LENGTH; index += 1) {
      const posicao = Math.floor(Math.random() * CARACTERES.length);
      codigo += CARACTERES.charAt(posicao);
    }
  } while (usados.has(codigo));

  usados.add(codigo);
  return codigo;
}

async function main() {
  const aplicar = process.argv.includes('--apply');
  const condominios = await prisma.condominio.findMany({
    select: {
      id: true,
      nome: true,
      codigoUnico: true,
    },
    orderBy: {
      nome: 'asc',
    },
  });

  const usados = new Set();
  const atualizacoes = condominios.map((condominio) => ({
    id: condominio.id,
    nome: condominio.nome,
    codigoAtual: condominio.codigoUnico,
    novoCodigo: gerarCodigo(usados),
  }));

  console.table(
    atualizacoes.map((item) => ({
      nome: item.nome,
      atual: item.codigoAtual,
      novo: item.novoCodigo,
    }))
  );

  if (!aplicar) {
    console.log('\nModo dry-run. Use --apply para atualizar os codigos.');
    return;
  }

  await prisma.$transaction(
    atualizacoes.map((item) =>
      prisma.condominio.update({
        where: {
          id: item.id,
        },
        data: {
          codigoUnico: item.novoCodigo,
        },
      })
    )
  );

  console.log(`\n${atualizacoes.length} condominios atualizados com sucesso.`);
}

main()
  .catch((error) => {
    console.error('Erro ao atualizar codigos dos condominios:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
