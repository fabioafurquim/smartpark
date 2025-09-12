const http = require('http');

async function testCondominiosAPI() {
  console.log('🔍 Testando API de condomínios via HTTP...');
  
  // Primeiro, fazer login para obter o token de sessão
  const loginData = JSON.stringify({
    email: 'admin@smartpark.com',
    senha: 'admin123'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/callback/credentials',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };
  
  console.log('🔐 Fazendo login...');
  
  const loginReq = http.request(loginOptions, (loginRes) => {
    console.log(`Status do login: ${loginRes.statusCode}`);
    console.log('Headers do login:', loginRes.headers);
    
    let loginBody = '';
    loginRes.on('data', (chunk) => {
      loginBody += chunk;
    });
    
    loginRes.on('end', () => {
      console.log('Resposta do login:', loginBody);
      
      // Extrair cookies de sessão
      const cookies = loginRes.headers['set-cookie'];
      console.log('Cookies recebidos:', cookies);
      
      // Agora testar a API de condomínios
      const condominiosOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/condominios',
        method: 'GET',
        headers: {
          'Cookie': cookies ? cookies.join('; ') : ''
        }
      };
      
      console.log('\n📋 Testando API de condomínios...');
      
      const condominiosReq = http.request(condominiosOptions, (condominiosRes) => {
        console.log(`Status da API de condomínios: ${condominiosRes.statusCode}`);
        console.log('Headers da resposta:', condominiosRes.headers);
        
        let condominiosBody = '';
        condominiosRes.on('data', (chunk) => {
          condominiosBody += chunk;
        });
        
        condominiosRes.on('end', () => {
          console.log('Resposta da API de condomínios:', condominiosBody);
          
          if (condominiosRes.statusCode === 200) {
            console.log('✅ API de condomínios funcionando!');
          } else {
            console.log('❌ Erro na API de condomínios');
          }
        });
      });
      
      condominiosReq.on('error', (err) => {
        console.error('Erro na requisição de condomínios:', err);
      });
      
      condominiosReq.end();
    });
  });
  
  loginReq.on('error', (err) => {
    console.error('Erro na requisição de login:', err);
  });
  
  loginReq.write(loginData);
  loginReq.end();
}

// Teste simples da API sem autenticação
async function testSimpleAPI() {
  console.log('\n🔍 Testando API de condomínios sem autenticação...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/condominios',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Headers:', res.headers);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log('Resposta:', body);
      
      if (res.statusCode === 401) {
        console.log('✅ API retornando 401 como esperado (não autenticado)');
      } else if (res.statusCode === 400) {
        console.log('❌ API retornando 400 - erro na requisição');
        try {
          const errorData = JSON.parse(body);
          console.log('Detalhes do erro:', errorData);
        } catch (e) {
          console.log('Erro não é JSON válido');
        }
      }
    });
  });
  
  req.on('error', (err) => {
    console.error('Erro na requisição:', err);
  });
  
  req.end();
}

// Executar teste simples primeiro
testSimpleAPI();

// Aguardar um pouco e executar teste com autenticação
setTimeout(() => {
  testCondominiosAPI();
}, 2000);