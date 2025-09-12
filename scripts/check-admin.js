const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAndCreateAdmin() {
  try {
    // Verificar se existe um usuário administrador mestre
    const adminUser = await prisma.usuario.findFirst({
      where: {
        perfis: {
          some: {
            tipo: 'ADMINISTRADOR_MESTRE'
          }
        }
      },
      include: {
        perfis: true
      }
    });

    if (adminUser) {
      console.log('✅ Usuário administrador encontrado:');
      console.log(`Email: ${adminUser.email}`);
      console.log(`Nome: ${adminUser.nome}`);
      return;
    }

    console.log('❌ Nenhum usuário administrador encontrado.');
    console.log('🔧 Criando usuário administrador padrão...');

    // Criar usuário administrador padrão
    const senhaHash = await bcrypt.hash('admin123', 12);
    
    // Primeiro, verificar se existe um condomínio para associar o perfil
    let condominio = await prisma.condominio.findFirst();
    
    if (!condominio) {
      // Criar um condomínio temporário para o admin mestre
      condominio = await prisma.condominio.create({
        data: {
          nome: 'Sistema SmartPark',
          endereco: 'Endereço do Sistema',
          codigoUnico: 'ADMIN-SYSTEM'
        }
      });
    }
    
    const novoAdmin = await prisma.usuario.create({
      data: {
        nome: 'Administrador Mestre',
        email: 'admin@smartpark.com',
        senha: senhaHash,
        ativo: true,
        perfis: {
          create: {
            tipo: 'ADMINISTRADOR_MESTRE',
            condominioId: condominio.id,
            ativo: true
          }
        }
      },
      include: {
        perfis: true
      }
    });

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log(`Email: ${novoAdmin.email}`);
    console.log(`Senha: admin123`);
    console.log('⚠️  Altere a senha após o primeiro login!');

    // Marcar sistema como configurado
    await prisma.configuracaoSistema.upsert({
      where: { id: 'default' },
      update: { administradorMestreConfigurado: true },
      create: {
        id: 'default',
        administradorMestreConfigurado: true
      }
    });

    console.log('✅ Sistema marcado como configurado.');

  } catch (error) {
    console.error('❌ Erro ao verificar/criar administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateAdmin();