# Sistema de Locação de Vagas - Implementação

**Data:** 25 de Novembro de 2025  
**Status:** 🔄 Em Progresso - Fase 1 Concluída

---

## 📋 Objetivo do Sistema

Implementar um sistema completo de locação de vagas onde:

1. **Admin/Síndico/Admin Mestre** podem:
   - Cadastrar unidades e associar um morador a cada unidade
   - Editar unidades e alterar o morador associado
   - Visualizar todas as vagas e suas configurações

2. **Morador** pode:
   - Gerenciar as vagas da sua unidade (Minhas Vagas)
   - Definir tipos de locação para suas vagas (hora, diária, mensal, anual)
   - Definir valores para cada tipo de locação
   - Oferecer suas vagas para locação
   - Reservar vagas de outros moradores
   - Visualizar histórico de reservas

---

## ✅ Fase 1 - Associação de Usuários a Unidades (CONCLUÍDA)

### 1. Schema Prisma Atualizado

**Arquivo:** `prisma/schema.prisma`

Adicionado campo `usuarioId` no modelo `Unidade`:

```prisma
model Unidade {
  // ... campos existentes ...
  usuarioId            String?
  usuario              Usuario?              @relation("UnidadeUsuario", fields: [usuarioId], references: [id], onDelete: SetNull)
  // ... resto do modelo ...
}

model Usuario {
  // ... campos existentes ...
  unidades             Unidade[]             @relation("UnidadeUsuario")
  // ... resto do modelo ...
}
```

**Mudanças:**
- ✅ Campo `usuarioId` adicionado como opcional
- ✅ Relação `usuario` criada
- ✅ Relação inversa `unidades` criada em Usuario
- ✅ OnDelete: SetNull (se usuário for deletado, unidade fica sem associação)

### 2. UnidadeModal Atualizado

**Arquivo:** `src/components/modals/UnidadeModal.tsx`

**Mudanças:**
- ✅ Adicionado estado `usuarios` para armazenar lista de moradores
- ✅ Adicionada função `fetchUsuarios()` que carrega moradores do condomínio
- ✅ Campo "Associar Morador" adicionado no formulário
- ✅ Dropdown com lista de moradores do condomínio
- ✅ Texto explicativo: "O morador associado poderá gerenciar as vagas desta unidade"
- ✅ Campo `usuarioId` incluído no `UnidadeFormData`

**Fluxo:**
1. Quando condomínio é selecionado → carrega torres E moradores
2. Usuário pode selecionar um morador da lista
3. Dados são salvos com `usuarioId`

### 3. Página de Unidades Atualizada

**Arquivo:** `src/app/dashboard/estrutura/unidades/page.tsx`

**Mudanças:**
- ✅ Interface `Unidade` atualizada com campos `usuarioId` e `usuario`
- ✅ Coluna "Morador Associado" adicionada na tabela
- ✅ Exibe nome e email do morador associado
- ✅ Mostra "-" se nenhum morador associado

**Tabela:**
```
Unidade | Tipo | Torre/Bloco | Proprietário | Contato | Morador Associado | Ações
```

---

## 🔄 Fase 2 - APIs de Unidades (PRÓXIMO)

### Tarefas:

1. **Criar Migration Prisma**
   ```bash
   npx prisma migrate dev --name add_usuario_to_unidade
   ```
   - Adiciona coluna `usuarioId` na tabela `unidades`
   - Cria índice para melhor performance

2. **Atualizar `/api/unidades` (POST)**
   - Aceitar `usuarioId` no payload
   - Validar se usuário existe e pertence ao condomínio
   - Salvar `usuarioId` na unidade

3. **Atualizar `/api/unidades/[id]` (PUT)**
   - Aceitar `usuarioId` no payload
   - Permitir alterar morador associado
   - Validações de permissão

4. **Atualizar `/api/unidades` (GET)**
   - Incluir dados do usuário associado
   - Retornar `usuario { id, nome, email }`

---

## 🔄 Fase 3 - Página "Minhas Vagas" para Moradores (PRÓXIMO)

### Página: `/app/minhas-vagas/page.tsx`

**Funcionalidades:**
- Listar vagas da unidade do morador logado
- Editar configuração de locação para cada vaga:
  - Tipos permitidos (hora, diária, mensal, anual)
  - Valores para cada tipo
  - Status (disponível/indisponível)
- Visualizar reservas ativas
- Cancelar reservas se necessário

**Componentes Necessários:**
- `ConfiguracaoLocacaoModal.tsx` - Modal para editar configuração de locação
- `MinhasVagasPage.tsx` - Página principal

---

## 🔄 Fase 4 - Menu no Sidebar (PRÓXIMO)

**Arquivo:** `src/components/Sidebar.tsx`

**Mudanças:**
- Adicionar menu "Minhas Vagas" para moradores
- Link: `/minhas-vagas`
- Ícone: Car ou Home
- Visível apenas para perfil "morador"

---

## 🔄 Fase 5 - Fluxo Completo de Locação (PRÓXIMO)

### Fluxo do Morador:

1. **Cadastro de Unidade (Admin/Síndico)**
   - Cria unidade
   - Associa morador
   - ✅ IMPLEMENTADO

2. **Gerenciar Vagas (Morador)**
   - Acessa "Minhas Vagas"
   - Vê vagas da sua unidade
   - Edita configuração de locação
   - Define tipos e valores
   - ⏳ PRÓXIMO

3. **Oferecer Vaga (Morador)**
   - Marca vaga como "disponível para locação"
   - Outros moradores veem a vaga em "Reservas"
   - ⏳ PRÓXIMO

4. **Reservar Vaga (Morador)**
   - Acessa "Reservas"
   - Vê vagas disponíveis de outros moradores
   - Faz reserva
   - ✅ JÁ EXISTE

5. **Gerenciar Reservas (Morador)**
   - Vê reservas de suas vagas
   - Aprova/rejeita reservas
   - Recebe pagamentos
   - ⏳ PRÓXIMO

---

## 📊 Estrutura de Dados

### Unidade
```typescript
{
  id: string;
  numero: string;
  andar: number;
  tipo: 'APARTAMENTO' | 'COBERTURA' | 'LOJA' | 'SALA_COMERCIAL';
  proprietario?: string;
  contato?: string;
  torreId: string;
  condominioId: string;
  usuarioId?: string;  // ← NOVO
  usuario?: {          // ← NOVO
    id: string;
    nome: string;
    email: string;
  };
}
```

### Vaga
```typescript
{
  id: string;
  numero: string;
  tipo: 'COBERTA' | 'DESCOBERTA' | 'DEFICIENTE' | 'IDOSO' | 'VISITANTE';
  unidadeId: string;
  proprietarioId?: string;  // Morador que é dono da vaga
  condominioId: string;
  configuracaoLocacao?: {
    disponivel: boolean;
    tiposPermitidos: TipoLocacao[];
    valorHora?: Decimal;
    valorDiaria?: Decimal;
    valorMensal?: Decimal;
    valorAnual?: Decimal;
  };
}
```

---

## 🧪 Como Testar

### Teste 1: Associar Morador a Unidade
1. Faça login como Admin/Síndico
2. Vá para Estrutura → Unidades
3. Clique em "Nova Unidade" ou edite uma existente
4. ✅ Deve ver dropdown "Associar Morador"
5. Selecione um morador
6. Salve
7. ✅ Coluna "Morador Associado" deve exibir o morador

### Teste 2: Minhas Vagas (Após Fase 3)
1. Faça login como morador
2. Clique em "Minhas Vagas" no menu
3. ✅ Deve listar vagas da sua unidade
4. Clique em editar configuração
5. ✅ Deve permitir definir tipos e valores

---

## 📁 Arquivos Modificados

| Arquivo | Status | Mudança |
|---------|--------|---------|
| `prisma/schema.prisma` | ✅ | Campo `usuarioId` adicionado |
| `src/components/modals/UnidadeModal.tsx` | ✅ | Campo "Associar Morador" adicionado |
| `src/app/dashboard/estrutura/unidades/page.tsx` | ✅ | Coluna "Morador Associado" adicionada |
| `/api/unidades` | ⏳ | Precisa atualizar POST/PUT/GET |
| `src/app/minhas-vagas/page.tsx` | ⏳ | Precisa criar |
| `src/components/Sidebar.tsx` | ⏳ | Precisa adicionar menu |

---

## 🚀 Próximos Passos

1. **Executar Migration**
   ```bash
   npx prisma migrate dev --name add_usuario_to_unidade
   ```

2. **Atualizar APIs de Unidades**
   - POST `/api/unidades` - incluir `usuarioId`
   - PUT `/api/unidades/[id]` - incluir `usuarioId`
   - GET `/api/unidades` - retornar dados do usuário

3. **Criar Página "Minhas Vagas"**
   - Listar vagas do morador
   - Editar configuração de locação
   - Gerenciar reservas

4. **Atualizar Sidebar**
   - Adicionar menu "Minhas Vagas" para moradores

5. **Testes Completos**
   - Testar fluxo de cadastro
   - Testar gerenciamento de vagas
   - Testar reservas

---

**Versão:** 1.0.0 - Fase 1  
**Status:** ✅ Pronto para Próxima Fase
