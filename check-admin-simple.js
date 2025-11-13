const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
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
      console.log('✅ Admin encontrado:');
      console.log(`ID: ${admin.id}`);
      console.log(`Nome: ${admin.nome}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Ativo: ${admin.ativo}`);
      console.log('Perfis:');
      admin.perfis.forEach(perfil => {
        console.log(`  - ${perfil.tipo} (Condomínio: ${perfil.condominio?.nome || 'N/A'})`);
      });
    } else {
      console.log('❌ Admin não encontrado');
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();