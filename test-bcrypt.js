const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Função para testar senhas
async function testarSenhas() {
  // Primeiro, obter o hash real do banco
  const usuario = await prisma.usuario.findUnique({
    where: { email: 'fabiofurquim@gmail.com' }
  });
  
  if (!usuario) {
    console.log('❌ Usuário não encontrado');
    return;
  }
  
  const hashDoBanco = usuario.senha;
  const senhasParaTestar = [
    '123456',
    'admin123', 
    'password',
    'smartpark',
    'temp123',
    'Fabio123',
    'fabio123',
    'fabiofurquim',
    'FabioFurquim',
    'Fabio@123',
    'fabio@123'
  ];
  
  console.log('🔍 Testando senhas comuns...');
  console.log(`📝 Hash: ${hashDoBanco}`);
  
  for (const senha of senhasParaTestar) {
    try {
      const match = await bcrypt.compare(senha, hashDoBanco);
      console.log(`${match ? '✅' : '❌'} "${senha}" - ${match ? 'CORRETA' : 'incorreta'}`);
      
      if (match) {
        console.log(`\n🎉 SENHA ENCONTRADA: "${senha}"`);
        break;
      }
    } catch (error) {
      console.log(`❌ Erro ao testar "${senha}": ${error.message}`);
    }
  }
  
  // Testar criação de novo hash
  console.log('\n🔧 Testando criação de hash...');
  const novaSenha = 'teste123';
  const novoHash = await bcrypt.hash(novaSenha, 12);
  console.log(`Senha: "${novaSenha}"`);
  console.log(`Hash: ${novoHash}`);
  
  const testeNovoHash = await bcrypt.compare(novaSenha, novoHash);
  console.log(`Teste: ${testeNovoHash ? '✅ OK' : '❌ FALHOU'}`);
  
  await prisma.$disconnect();
}

testarSenhas().catch(console.error);