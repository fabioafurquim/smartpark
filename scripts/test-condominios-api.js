const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testCondominiosAPI() {
  try {
    console.log('🔍 Testando API de condomínios...');
    
    // 1. Verificar se existem condomínios no banco
    const condominios = await prisma.condominio.findMany({
      select: {
        id: true,
        nome: true,
        ativo: true
      }
    });
    
    console.log(`📊 Total de condomínios no banco: ${condominios.length}`);
    condominios.forEach(c => {
      console.log(`  - ${c.nome} (${c.id}) - Ativo: ${c.ativo}`);
    });
    
    // 2. Verificar usuário admin e seus perfis
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
      console.log(`\n👤 Usuário admin encontrado:`);
      console.log(`  - ID: ${admin.id}`);
      console.log(`  - Nome: ${admin.nome}`);
      console.log(`  - Email: ${admin.email}`);
      console.log(`  - Ativo: ${admin.ativo}`);
      console.log(`  - Perfis (${admin.perfis.length}):`);
      
      admin.perfis.forEach(perfil => {
        console.log(`    * ${perfil.tipo} - Condomínio: ${perfil.condominio?.nome || 'N/A'}`);
      });
    } else {
      console.log('❌ Usuário admin não encontrado!');
    }
    
    // 3. Testar se não há condomínios, criar um de teste
    if (condominios.length === 0) {
      console.log('\n🏗️ Criando condomínio de teste...');
      
      const novoCondominio = await prisma.condominio.create({
        data: {
          nome: 'Condomínio Teste',
          endereco: 'Rua Teste, 123',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234-567',
          ativo: true
        }
      });
      
      console.log(`✅ Condomínio criado: ${novoCondominio.nome} (${novoCondominio.id})`);
    }
    
    console.log('\n✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCondominiosAPI();