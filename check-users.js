const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuários no sistema...');
    
    const usuarios = await prisma.usuario.findMany({
      include: {
        perfis: {
          include: {
            condominio: {
              select: {
                nome: true,
                codigoUnico: true
              }
            }
          }
        }
      }
    });
    
    console.log(`📊 Total de usuários: ${usuarios.length}`);
    
    usuarios.forEach((usuario, index) => {
      console.log(`\n👤 Usuário ${index + 1}:`);
      console.log(`   Nome: ${usuario.nome}`);
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Ativo: ${usuario.ativo}`);
      console.log(`   Perfis: ${usuario.perfis.length}`);
      
      usuario.perfis.forEach((perfil, pIndex) => {
        console.log(`     Perfil ${pIndex + 1}: ${perfil.tipo} - ${perfil.condominio.nome}`);
      });
    });
    
    // Verificar especificamente o admin
    const admin = await prisma.usuario.findUnique({
      where: { email: 'admin@smartpark.com' },
      include: {
        perfis: {
          include: {
            condominio: true
          }
        }
      }
    });
    
    if (admin) {
      console.log('\n✅ USUÁRIO ADMIN ENCONTRADO!');
      console.log('📧 Email: admin@smartpark.com');
      console.log('🔑 Senha: admin123');
      console.log(`👤 Nome: ${admin.nome}`);
      console.log(`🏢 Perfis: ${admin.perfis.map(p => p.tipo).join(', ')}`);
    } else {
      console.log('\n❌ Usuário admin não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();