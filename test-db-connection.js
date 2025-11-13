const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testando conexão com o banco de dados...');
    
    // Teste simples de conexão
    await prisma.$connect();
    console.log('✅ Conexão com o banco estabelecida com sucesso!');
    
    // Verificar se existem usuários
    const userCount = await prisma.usuario.count();
    console.log(`📊 Total de usuários no banco: ${userCount}`);
    
    // Listar usuários existentes
    if (userCount > 0) {
      const users = await prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          ativo: true
        }
      });
      
      console.log('👥 Usuários encontrados:');
      users.forEach(user => {
        console.log(`  - ${user.nome} (${user.email}) - ${user.ativo ? 'Ativo' : 'Inativo'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco:', error.message);
    console.error('Detalhes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();