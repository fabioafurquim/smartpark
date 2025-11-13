# 🧪 Guia de Teste Manual - Frontend de Condomínios

## 📋 Pré-requisitos
- Servidor rodando em `http://localhost:3000`
- Usuário admin: `admin@smartpark.com` / `admin123`

## 🔍 Roteiro de Testes

### 1. Teste de Autenticação
1. Acesse `http://localhost:3000/login`
2. Faça login com:
   - **Email**: `admin@smartpark.com`
   - **Senha**: `admin123`
3. **Resultado esperado**: Redirecionamento para `/dashboard`

### 2. Teste de Acesso à Página de Condomínios
1. Navegue para `http://localhost:3000/admin/condominios`
2. **Resultado esperado**: 
   - Página carrega sem erros
   - Lista de condomínios é exibida
   - Botão "Novo Condomínio" está visível

### 3. Teste de Validação Frontend - Campos Obrigatórios
1. Clique em "Novo Condomínio"
2. Deixe todos os campos vazios
3. Clique em "Criar Condomínio"
4. **Resultado esperado**:
   - Campos ficam com borda vermelha
   - Mensagens de erro aparecem abaixo dos campos:
     - "Nome é obrigatório"
     - "Endereço é obrigatório"
     - "Telefone é obrigatório"
     - "Email inválido"

### 4. Teste de Validação Frontend - Formatos Inválidos
1. Preencha os campos com dados inválidos:
   - **Nome**: "Teste"
   - **Endereço**: "Rua Teste"
   - **Telefone**: "123456" (formato inválido)
   - **Email**: "email-inválido" (sem @)
   - **Logo URL**: "url-inválida" (não é URL)
2. Clique em "Criar Condomínio"
3. **Resultado esperado**:
   - Mensagens de erro específicas:
     - "Formato de telefone inválido. Use (XX) XXXXX-XXXX"
     - "Email inválido"
     - "URL inválida"

### 5. Teste de Criação Bem-sucedida
1. Preencha os campos com dados válidos:
   - **Nome**: "Condomínio Teste Frontend"
   - **Endereço**: "Rua dos Testes, 456 - Centro"
   - **Telefone**: "(11) 98765-4321"
   - **Email**: "frontend@teste.com"
   - **Logo URL**: "https://exemplo.com/logo.png"
2. Clique em "Criar Condomínio"
3. **Resultado esperado**:
   - Modal fecha automaticamente
   - Novo condomínio aparece na listagem
   - Mensagem de sucesso (se implementada)

### 6. Teste de Integração com Backend
1. Abra as ferramentas de desenvolvedor (F12)
2. Vá para a aba "Network"
3. Tente criar um condomínio
4. **Resultado esperado**:
   - Requisição POST para `/api/admin/condominios`
   - Status 201 (Created) em caso de sucesso
   - Status 400 com detalhes do erro em caso de validação

### 7. Teste de Responsividade
1. Redimensione a janela do navegador
2. Teste em diferentes tamanhos de tela
3. **Resultado esperado**:
   - Interface se adapta corretamente
   - Modal permanece centralizado
   - Campos permanecem legíveis

## ✅ Checklist de Validação

- [ ] Login funciona corretamente
- [ ] Página de condomínios carrega sem erros
- [ ] Modal de criação abre e fecha
- [ ] Validação de campos obrigatórios funciona
- [ ] Validação de formatos funciona
- [ ] Mensagens de erro aparecem em vermelho
- [ ] Criação bem-sucedida funciona
- [ ] Listagem é atualizada após criação
- [ ] Requisições HTTP são enviadas corretamente
- [ ] Interface é responsiva

## 🐛 Problemas Conhecidos
- Nenhum problema conhecido no momento

## 📝 Observações
- Todos os testes de backend passaram com sucesso
- Validação Zod está funcionando corretamente
- Integração entre frontend e backend está implementada