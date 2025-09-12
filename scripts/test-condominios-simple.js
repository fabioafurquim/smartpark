// Teste simples da API de condomínios sem autenticação
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCondominiosSimple() {
  try {
    console.log('🔍 Testando busca de condomínios diretamente no banco...');
    
    // Simular o que a API deveria fazer
    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const where = {}; // Admin mestre pode ver todos
    
    console.log('📊 Executando query no banco...');
    
    const [condominios, total] = await Promise.all([
      prisma.condominio.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          endereco: true,
          cidade: true,
          estado: true,
          cep: true,
          telefone: true,
          email: true,
          ativo: true,
          codigoUnico: true,
          createdAt: true,
        },
      }),
      prisma.condominio.count({ where }),
    ]);
    
    console.log(`✅ Query executada com sucesso!`);
    console.log(`📋 Total de condomínios: ${total}`);
    console.log(`📄 Condomínios na página ${page}:`);
    
    condominios.forEach((cond, index) => {
      console.log(`  ${index + 1}. ${cond.nome} (${cond.id})`);
      console.log(`     - Endereço: ${cond.endereco}`);
      console.log(`     - Cidade: ${cond.cidade}/${cond.estado}`);
      console.log(`     - Ativo: ${cond.ativo}`);
      console.log(`     - Código: ${cond.codigoUnico}`);
      console.log('');
    });
    
    const response = {
      condominios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    
    console.log('📦 Resposta que deveria ser retornada pela API:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCondominiosSimple();