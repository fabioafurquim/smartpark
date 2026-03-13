# SmartPark

Sistema web para gestao e locacao de vagas de estacionamento em condominios.

## Stack

- Next.js 15
- React 19
- TypeScript
- Prisma
- PostgreSQL
- NextAuth
- Tailwind CSS
- Zod

## Dominios principais

- `Condominio`
- `Torre`
- `Unidade`
- `Vaga`
- `Usuario`
- `PerfilUsuario`
- `Locacao`
- `Reserva`
- `Notificacao`

## Desenvolvimento local

1. Instale as dependencias

```bash
npm install
```

2. Configure `.env.local`

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/smartpark"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NODE_ENV="development"
```

3. Rode as migrations

```bash
npx prisma migrate dev
```

4. Suba a aplicacao

```bash
npm run dev
```

## Comandos importantes

```bash
npm run dev
npm run build
npm run start
npm run lint
npx prisma validate
npx prisma migrate dev
npx prisma studio
```

## Deploy atual

- Plataforma: Coolify
- Build pack: `Nixpacks`
- Start atual: `cd .next/standalone && node server.js`
- Banco: PostgreSQL compartilhado do Coolify

Detalhes operacionais estao em `DEPLOY-COOLIFY.md`.
