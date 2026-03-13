# Deploy SmartPark no Coolify

## Estado atual

- Build pack em uso: `Nixpacks`
- Porta da aplicacao: `3000`
- Start atual publicado: `cd .next/standalone && node server.js`
- Banco de producao: PostgreSQL compartilhado do Coolify

## Configuracao no Coolify

1. Criar ou editar o resource apontando para este repositorio
2. Usar `Nixpacks`
3. Garantir que o `nixpacks.toml` da raiz seja usado
4. Configurar a porta `3000`
5. Definir as variaveis reais no painel do Coolify

## Variaveis obrigatorias

Use `COOLIFY-ENV-VARS.txt` apenas como template.

```bash
DATABASE_URL=postgresql://postgres:SENHA@HOST:5432/smartpark
NEXTAUTH_URL=https://smartpark.seu-dominio.com
NEXTAUTH_SECRET=GERAR_COM_OPENSSL
NODE_ENV=production
HOSTNAME=0.0.0.0
```

Gerar secret:

```bash
openssl rand -base64 32
```

## Validacao local antes do deploy

```bash
npx prisma validate
npm run build
npx tsc --noEmit
```

Opcional, mas recomendado:

```bash
npm run lint
```

## Observacoes

- `npm run build` ignora erros de TypeScript e ESLint por configuracao atual do projeto.
- O typecheck depende de `.next/types`, entao ele deve rodar depois do build.
- O fluxo atual em producao nao executa migracoes Prisma automaticamente no start.
- Se houver migration pendente, ela deve ser rodada manualmente ou o fluxo de deploy precisa ser ajustado.
