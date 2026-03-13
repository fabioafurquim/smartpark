# AGENTS.md

## Objetivo do projeto

SmartPark e uma plataforma web para gestao e locacao de vagas em condominios.

## Stack real

- Next.js 15 App Router
- React 19
- TypeScript
- Prisma + PostgreSQL
- NextAuth com credenciais
- Tailwind CSS
- Zod

## Mapa rapido

- `src/app`: paginas e route handlers
- `src/app/api`: backend HTTP
- `src/components`: layout, UI, modais e componentes de negocio
- `src/lib/auth.ts`: autenticacao, perfis e permissoes
- `src/lib/prisma.ts`: instancia unica do Prisma
- `src/lib/validations`: schemas Zod
- `src/types/index.ts`: tipos compartilhados
- `prisma/schema.prisma`: modelo de dados
- `nixpacks.toml`: deploy atual no Coolify

## Regras de negocio

- O sistema e multi-tenant por condominio.
- Toda leitura ou escrita autenticada deve ser filtrada pelos condominios permitidos ao usuario.
- Nunca confie em `condominioId`, `usuarioId` ou ids vindos do cliente sem validar na sessao.
- `administrador_mestre` enxerga tudo.
- `administrador_condominio` e `sindico` operam apenas no(s) condominio(s) vinculados ao perfil.
- `morador` so pode agir sobre dados proprios e sobre recursos visiveis no seu condominio.
- `Locacao` e o fluxo principal de marketplace entre moradores.
- `Reserva` existe em paralelo e ainda exige cuidado extra porque o codigo atual mistura responsabilidades.

## Regras para backend

- Prefira `getServerSession(authOptions)` em routes autenticadas.
- Se usar `getToken`, mantenha o mesmo escopo de permissao.
- Valide entrada com Zod antes de tocar no Prisma.
- Use `prisma` apenas via `src/lib/prisma.ts`.
- Padronize novas respostas em `{ success, data, error }`.
- Em rotas por `[id]`, valide se o recurso pertence a um condominio autorizado antes de editar ou excluir.
- Evite introduzir `any` novo.

## Regras para frontend

- Preserve App Router e os componentes existentes antes de criar abstractions novas.
- Use `next/link` para navegacao interna.
- Em telas autenticadas, nao assuma permissao pelo frontend; valide tudo no backend.
- Ao mexer em dashboard ou listagens, confirme perfil e condominio ativo antes das buscas.

## Estado atual importante

- O deploy real no Coolify usa `Nixpacks`, nao `Dockerfile`.
- O start publicado hoje e `cd .next/standalone && node server.js`.
- O build passa mesmo ignorando TypeScript e ESLint por causa de `next.config.ts`.
- `npm run build` sozinho nao garante saude do codigo.
- O `tsconfig.json` inclui `.next/types`; se faltar arquivo gerado, rode `npm run build` antes do `npx tsc --noEmit`.
- Existem scripts e arquivos legados fora do fluxo principal; em conflito, o codigo atual e a configuracao real do Coolify vencem.

## Checklist antes de commit

```bash
npx prisma validate
npm run build
npx tsc --noEmit
```

Se a alteracao tocar areas compartilhadas, rode tambem:

```bash
npm run lint
```

## Regras de deploy no Coolify

- Use `Nixpacks`.
- Configure secrets apenas no painel do Coolify.
- Nao commite credenciais reais ou secrets de producao.
- Valide `NEXTAUTH_URL` com o dominio final.
- Se houver migration pendente, combine explicitamente como ela sera executada no deploy.

## Prioridades de revisao

- Seguranca multi-tenant
- Autenticacao e permissao
- Consistencia entre frontend, API e schema Prisma
- Alinhamento com a configuracao real do Coolify
