# 🚀 Deploy SmartPark no Coolify

## 📋 Pré-requisitos

- Servidor com Coolify instalado (187.77.57.122)
- Repositório GitHub: https://github.com/fabioafurquim/smartpark.git
- Banco de dados PostgreSQL

---

## 🗄️ Banco de Dados

### Opção 1: Usar banco PostgreSQL existente do Coolify (RECOMENDADO)

Vantagens:
- ✅ Menos recursos consumidos
- ✅ Backup centralizado
- ✅ Gerenciamento simplificado

**Configuração:**
- Usar o mesmo banco PostgreSQL que já está rodando no Coolify
- Criar um novo database chamado `smartpark` dentro da instância existente

### Opção 2: Criar nova instância PostgreSQL

Vantagens:
- ✅ Isolamento total
- ✅ Configurações independentes

Desvantagens:
- ❌ Mais recursos (RAM, CPU)
- ❌ Mais complexidade de gerenciamento

---

## 🔧 Configuração no Coolify

### 1. Criar novo projeto

1. Acesse o Coolify: http://187.77.57.122:8000
2. Clique em **"+ New Resource"**
3. Selecione **"Public Repository"**
4. Cole a URL: `https://github.com/fabioafurquim/smartpark.git`
5. Branch: `main`

### 2. Configurar Build

- **Build Pack:** Dockerfile
- **Dockerfile Location:** `./Dockerfile`
- **Port:** 3000

### 3. Configurar Domínio

**Subdomínio sugerido:** `park.furquim.cloud`

Ou escolha outro:
- `smartpark.furquim.cloud`
- `estacionamento.furquim.cloud`
- `parking.furquim.cloud`

### 4. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no Coolify:

```bash
# Database (usar banco existente)
DATABASE_URL=postgresql://postgres:SENHA_DO_POSTGRES@NOME_DO_CONTAINER_POSTGRES:5432/smartpark

# NextAuth
NEXTAUTH_URL=https://park.furquim.cloud
NEXTAUTH_SECRET=GERAR_CHAVE_SECRETA_AQUI

# App
NODE_ENV=production
```

**Para gerar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 5. Criar Database no PostgreSQL

**✅ Database já criado!**

O database `smartpark` já foi criado no PostgreSQL existente.

Para verificar:
```bash
ssh root@187.77.57.122
docker exec jk4ss8ssocc4owows0csw4kg psql -U postgres -c '\l'
```

### 6. Configurar Build Command (Opcional)

No Coolify, em **Build Settings**:

- **Pre Deploy Command:** `npm run migrate:production`

Isso garante que as migrações sejam executadas antes do deploy.

---

## 🚀 Deploy

1. Clique em **"Deploy"** no Coolify
2. Aguarde o build (5-10 minutos)
3. Após o deploy, execute o script de correção de domínio:

```bash
ssh root@187.77.57.122
cd /root
./fix-domain-after-deploy.sh
```

---

## ✅ Verificação

1. Acesse: https://park.furquim.cloud
2. Teste o login
3. Verifique se o banco está conectado

---

## 🔄 Deploys Futuros

Para fazer novos deploys:

1. Faça commit e push das alterações:
```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

2. No Coolify, clique em **"Redeploy"**

3. Execute o script de correção de domínio (se necessário):
```bash
ssh root@187.77.57.122
./fix-domain-after-deploy.sh
```

---

## 🗄️ Migrações do Prisma

### Criar nova migração (desenvolvimento):
```bash
npx prisma migrate dev --name nome_da_migracao
```

### Aplicar migrações em produção:

**Opção 1: Via Pre Deploy Command (automático)**
- Já configurado no Coolify

**Opção 2: Manual via SSH**
```bash
ssh root@187.77.57.122
docker exec CONTAINER_ID npx prisma migrate deploy
```

---

## 📊 Logs

Ver logs da aplicação:
```bash
ssh root@187.77.57.122
docker logs -f CONTAINER_ID
```

---

## 🔒 Segurança

- ✅ HTTPS automático via Coolify
- ✅ Variáveis de ambiente seguras
- ✅ Banco de dados isolado
- ✅ NextAuth configurado

---

## 🆘 Troubleshooting

### Erro de conexão com banco:
1. Verifique se o database `smartpark` foi criado
2. Confirme a `DATABASE_URL` no Coolify
3. Teste conexão: `docker exec CONTAINER_ID npx prisma db pull`

### Erro de domínio:
1. Execute o script `fix-domain-after-deploy.sh`
2. Verifique se o domínio está apontando para o servidor
3. Aguarde propagação DNS (até 24h)

### Build falha:
1. Verifique logs no Coolify
2. Confirme se todas as dependências estão no `package.json`
3. Teste build local: `npm run build`

---

## 📞 Suporte

Em caso de problemas, verifique:
1. Logs do Coolify
2. Logs do container
3. Status do banco de dados
4. Configuração de DNS
