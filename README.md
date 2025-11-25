# SmartPark

Sistema de gerenciamento de vagas de estacionamento para condomínios, permitindo que moradores aluguem suas vagas para outros moradores de forma simples e organizada.

![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-6.15-2D3748?logo=prisma)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)

## Sobre o Projeto

O **SmartPark** é uma plataforma web completa para gestão de vagas de estacionamento em condomínios. O sistema permite:

- **Moradores** podem disponibilizar suas vagas para locação (por hora, diária, mensal ou anual)
- **Locatários** podem buscar e alugar vagas disponíveis
- **Síndicos** gerenciam a estrutura do condomínio (torres, unidades, vagas)
- **Administradores** têm visão global de todos os condomínios

### Principais Funcionalidades

- Cadastro e gestão de múltiplos condomínios
- Gerenciamento de torres, unidades e vagas
- Sistema de locação com aprovação do proprietário
- Notificações em tempo real
- Dashboard personalizado por perfil de usuário
- Controle de acesso baseado em perfis (Admin, Síndico, Morador)

## Tech Stack

| Tecnologia | Uso |
|------------|-----|
| **Next.js 15** | Framework React com App Router |
| **React 19** | Biblioteca de UI |
| **TypeScript** | Tipagem estática |
| **PostgreSQL** | Banco de dados relacional |
| **Prisma ORM** | Mapeamento objeto-relacional |
| **NextAuth.js** | Autenticação |
| **TailwindCSS** | Estilização |
| **Zod** | Validação de schemas |
| **Lucide React** | Ícones |

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18.x ou superior
- [PostgreSQL](https://www.postgresql.org/) 14.x ou superior
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/fabioafurquim/smartpark.git
cd smartpark
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Banco de Dados
DATABASE_URL="postgresql://usuario:senha@localhost:5432/smartpark?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-secreta-aqui"

# Opcional: Google OAuth
GOOGLE_CLIENT_ID="seu-client-id"
GOOGLE_CLIENT_SECRET="seu-client-secret"
```

> **Dica:** Gere uma chave secreta com: `openssl rand -base64 32`

### 4. Configure o banco de dados

```bash
# Crie o banco de dados PostgreSQL
psql -U postgres -c "CREATE DATABASE smartpark;"

# Execute as migrations do Prisma
npx prisma migrate dev

# (Opcional) Popule com dados de exemplo
npx prisma db seed
```

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

## Primeiro Acesso

Na primeira execução, o sistema solicitará a criação do **Administrador Mestre**:

1. Acesse `http://localhost:3000`
2. Preencha os dados do administrador principal
3. Faça login com as credenciais criadas

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | Executa linter |
| `npx prisma studio` | Abre interface visual do banco |
| `npx prisma migrate dev` | Executa migrations pendentes |
| `npx prisma generate` | Regenera cliente Prisma |

## Estrutura do Projeto

```
smartpark/
├── prisma/
│   ├── schema.prisma      # Schema do banco de dados
│   └── migrations/        # Histórico de migrations
├── src/
│   ├── app/               # Rotas e páginas (App Router)
│   │   ├── api/           # API Routes
│   │   ├── dashboard/     # Páginas do dashboard
│   │   └── ...
│   ├── components/        # Componentes React
│   │   ├── modals/        # Modais
│   │   ├── ui/            # Componentes de UI
│   │   └── ...
│   ├── lib/               # Utilitários e configurações
│   └── types/             # Definições TypeScript
├── public/                # Arquivos estáticos
└── ...
```

## Perfis de Usuário

| Perfil | Permissões |
|--------|------------|
| **Administrador Mestre** | Acesso total ao sistema, gerencia todos os condomínios |
| **Administrador Condomínio** | Gerencia um condomínio específico |
| **Síndico** | Gerencia estrutura e aprova solicitações |
| **Morador** | Aluga vagas e gerencia suas próprias vagas |

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Contato

**Fabio Furquim** - [@fabioafurquim](https://github.com/fabioafurquim)

Link do Projeto: [https://github.com/fabioafurquim/smartpark](https://github.com/fabioafurquim/smartpark)
