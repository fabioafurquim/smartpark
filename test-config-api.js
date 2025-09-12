const fetch = require('node-fetch');

// Dados de teste para configuração inicial
const dadosConfiguracao = {
  nomeEmpresa: "Empresa Teste",
  emailContato: "contato@teste.com",
  telefoneContato: "(11) 99999-9999",
  nomeAdmin: "Admin Teste",
  emailAdmin: "admin@teste.com",
  senhaAdmin: "123456",
  confirmarSenhaAdmin: "123456"
};

async function testarAPI() {
  console.log('🔍 Testando API de Configuração Inicial...');
  
  try {
    // Teste 1: Verificar status da configuração (GET)
    console.log('\n1. Testando GET /api/configuracao-inicial');
    const responseGet = await fetch('http://localhost:3001/api/configuracao-inicial');
    console.log('Status:', responseGet.status);
    
    if (responseGet.ok) {
      const dataGet = await responseGet.json();
      console.log('Resposta GET:', JSON.stringify(dataGet, null, 2));
    } else {
      console.log('Erro GET:', responseGet.statusText);
      const errorText = await responseGet.text();
      console.log('Detalhes do erro:', errorText);
    }
    
    // Teste 2: Enviar configuração inicial (POST)
    console.log('\n2. Testando POST /api/configuracao-inicial');
    const responsePost = await fetch('http://localhost:3001/api/configuracao-inicial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dadosConfiguracao),
    });
    
    console.log('Status POST:', responsePost.status);
    
    if (responsePost.ok) {
      const dataPost = await responsePost.json();
      console.log('✅ Configuração criada com sucesso!');
      console.log('Resposta POST:', JSON.stringify(dataPost, null, 2));
    } else {
      console.log('❌ Erro no POST');
      const errorPost = await responsePost.json().catch(() => null);
      if (errorPost) {
        console.log('Erro estruturado:', JSON.stringify(errorPost, null, 2));
      } else {
        const errorText = await responsePost.text();
        console.log('Erro como texto:', errorText);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.log('\n🔧 Possíveis causas:');
    console.log('- Servidor não está rodando na porta 3001');
    console.log('- Problema de conectividade');
    console.log('- Erro no código da API');
  }
}

// Executar teste
testarAPI();