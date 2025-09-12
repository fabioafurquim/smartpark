const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('🔍 Testando login do usuário admin...');
    
    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'admin@smartpark.com' },
      include: {
        perfis: {
          include: {
            condominio: true
          }
        }
      }
    });
    
    if (!usuario) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log(`👤 Usuário encontrado: ${usuario.nome}`);
    console.log(`📧 Email: ${usuario.email}`);
    console.log(`✅ Ativo: ${usuario.ativo}`);
    console.log(`🔑 Hash da senha: ${usuario.senha}`);
    
    // Testar senha
    const senhaParaTestar = 'admin123';
    console.log(`\n🔐 Testando senha: "${senhaParaTestar}"`);
    
    const senhaValida = await bcrypt.compare(senhaParaTestar, usuario.senha);
    
    if (senhaValida) {
      console.log('✅ SENHA CORRETA!');
      console.log('🎉 O login deveria funcionar normalmente.');
    } else {
      console.log('❌ SENHA INCORRETA!');
      console.log('🔧 Vou recriar o hash da senha...');
      
      // Recriar hash
      const novoHash = await bcrypt.hash('admin123', 12);
      
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { senha: novoHash }
      });
      
      console.log('✅ Senha atualizada com sucesso!');
      console.log('🔑 Tente fazer login novamente com: admin123');
    }
    
    // Verificar perfis
    console.log(`\n👥 Perfis do usuário (${usuario.perfis.length}):`);
    usuario.perfis.forEach((perfil, index) => {
      console.log(`   ${index + 1}. Tipo: ${perfil.tipo}`);
      console.log(`      Condomínio: ${perfil.condominio.nome}`);
      console.log(`      Ativo: ${perfil.ativo}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();