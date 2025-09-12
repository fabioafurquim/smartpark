const { PrismaClient } = require('@prisma/client');

async function seedTestData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Iniciando seed de dados de teste...');
    
    // Criar um condomínio de teste
    const condominio = await prisma.condominio.create({
      data: {
        nome: 'Condomínio Teste',
        endereco: 'Rua Teste, 123',
        codigoUnico: 'COND001',
        tipoEstrutura: 'TORRE'
      }
    });
    console.log('Condomínio criado:', condominio.nome);
    
    // Criar uma torre de teste
    const torre = await prisma.torre.create({
      data: {
        nome: 'Torre A',
        tipo: 'TORRE',
        condominioId: condominio.id
      }
    });
    console.log('Torre criada:', torre.nome);
    
    // Criar uma unidade de teste
    const unidade = await prisma.unidade.create({
      data: {
        numero: '101',
        andar: 1,
        tipo: 'APARTAMENTO',
        proprietario: 'João Silva',
        contato: '(11) 99999-9999',
        torreId: torre.id,
        condominioId: condominio.id
      }
    });
    console.log('Unidade criada:', unidade.numero);
    
    // Criar uma vaga de teste
    const vaga = await prisma.vaga.create({
      data: {
        numero: '001',
        tipo: 'COBERTA',
        status: 'OCUPADA',
        unidadeId: unidade.id,
        condominioId: condominio.id
      }
    });
    console.log('Vaga criada:', vaga.numero);
    
    console.log('\nDados de teste criados com sucesso!');
    console.log(`- Condomínio: ${condominio.nome} (ID: ${condominio.id})`);
    console.log(`- Torre: ${torre.nome} (ID: ${torre.id})`);
    console.log(`- Unidade: ${unidade.numero} (ID: ${unidade.id})`);
    console.log(`- Vaga: ${vaga.numero} (ID: ${vaga.id})`);
    
  } catch (error) {
    console.error('Erro ao criar dados de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();