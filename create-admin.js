const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Criando usuário administrador...');
    
    // Verificar se já existe
    const existingAdmin = await prisma.usuario.findUnique({
      where: { email: 'admin@smartpark.com' }
    });
    
    if (existingAdmin) {
      console.log('✅ Usuário admin já existe!');
      console.log('Email: admin@smartpark.com');
      console.log('Senha: admin123');
      return;
    }
    
    // Hash da senha
    const senhaHash = await bcrypt.hash('admin123', 12);
    
    // Verificar se existe condomínio
    let condominio = await prisma.condominio.findFirst();
    
    if (!condominio) {
      console.log('📋 Criando condomínio do sistema...');
      condominio = await prisma.condominio.create({
        data: {
          nome: 'Sistema SmartPark',
          endereco: 'Sistema Administrativo',
          codigoUnico: 'ADMIN-SYSTEM'
        }
      });
    }
    
    // Criar usuário
    const novoAdmin = await prisma.usuario.create({
      data: {
        nome: 'Administrador Mestre',
        email: 'admin@smartpark.com',
        senha: senhaHash,
        ativo: true
      }
    });
    
    // Criar perfil de administrador
    await prisma.perfilUsuario.create({
      data: {
        usuarioId: novoAdmin.id,
        condominioId: condominio.id,
        tipo: 'administrador_mestre',
        ativo: true
      }
    });
    
    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('Email: admin@smartpark.com');
    console.log('Senha: admin123');
    console.log('⚠️  Altere a senha após o primeiro login!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();