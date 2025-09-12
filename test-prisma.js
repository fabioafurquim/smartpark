const { PrismaClient } = require('@prisma/client');

async function testPrisma() {
  try {
    const prisma = new PrismaClient();
    console.log('Prisma Client inicializado com sucesso');
    
    // Teste simples de conexão
    await prisma.$connect();
    console.log('Conexão com banco de dados estabelecida');
    
    await prisma.$disconnect();
    console.log('Teste concluído com sucesso');
  } catch (error) {
    console.error('Erro no teste do Prisma:', error.message);
    process.exit(1);
  }
}

testPrisma();