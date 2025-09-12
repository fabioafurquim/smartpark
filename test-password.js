const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testPassword() {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'fabiofurquim@gmail.com' }
    });
    
    if (!usuario) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log(`👤 Testando senha para: ${usuario.nome} (${usuario.email})`);
    
    rl.question('🔑 Digite a senha que você configurou: ', async (senha) => {
      try {
        console.log(`\n🔍 Testando senha: "${senha}"`);
        console.log(`📝 Hash no banco: ${usuario.senha}`);
        
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (senhaValida) {
          console.log('✅ SENHA CORRETA! A autenticação deveria funcionar.');
        } else {
          console.log('❌ SENHA INCORRETA!');
          
          // Vamos testar algumas variações comuns
          console.log('\n🔄 Testando variações...');
          const variacoes = [
            senha.toLowerCase(),
            senha.toUpperCase(),
            senha.trim(),
            senha + ' ',
            ' ' + senha
          ];
          
          for (const variacao of variacoes) {
            const match = await bcrypt.compare(variacao, usuario.senha);
            if (match) {
              console.log(`✅ Senha encontrada com variação: "${variacao}"`);
              break;
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro ao testar senha:', error);
      } finally {
        await prisma.$disconnect();
        rl.close();
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await prisma.$disconnect();
    rl.close();
  }
}

testPassword();