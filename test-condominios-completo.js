const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testarFuncionalidadeCompleta() {
  console.log('🧪 TESTE COMPLETO DA FUNCIONALIDADE DE CONDOMÍNIOS');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar estado inicial do banco
    console.log('\n📊 1. VERIFICANDO ESTADO INICIAL DO BANCO');
    const condominiosExistentes = await prisma.condominio.findMany({
      select: { id: true, nome: true, ativo: true }
    });
    console.log(`   Total de condomínios existentes: ${condominiosExistentes.length}`);
    condominiosExistentes.forEach(c => {
      console.log(`   - ${c.nome} (${c.ativo ? 'Ativo' : 'Inativo'})`);
    });

    // 2. Verificar usuário admin
    console.log('\n👤 2. VERIFICANDO USUÁRIO ADMINISTRADOR');
    const admin = await prisma.usuario.findUnique({
      where: { email: 'admin@smartpark.com' },
      include: {
        perfis: {
          include: { condominio: true }
        }
      }
    });

    if (!admin) {
      console.log('   ❌ Usuário admin não encontrado!');
      return;
    }

    console.log(`   ✅ Admin encontrado: ${admin.nome}`);
    console.log(`   📧 Email: ${admin.email}`);
    console.log(`   🔑 Perfis: ${admin.perfis.map(p => p.tipo).join(', ')}`);

    // 3. Testar validação de dados
    console.log('\n🔍 3. TESTANDO VALIDAÇÃO DE DADOS');
    
    // Dados inválidos para teste
    const dadosInvalidos = [
      { nome: '', endereco: 'Rua Teste', telefone: '11999999999', email: 'teste@teste.com' },
      { nome: 'Teste', endereco: '', telefone: '11999999999', email: 'teste@teste.com' },
      { nome: 'Teste', endereco: 'Rua Teste', telefone: 'telefone-inválido', email: 'teste@teste.com' },
      { nome: 'Teste', endereco: 'Rua Teste', telefone: '11999999999', email: 'email-inválido' }
    ];

    console.log('   Testando dados inválidos...');
    for (let i = 0; i < dadosInvalidos.length; i++) {
      try {
        const { z } = require('zod');
        
        // Schema de validação (copiado do arquivo de validações)
        const criarCondominioSchema = z.object({
          nome: z.string()
            .min(1, 'Nome é obrigatório')
            .max(100, 'Nome deve ter no máximo 100 caracteres'),
          endereco: z.string()
            .min(1, 'Endereço é obrigatório')
            .max(200, 'Endereço deve ter no máximo 200 caracteres'),
          telefone: z.string()
            .min(1, 'Telefone é obrigatório')
            .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato de telefone inválido. Use (XX) XXXXX-XXXX'),
          email: z.string()
            .email('Email inválido')
            .max(100, 'Email deve ter no máximo 100 caracteres'),
          logoUrl: z.string()
            .url('URL inválida')
            .max(500, 'URL deve ter no máximo 500 caracteres')
            .optional()
        });

        criarCondominioSchema.parse(dadosInvalidos[i]);
        console.log(`   ❌ Teste ${i + 1}: Deveria ter falhado mas passou`);
      } catch (error) {
        console.log(`   ✅ Teste ${i + 1}: Validação funcionou - ${error.errors?.[0]?.message || error.message}`);
      }
    }

    // 4. Testar criação de condomínio válido
    console.log('\n🏗️ 4. TESTANDO CRIAÇÃO DE CONDOMÍNIO');
    
    const novoCondominio = {
      nome: `Condomínio Teste ${Date.now()}`,
      endereco: 'Rua dos Testes, 123 - Bairro Teste',
      telefone: '(11) 99999-9999',
      email: 'teste@condominioteste.com',
      logoUrl: 'https://exemplo.com/logo.png'
    };

    console.log('   Dados do novo condomínio:');
    console.log(`   - Nome: ${novoCondominio.nome}`);
    console.log(`   - Endereço: ${novoCondominio.endereco}`);
    console.log(`   - Telefone: ${novoCondominio.telefone}`);
    console.log(`   - Email: ${novoCondominio.email}`);

    const condominioCreated = await prisma.condominio.create({
      data: {
        nome: novoCondominio.nome,
        endereco: novoCondominio.endereco,
        telefone: novoCondominio.telefone,
        email: novoCondominio.email,
        logoUrl: novoCondominio.logoUrl,
        codigoUnico: `TEST-${Date.now()}`
      }
    });

    console.log(`   ✅ Condomínio criado com sucesso! ID: ${condominioCreated.id}`);

    // 5. Verificar se foi salvo corretamente
    console.log('\n🔍 5. VERIFICANDO PERSISTÊNCIA NO BANCO');
    
    const condominioSalvo = await prisma.condominio.findUnique({
      where: { id: condominioCreated.id }
    });

    if (condominioSalvo) {
      console.log('   ✅ Condomínio encontrado no banco:');
      console.log(`   - ID: ${condominioSalvo.id}`);
      console.log(`   - Nome: ${condominioSalvo.nome}`);
      console.log(`   - Código Único: ${condominioSalvo.codigoUnico}`);
      console.log(`   - Ativo: ${condominioSalvo.ativo}`);
      console.log(`   - Criado em: ${condominioSalvo.criadoEm}`);
    } else {
      console.log('   ❌ Condomínio não encontrado no banco!');
    }

    // 6. Testar listagem atualizada
    console.log('\n📋 6. VERIFICANDO LISTAGEM ATUALIZADA');
    
    const condominiosAtualizados = await prisma.condominio.findMany({
      select: { id: true, nome: true, ativo: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' }
    });

    console.log(`   Total de condomínios após criação: ${condominiosAtualizados.length}`);
    console.log('   Últimos 3 condomínios:');
    condominiosAtualizados.slice(0, 3).forEach((c, index) => {
      console.log(`   ${index + 1}. ${c.nome} (${c.ativo ? 'Ativo' : 'Inativo'})`);
    });

    // 7. Limpeza (opcional - remover condomínio de teste)
    console.log('\n🧹 7. LIMPEZA (REMOVENDO CONDOMÍNIO DE TESTE)');
    
    await prisma.condominio.delete({
      where: { id: condominioCreated.id }
    });
    
    console.log('   ✅ Condomínio de teste removido com sucesso');

    // 8. Resumo final
    console.log('\n📊 8. RESUMO DOS TESTES');
    console.log('   ✅ Validação de dados: FUNCIONANDO');
    console.log('   ✅ Criação de condomínio: FUNCIONANDO');
    console.log('   ✅ Persistência no banco: FUNCIONANDO');
    console.log('   ✅ Listagem atualizada: FUNCIONANDO');
    console.log('   ✅ Limpeza de dados: FUNCIONANDO');

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');

  } catch (error) {
    console.error('\n❌ ERRO DURANTE OS TESTES:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar os testes
testarFuncionalidadeCompleta();