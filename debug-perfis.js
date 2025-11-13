const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarTiposPerfil() {
  try {
    const perfis = await prisma.perfilUsuario.findMany({
      select: { tipo: true }
    });
    
    const tiposUnicos = [...new Set(perfis.map(p => p.tipo))];
    console.log('Tipos de perfil no banco:', tiposUnicos);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarTiposPerfil();