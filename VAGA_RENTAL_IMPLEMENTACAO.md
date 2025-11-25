# Implementação do Sistema de Locação de Vagas (Vaga Rental)

## Status: ✅ CONCLUÍDO

### Data de Conclusão
25 de Novembro de 2025

---

## 1. Resumo da Implementação

O sistema de locação de vagas foi completamente implementado no backend, permitindo que moradores proprietários de vagas definam políticas de aluguel e que outros moradores visualizem e reservem vagas disponíveis.

---

## 2. Modelos de Dados

### Modelo: `ConfiguracaoLocacaoVaga`
```prisma
model ConfiguracaoLocacaoVaga {
  id              String       @id @default(cuid())
  vagaId          String       @unique
  disponivel      Boolean      @default(false)
  tiposPermitidos TipoLocacao[]
  valorHora       Decimal?     @db.Decimal(10, 2)
  valorDiaria     Decimal?     @db.Decimal(10, 2)
  valorMensal     Decimal?     @db.Decimal(10, 2)
  valorAnual      Decimal?     @db.Decimal(10, 2)
  criadoEm        DateTime     @default(now())
  atualizadoEm    DateTime     @updatedAt
  vaga            Vaga         @relation(fields: [vagaId], references: [id], onDelete: Cascade)
}
```

### Enum: `TipoLocacao`
- `HORA` - Aluguel por hora
- `DIARIA` - Aluguel por dia
- `MENSAL` - Aluguel por mês
- `ANUAL` - Aluguel por ano

### Extensão do Modelo: `Vaga`
```prisma
model Vaga {
  // ... campos existentes ...
  proprietarioId       String?
  proprietario         Usuario?              @relation("ProprietarioVaga", fields: [proprietarioId], references: [id])
  configuracaoLocacao  ConfiguracaoLocacaoVaga?
}
```

### Extensão do Modelo: `Reserva`
```prisma
model Reserva {
  // ... campos existentes ...
  tipoLocacao  TipoLocacao?
  valor        Decimal?   @db.Decimal(10, 2)
}
```

---

## 3. Rotas API Implementadas

### 3.1 GET `/api/vagas` - Listar Vagas
**Autenticação:** Middleware de estrutura (administrador_condominio, sindico)

**Query Parameters:**
- `unidadeId` (opcional) - Filtrar por unidade
- `tipo` (opcional) - Filtrar por tipo de vaga
- `status` (opcional) - Filtrar por status

**Resposta:**
```json
[
  {
    "id": "vaga_id",
    "numero": "01",
    "tipo": "COBERTA",
    "ocupada": true,
    "unidade": { ... },
    "condominio": { ... },
    "proprietario": {
      "id": "user_id",
      "nome": "João Silva",
      "email": "joao@example.com"
    },
    "configuracaoLocacao": {
      "id": "config_id",
      "vagaId": "vaga_id",
      "disponivel": true,
      "tiposPermitidos": ["DIARIA", "MENSAL"],
      "valorHora": null,
      "valorDiaria": 50.00,
      "valorMensal": 800.00,
      "valorAnual": null,
      "criadoEm": "2025-11-25T10:00:00Z",
      "atualizadoEm": "2025-11-25T10:00:00Z"
    },
    "criadoEm": "2025-11-25T10:00:00Z",
    "atualizadoEm": "2025-11-25T10:00:00Z"
  }
]
```

### 3.2 POST `/api/vagas` - Criar Vaga
**Autenticação:** Middleware de estrutura

**Body:**
```json
{
  "numero": "01",
  "tipo": "COBERTA",
  "unidadeId": "unit_id",
  "condominioId": "cond_id",
  "proprietarioId": "user_id"
}
```

**Validações:**
- Proprietário deve ser morador ativo do condomínio
- Número da vaga deve ser único na unidade
- Configuração de locação é criada automaticamente (desabilitada por padrão)

**Resposta:** Vaga criada com configuração de locação padrão (status 201)

### 3.3 GET `/api/vagas/[id]` - Buscar Vaga Específica
**Autenticação:** NextAuth (qualquer usuário autenticado)

**Resposta:** Vaga com todos os relacionamentos (proprietário, configuração de locação, condomínio, unidade)

### 3.4 PUT `/api/vagas/[id]` - Atualizar Vaga
**Autenticação:** NextAuth com validação de permissão de condomínio

**Body:**
```json
{
  "numero": "02",
  "tipo": "DESCOBERTA",
  "proprietarioId": "new_user_id",
  "configuracaoLocacao": {
    "disponivel": true,
    "tiposPermitidos": ["DIARIA", "MENSAL"],
    "valorHora": null,
    "valorDiaria": 50.00,
    "valorMensal": 800.00,
    "valorAnual": null
  }
}
```

**Validações:**
- Proprietário deve ser morador ativo do condomínio
- Se `disponivel` é true, pelo menos um tipo de locação deve ser selecionado
- Cada tipo de locação deve ter um valor configurado
- Proteção contra duplicação de número de vaga no condomínio

**Operações:**
- Atualiza dados da vaga
- Faz upsert da configuração de locação (cria ou atualiza)
- Se `configuracaoLocacao` é null, deleta a configuração existente

### 3.5 DELETE `/api/vagas/[id]` - Deletar Vaga
**Autenticação:** NextAuth com validação de permissão de condomínio

**Proteções:**
- Impede exclusão se houver reservas ativas (status: 'ativa' ou 'confirmada')
- Valida acesso ao condomínio

**Resposta:** Mensagem de sucesso (status 200)

### 3.6 POST `/api/reservas` - Criar Reserva
**Autenticação:** Pública (validação de dados)

**Body:**
```json
{
  "vagaId": "vaga_id",
  "usuarioId": "user_id",
  "condominioId": "cond_id",
  "dataInicio": "2025-12-01T10:00:00Z",
  "dataFim": "2025-12-05T18:00:00Z",
  "tipoLocacao": "DIARIA",
  "observacoes": "Observações opcionais"
}
```

**Validações:**
- Vaga deve existir
- Vaga deve estar disponível para locação
- Tipo de locação deve ser permitido
- Sem conflitos de horários com reservas ativas
- Data de início não pode ser no passado
- Data de fim deve ser posterior à data de início

**Cálculo de Valor:**
- **HORA:** valor_hora × número de horas
- **DIARIA:** valor_diaria × número de dias (arredondado para cima)
- **MENSAL:** valor_mensal (fixo)
- **ANUAL:** valor_anual (fixo)

**Resposta:** Reserva criada com valor calculado (status 201)

---

## 4. Correções de Lint Realizadas

### 4.1 `src/app/api/vagas/[id]/route.ts`
- ✅ Corrigido status de reserva para incluir 'ativa' e 'confirmada' em minúsculo
- ✅ Implementado helper `atualizarConfiguracaoLocacao` para gerenciar upsert/delete
- ✅ Tipos Prisma.validator para includes tipados
- ✅ Conversão de Decimal para number em respostas

### 4.2 `src/app/api/admin/condominios/route.ts`
- ✅ Corrigido `ZodError.errors` → `ZodError.issues` (API atual do Zod)

### 4.3 `src/app/api/admin/usuarios/route.ts`
- ✅ Corrigido `z.record()` para aceitar chave string: `z.record(z.string(), z.boolean())`
- ✅ Removida opção inválida `invalid_type_error` de `z.enum()`

### 4.4 `src/app/api/reservas/route.ts`
- ✅ Adicionado `tipoLocacao` ao schema de validação
- ✅ Incluído `configuracaoLocacao` no include de vaga
- ✅ Validação de disponibilidade e tipos permitidos
- ✅ Cálculo automático de valor baseado no tipo de locação

---

## 5. Tipos TypeScript

### Tipos Derivados do Prisma
```typescript
type VagaComRelacionamentos = Prisma.VagaGetPayload<typeof vagaArgs>;
type UpdateVagaPayload = z.infer<typeof updateVagaSchema>;
type ConfiguracaoLocacaoPayload = UpdateVagaPayload['configuracaoLocacao'];
```

### Helpers de Conversão
```typescript
const toDecimalOrNull = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? null : new Prisma.Decimal(valor);

const toDecimalOrUndefined = (valor: number | null | undefined) =>
  valor === undefined ? undefined : toDecimalOrNull(valor);

const decimalToNumber = (valor: Prisma.Decimal | null | undefined) =>
  valor?.toNumber() ?? null;
```

---

## 6. Validações Implementadas

### Validação de Proprietário
- Deve ser usuário ativo do sistema
- Deve ter perfil "morador" ativo no condomínio
- Validação em criação e atualização de vagas

### Validação de Configuração de Locação
- Se `disponivel` é true, pelo menos um tipo deve ser selecionado
- Cada tipo selecionado deve ter um valor configurado
- Valores não podem ser negativos
- Conversão automática de Decimal para number em respostas

### Validação de Reserva
- Vaga deve estar disponível para locação
- Tipo de locação deve estar entre os permitidos
- Sem conflitos de horários
- Data de início não pode ser no passado
- Data de fim deve ser posterior à data de início

---

## 7. Fluxo de Uso

### Passo 1: Proprietário Configura Vaga
```
PUT /api/vagas/[id]
{
  "proprietarioId": "morador_id",
  "configuracaoLocacao": {
    "disponivel": true,
    "tiposPermitidos": ["DIARIA", "MENSAL"],
    "valorDiaria": 50.00,
    "valorMensal": 800.00
  }
}
```

### Passo 2: Morador Visualiza Vagas Disponíveis
```
GET /api/vagas?condominioId=cond_id
```

### Passo 3: Morador Cria Reserva
```
POST /api/reservas
{
  "vagaId": "vaga_id",
  "usuarioId": "morador_id",
  "condominioId": "cond_id",
  "dataInicio": "2025-12-01T10:00:00Z",
  "dataFim": "2025-12-05T18:00:00Z",
  "tipoLocacao": "DIARIA"
}
```

### Passo 4: Sistema Calcula Valor
- 5 dias × R$ 50.00/dia = R$ 250.00

---

## 8. Próximas Etapas (Futuro)

### Frontend
- [ ] Interface para gerenciamento de vagas (proprietário)
- [ ] Configuração de preços e tipos de locação
- [ ] Dashboard de moradores para visualizar vagas disponíveis
- [ ] Fluxo de reserva com confirmação de pagamento

### Backend
- [ ] Integração com sistema de pagamento
- [ ] Notificações por email para proprietário e morador
- [ ] Relatórios de ocupação e receita
- [ ] Sistema de avaliações entre moradores
- [ ] Cancelamento de reservas com política de reembolso

### Melhorias
- [ ] Validação de conflitos de horários mais robusta
- [ ] Suporte a reservas recorrentes
- [ ] Bloqueio de datas para manutenção
- [ ] Histórico de preços

---

## 9. Testes Recomendados

### Testes Unitários
- [ ] Cálculo de valor para cada tipo de locação
- [ ] Validação de conflitos de horários
- [ ] Conversão de Decimal para number

### Testes de Integração
- [ ] Criar vaga com configuração de locação
- [ ] Atualizar configuração de locação
- [ ] Criar reserva com cálculo de valor
- [ ] Impedir exclusão de vaga com reservas ativas
- [ ] Validação de proprietário como morador ativo

### Testes E2E
- [ ] Fluxo completo: criar vaga → configurar locação → criar reserva
- [ ] Validação de permissões de acesso
- [ ] Tratamento de erros

---

## 10. Notas Técnicas

### Conversão de Decimal
- Prisma usa `Decimal` para campos monetários
- Respostas JSON convertem para `number` usando `toNumber()`
- Entrada aceita `number` e converte para `Decimal`

### Upsert de Configuração de Locação
- Usa `vagaId` como chave única (one-to-one relationship)
- Cria nova configuração se não existir
- Atualiza se já existe
- Deleta se `configuracaoLocacao` é null

### Status de Reserva
- Aceita 'ativa', 'cancelada', 'expirada', 'concluida'
- Proteção contra exclusão de vaga verifica ambas as variações (minúscula e maiúscula)

---

## 11. Checklist de Implementação

- ✅ Modelo `ConfiguracaoLocacaoVaga` criado
- ✅ Enum `TipoLocacao` definido
- ✅ Relacionamento um-para-um entre `Vaga` e `ConfiguracaoLocacaoVaga`
- ✅ Rota GET `/api/vagas` com configuração de locação
- ✅ Rota POST `/api/vagas` com criação de configuração padrão
- ✅ Rota GET `/api/vagas/[id]` com configuração de locação
- ✅ Rota PUT `/api/vagas/[id]` com upsert de configuração
- ✅ Rota DELETE `/api/vagas/[id]` com proteção contra exclusão
- ✅ Rota POST `/api/reservas` com validação e cálculo de valor
- ✅ Validação de proprietário como morador ativo
- ✅ Conversão de Decimal para number
- ✅ Tipos Prisma.validator para includes tipados
- ✅ Todos os erros de lint corrigidos
- ✅ TypeScript compilando sem erros

---

## 12. Contato e Suporte

Para dúvidas ou problemas com a implementação, consulte:
- Documentação do Prisma: https://www.prisma.io/docs/
- Documentação do Zod: https://zod.dev/
- Documentação do Next.js: https://nextjs.org/docs/
