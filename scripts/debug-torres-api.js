const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTorresAPI() {
  try {
    console.log('🔍 Debugando API de Torres...\n');

    // 1. Verificar usuário admin
    console.log('1. Verificando usuário admin...');
    const admin = await prisma.usuario.findUnique({
      where: { email: 'admin@smartpark.com' },
      include: {
        perfis: {
          where: { ativo: true },
          include: {
            condominio: {
              select: {
                id: true,
                nome: true,
                codigoUnico: true,
              },
            },
          },
        },
      },
    });

    if (!admin) {
      console.log('❌ Usuário admin não encontrado!');
      return;
    }

    console.log('✅ Usuário admin encontrado:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Perfis: ${admin.perfis.length}`);
    
    admin.perfis.forEach((perfil, index) => {
      console.log(`   Perfil ${index + 1}:`);
      console.log(`     Tipo: ${perfil.tipo}`);
      console.log(`     Condomínio: ${perfil.condominio.nome} (${perfil.condominio.id})`);
      console.log(`     Permissões: ${JSON.stringify(perfil.permissoes)}`);
    });

    // 2. Verificar condomínios
    console.log('\n2. Verificando condomínios...');
    const condominios = await prisma.condominio.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        codigoUnico: true,
      },
    });

    console.log(`✅ Condomínios encontrados: ${condominios.length}`);
    condominios.forEach((cond, index) => {
      console.log(`   ${index + 1}. ${cond.nome} (${cond.id})`);
    });

    // 3. Verificar torres existentes
    console.log('\n3. Verificando torres existentes...');
    const torres = await prisma.torre.findMany({
      include: {
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    console.log(`✅ Torres encontradas: ${torres.length}`);
    torres.forEach((torre, index) => {
      console.log(`   ${index + 1}. ${torre.nome} (${torre.tipo}) - ${torre.condominio.nome}`);
    });

    // 4. Testar criação de torre
    console.log('\n4. Testando criação de torre...');
    
    if (condominios.length === 0) {
      console.log('❌ Nenhum condomínio encontrado para teste!');
      return;
    }

    const primeiroCondominio = condominios[0];
    console.log(`   Usando condomínio: ${primeiroCondominio.nome}`);

    // Verificar se já existe torre de teste
    const torreExistente = await prisma.torre.findFirst({
      where: {
        nome: 'Torre Teste Debug',
        condominioId: primeiroCondominio.id,
      },
    });

    if (torreExistente) {
      console.log('   Torre de teste já existe, removendo...');
      await prisma.torre.delete({
        where: { id: torreExistente.id },
      });
    }

    // Criar torre de teste
    const novaTorre = await prisma.torre.create({
      data: {
        nome: 'Torre Teste Debug',
        tipo: 'TORRE',
        condominioId: primeiroCondominio.id,
      },
      include: {
        condominio: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    console.log('✅ Torre criada com sucesso:');
    console.log(`   ID: ${novaTorre.id}`);
    console.log(`   Nome: ${novaTorre.nome}`);
    console.log(`   Tipo: ${novaTorre.tipo}`);
    console.log(`   Condomínio: ${novaTorre.condominio.nome}`);

    // Limpar torre de teste
    await prisma.torre.delete({
      where: { id: novaTorre.id },
    });
    console.log('   Torre de teste removida.');

    console.log('\n✅ Debug concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTorresAPI();