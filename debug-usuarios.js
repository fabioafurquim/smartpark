const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarUsuarios() {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: {
        perfis: {
          include: {
            condominio: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });
    
    console.log('Total de usuários:', usuarios.length);
    usuarios.forEach((usuario, index) => {
      console.log(`\nUsuário ${index + 1}:`);
      console.log('- ID:', usuario.id);
      console.log('- Nome:', usuario.nome);
      console.log('- Email:', usuario.email);
      console.log('- Perfis:', usuario.perfis ? usuario.perfis.length : 'undefined');
      if (usuario.perfis) {
        usuario.perfis.forEach((perfil, pIndex) => {
          console.log(`  Perfil ${pIndex + 1}: ${perfil.tipo} (Ativo: ${perfil.ativo})`);
        });
      }
    });
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarUsuarios();