const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAdminProfile() {
  try {
    console.log('🔧 Corrigindo perfil do administrador...');
    
    // Buscar o usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'fabiofurquim@gmail.com' },
      include: { perfis: true }
    });
    
    if (!usuario) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log(`👤 Usuário encontrado: ${usuario.nome}`);
    
    // Verificar se já tem perfil
    if (usuario.perfis.length > 0) {
      console.log('✅ Usuário já tem perfis:');
      usuario.perfis.forEach(perfil => {
        console.log(`   - ${perfil.tipo} (${perfil.ativo ? 'ativo' : 'inativo'})`);
      });
      return;
    }
    
    // Verificar se existe o condomínio mestre
    let condominioMestre = await prisma.condominio.findUnique({
      where: { codigoUnico: 'ADMIN_MASTER' }
    });
    
    if (!condominioMestre) {
      console.log('🏢 Criando condomínio mestre...');
      condominioMestre = await prisma.condominio.create({
        data: {
          nome: 'Sistema - Administração',
          endereco: 'Sistema',
          codigoUnico: 'ADMIN_MASTER',
          ativo: true,
        },
      });
      console.log(`✅ Condomínio criado: ${condominioMestre.nome}`);
    } else {
      console.log(`🏢 Condomínio mestre já existe: ${condominioMestre.nome}`);
    }
    
    // Criar perfil de administrador mestre
    console.log('👑 Criando perfil de administrador mestre...');
    const perfil = await prisma.perfilUsuario.create({
      data: {
        usuarioId: usuario.id,
        condominioId: condominioMestre.id,
        tipo: 'administrador_mestre',
        ativo: true,
      },
    });
    
    console.log(`✅ Perfil criado: ${perfil.tipo}`);
    console.log('🎉 Correção concluída! O usuário agora pode fazer login.');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminProfile();