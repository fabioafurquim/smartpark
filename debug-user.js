const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function debugUser() {
  try {
    console.log('🔍 Verificando usuários no banco...');
    
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        ativo: true,
        criadoEm: true
      }
    });
    
    console.log(`📊 Total de usuários: ${usuarios.length}`);
    
    usuarios.forEach((usuario, index) => {
      console.log(`\n👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${usuario.id}`);
      console.log(`   Nome: ${usuario.nome}`);
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Ativo: ${usuario.ativo}`);
      console.log(`   Criado em: ${usuario.criadoEm}`);
      console.log(`   Hash da senha: ${usuario.senha.substring(0, 20)}...`);
      
      // Testar algumas senhas comuns
      const senhasParaTestar = ['123456', 'admin123', 'password', 'smartpark'];
      
      senhasParaTestar.forEach(async (senha) => {
        const match = await bcrypt.compare(senha, usuario.senha);
        if (match) {
          console.log(`   ✅ Senha encontrada: ${senha}`);
        }
      });
    });
    
    // Verificar configuração do sistema
    const config = await prisma.configuracaoSistema.findFirst();
    console.log(`\n⚙️ Sistema configurado: ${config ? 'Sim' : 'Não'}`);
    if (config) {
      console.log(`   Admin configurado: ${config.administradorMestreConfigurado}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUser();