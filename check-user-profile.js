const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserProfile() {
  try {
    console.log('🔍 Verificando usuário e perfis...');
    
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'fabiofurquim@gmail.com' },
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
    
    console.log(`👤 Usuário: ${usuario.nome}`);
    console.log(`📧 Email: ${usuario.email}`);
    console.log(`✅ Ativo: ${usuario.ativo}`);
    console.log(`📅 Criado em: ${usuario.criadoEm}`);
    console.log(`🔑 Hash da senha: ${usuario.senha.substring(0, 30)}...`);
    console.log(`📊 Total de perfis: ${usuario.perfis.length}`);
    
    if (usuario.perfis.length === 0) {
      console.log('⚠️  PROBLEMA: Usuário não tem perfis!');
      console.log('🔧 Criando perfil de administrador mestre...');
      
      const perfil = await prisma.perfilUsuario.create({
        data: {
          usuarioId: usuario.id,
          tipo: 'administrador_mestre',
          ativo: true
        }
      });
      
      console.log(`✅ Perfil criado: ${perfil.id} - ${perfil.tipo}`);
    } else {
      usuario.perfis.forEach((perfil, index) => {
        console.log(`\n📋 Perfil ${index + 1}:`);
        console.log(`   ID: ${perfil.id}`);
        console.log(`   Tipo: ${perfil.tipo}`);
        console.log(`   Ativo: ${perfil.ativo}`);
        console.log(`   Condomínio: ${perfil.condominio ? perfil.condominio.nome : 'Nenhum'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserProfile();