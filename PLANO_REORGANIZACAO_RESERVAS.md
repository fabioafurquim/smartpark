# Plano de Reorganização - Sistema de Reservas/Locação

**Data:** 25 de Novembro de 2025  
**Status:** 🔄 Planejamento

---

## 📊 Conceito Atual vs Novo

### ANTES (Conceito Errado)
```
Reservas (Geral)
├── Todos os moradores veem tudo
├── Confuso para quem quer locar
└── Confuso para quem quer gerenciar
```

### DEPOIS (Conceito Correto)
```
Morador COM Vaga para Locação:
├── Minhas Vagas (Configurar)
├── Reservas (Gerenciar locações da sua vaga)
└── Locação (Buscar outras vagas)

Morador SEM Vaga para Locação:
├── Locação (Buscar vagas disponíveis)
└── Minhas Locações (Histórico de locações)
```

---

## 🗂️ Estrutura de Menus

### Menu Sidebar

**Para Moradores COM Vagas:**
```
├── Minhas Vagas (Car icon)
│   └── Configurar tipos de locação
├── Reservas (Calendar icon)
│   └── Gerenciar reservas da sua vaga
└── Locação (MapPin icon)
    └── Buscar vagas disponíveis
```

**Para Moradores SEM Vagas:**
```
└── Locação (MapPin icon)
    └── Buscar vagas disponíveis
```

---

## 📄 Páginas a Criar/Modificar

### 1. **Página "Locação"** (NOVA)
- **Caminho:** `/app/locacao/page.tsx`
- **Quem vê:** Todos os moradores
- **Funcionalidades:**
  - Listar vagas disponíveis para locação
  - Filtrar por tipo (coberta, descoberta, etc)
  - Filtrar por condomínio
  - Visualizar detalhes da vaga
  - Botão "Locar Vaga" → abre modal
  - Modal de locação com:
    - Período (data início, data fim)
    - Tipo de locação (hora, diária, mensal, anual)
    - Valor
    - Botão "Confirmar Locação"

### 2. **Página "Reservas"** (MODIFICAR)
- **Caminho:** `/app/reservas/page.tsx`
- **Quem vê:** Moradores COM vagas para locação
- **Funcionalidades:**
  - Listar reservas/locações DA SUA VAGA
  - Mostrar quem locou
  - Período da locação
  - Status (pendente, ativa, finalizada, cancelada)
  - Ações: Aprovar, Rejeitar, Cancelar

### 3. **Página "Minhas Vagas"** (JÁ EXISTE)
- **Caminho:** `/app/minhas-vagas/page.tsx`
- **Sem mudanças necessárias**

---

## 🔌 APIs Necessárias

### Existentes (Manter)
- `GET /api/unidades` - Listar unidades
- `GET /api/minhas-vagas` - Vagas do morador logado
- `POST /api/vagas/[id]/configuracao-locacao` - Salvar config

### Novas (Criar)
- `GET /api/vagas/disponiveis` - Listar vagas disponíveis para locação
- `POST /api/locacoes` - Criar nova locação
- `GET /api/minhas-locacoes` - Locações do morador logado
- `GET /api/reservas-vaga` - Reservas da vaga do morador
- `PUT /api/locacoes/[id]/status` - Aprovar/Rejeitar/Cancelar

---

## 🗄️ Schema Prisma (Novo Modelo)

```prisma
model Locacao {
  id           String   @id @default(cuid())
  vagaId       String
  vaga         Vaga     @relation(fields: [vagaId], references: [id], onDelete: Cascade)
  
  locatarioId  String   // Quem está locando
  locatario    Usuario  @relation("LocatarioLocacoes", fields: [locatarioId], references: [id])
  
  proprietarioId String  // Quem é dono da vaga
  proprietario   Usuario @relation("ProprietarioLocacoes", fields: [proprietarioId], references: [id])
  
  dataInicio   DateTime
  dataFim      DateTime
  tipoLocacao  String   // 'HORA', 'DIARIA', 'MENSAL', 'ANUAL'
  valor        Float
  status       String   @default("PENDENTE") // PENDENTE, ATIVA, FINALIZADA, CANCELADA
  
  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt
  
  @@map("locacoes")
}
```

---

## 🔐 Permissões

### Página "Locação"
- ✅ Todos os moradores
- ✅ Visualizar vagas disponíveis
- ✅ Criar locação

### Página "Reservas"
- ✅ Apenas moradores COM vagas para locação
- ✅ Visualizar reservas da sua vaga
- ✅ Aprovar/Rejeitar/Cancelar

### Página "Minhas Vagas"
- ✅ Apenas moradores COM vagas para locação
- ✅ Configurar vagas

---

## 📊 Fluxo de Locação

```
1. Morador A (sem vaga)
   └── Acessa "Locação"
       └── Vê vagas disponíveis
           └── Clica em "Locar"
               └── Preenche período e tipo
                   └── Confirma
                       └── Cria Locacao com status PENDENTE

2. Morador B (dono da vaga)
   └── Acessa "Reservas"
       └── Vê locação pendente
           └── Aprova/Rejeita
               └── Se aprovar:
                   └── Status = ATIVA
                       └── Morador A pode usar a vaga
```

---

## 🎯 Ordem de Implementação

### Fase 1: Backend
1. Criar modelo `Locacao` no Prisma
2. Executar migration
3. Criar API `GET /api/vagas/disponiveis`
4. Criar API `POST /api/locacoes`
5. Criar API `GET /api/reservas-vaga`
6. Criar API `PUT /api/locacoes/[id]/status`

### Fase 2: Frontend
1. Criar página "Locação"
2. Modificar página "Reservas"
3. Adicionar menu "Locação" no Sidebar
4. Testar fluxo completo

---

## 📝 Checklist

- [ ] Schema Prisma criado
- [ ] Migration executada
- [ ] APIs criadas
- [ ] Página "Locação" criada
- [ ] Página "Reservas" modificada
- [ ] Menu atualizado
- [ ] Testes completos

---

**Status:** 🟡 Aguardando Aprovação do Plano
