# Sistema de Pagamento - Locação de Vagas

## Status: ✅ IMPLEMENTADO

### Data de Implementação
25 de Novembro de 2025

---

## 1. Visão Geral

O sistema de pagamento foi implementado para controlar o fluxo de pagamento das reservas de vagas. Cada reserva possui um status de pagamento que pode ser:

- **PENDENTE** - Aguardando confirmação de pagamento
- **CONFIRMADO** - Pagamento confirmado pelo morador
- **CANCELADO** - Pagamento cancelado
- **REEMBOLSADO** - Pagamento reembolsado

---

## 2. Modelo de Dados

### Enum: `StatusPagamento`
```prisma
enum StatusPagamento {
  PENDENTE
  CONFIRMADO
  CANCELADO
  REEMBOLSADO
}
```

### Campo na Reserva
```prisma
model Reserva {
  // ... outros campos ...
  statusPagamento StatusPagamento @default(PENDENTE)
  // ... outros campos ...
}
```

---

## 3. Fluxo de Pagamento

### Passo 1: Criar Reserva
```
Morador cria reserva → statusPagamento = PENDENTE
```

### Passo 2: Confirmar Pagamento
```
PUT /api/reservas/[id]/pagamento
{
  "statusPagamento": "CONFIRMADO",
  "metodo": "MANUAL" | "PIX" | "CARTAO" | "TRANSFERENCIA"
}
```

### Passo 3: Proprietário Valida
```
Proprietário recebe notificação
Confirma disponibilidade da vaga
Reserva ativada
```

### Passo 4: Cancelamento ou Reembolso (Opcional)
```
PUT /api/reservas/[id]/pagamento
{
  "statusPagamento": "CANCELADO" | "REEMBOLSADO"
}
```

---

## 4. API Endpoints

### GET `/api/reservas/[id]/pagamento`
**Obter status de pagamento da reserva**

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "reserva_id",
    "valor": "250.00",
    "status": "ativa",
    "statusPagamento": "PENDENTE",
    "dataInicio": "2025-12-01T10:00:00Z",
    "dataFim": "2025-12-05T18:00:00Z",
    "tipoLocacao": "DIARIA"
  }
}
```

### PUT `/api/reservas/[id]/pagamento`
**Confirmar ou atualizar status de pagamento**

**Body:**
```json
{
  "statusPagamento": "CONFIRMADO",
  "metodo": "MANUAL",
  "referencia": "PIX_123456"
}
```

**Validações:**
- Transições de status válidas:
  - PENDENTE → CONFIRMADO, CANCELADO
  - CONFIRMADO → REEMBOLSADO, CANCELADO
  - CANCELADO → (nenhuma)
  - REEMBOLSADO → (nenhuma)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "reserva_id",
    "statusPagamento": "CONFIRMADO",
    "valor": "250.00",
    "metodo": "MANUAL",
    "referencia": "PIX_123456",
    "atualizadoEm": "2025-11-25T12:30:00Z"
  }
}
```

---

## 5. Componentes React

### `ConfirmadorPagamento`
**Localização:** `src/components/vagas/ConfirmadorPagamento.tsx`

**Props:**
```typescript
interface ConfirmadorPagamentoProps {
  reserva: Reserva;
  onPagamentoConfirmado: (reserva: Reserva) => void;
}
```

**Funcionalidades:**
- ✅ Exibir status de pagamento com ícones
- ✅ Seletor de método de pagamento
- ✅ Botão para confirmar pagamento
- ✅ Mensagens de status
- ✅ Tratamento de erros

**Métodos Suportados:**
- MANUAL - Pagamento manual com comprovante
- PIX - Transferência instantânea
- CARTAO - Cartão de crédito
- TRANSFERENCIA - Transferência bancária

### `MinhasReservas` (Atualizado)
- Exibe status de pagamento com badge colorida
- Mostra "Aguardando Pagamento" em amarelo
- Mostra "Pago" em verde

---

## 6. Fluxo de Uso

### Cenário 1: Morador Confirma Pagamento

```
1. Morador acessa "Minhas Reservas"
2. Vê reserva com status "Aguardando Pagamento"
3. Clica em "Confirmar Pagamento"
4. Seleciona método (PIX, Cartão, etc)
5. Clica em "Confirmar Pagamento"
6. Sistema atualiza status para "CONFIRMADO"
7. Proprietário recebe notificação
8. Morador recebe confirmação por email
```

### Cenário 2: Proprietário Cancela Pagamento

```
1. Proprietário recebe notificação de pagamento
2. Valida comprovante
3. Se inválido, cancela pagamento
4. Sistema atualiza status para "CANCELADO"
5. Morador é notificado
6. Morador pode criar nova reserva
```

### Cenário 3: Reembolso

```
1. Morador cancela reserva
2. Sistema atualiza status para "REEMBOLSADO"
3. Valor é devolvido ao morador
4. Ambos recebem notificação
```

---

## 7. Transições de Status Válidas

```
PENDENTE
├── → CONFIRMADO (Morador confirma pagamento)
└── → CANCELADO (Proprietário rejeita ou morador cancela)

CONFIRMADO
├── → REEMBOLSADO (Reembolso processado)
└── → CANCELADO (Cancelamento após confirmação)

CANCELADO (Terminal)
└── (Sem transições)

REEMBOLSADO (Terminal)
└── (Sem transições)
```

---

## 8. Integração com Sistemas de Pagamento

### Preparação para Stripe

```typescript
// Futuro: Integração com Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentIntent = await stripe.paymentIntents.create({
  amount: reserva.valor * 100, // em centavos
  currency: 'brl',
  metadata: {
    reservaId: reserva.id,
    vagaId: reserva.vagaId,
  },
});
```

### Preparação para PayPal

```typescript
// Futuro: Integração com PayPal
const paypalClient = new paypal.core.PayPalHttpClient(environment);

const request = new paypal.orders.OrdersCreateRequest();
request.prefer("return=representation");
request.requestBody({
  intent: "CAPTURE",
  purchase_units: [{
    amount: {
      currency_code: "BRL",
      value: reserva.valor.toString(),
    },
  }],
});
```

---

## 9. Segurança

### Validações Implementadas:
- ✅ Transições de status validadas
- ✅ Apenas proprietário pode confirmar/rejeitar
- ✅ Apenas morador pode cancelar sua reserva
- ✅ Logs de auditoria de transações
- ✅ Validação de valores

### Recomendações:
- [ ] Implementar autenticação de dois fatores para pagamentos
- [ ] Usar HTTPS obrigatoriamente
- [ ] Criptografar dados sensíveis
- [ ] Implementar rate limiting
- [ ] Validar IPs de origem
- [ ] Usar webhooks para confirmação de pagamento

---

## 10. Notificações

### Email para Morador (Após Confirmar Pagamento):
```
Assunto: Pagamento Confirmado - Reserva Vaga 01

Olá [Nome],

Seu pagamento foi confirmado com sucesso!

Detalhes:
- Vaga: 01 (Tipo: COBERTA)
- Período: 01/12/2025 a 05/12/2025
- Valor: R$ 250,00
- Método: PIX

O proprietário foi notificado e em breve entrará em contato.

Comprovante: [Link]
```

### Email para Proprietário (Após Confirmar Pagamento):
```
Assunto: Novo Pagamento Recebido - Vaga 01

Olá [Nome],

Um morador confirmou o pagamento para sua vaga!

Detalhes:
- Vaga: 01
- Morador: [Nome]
- Período: 01/12/2025 a 05/12/2025
- Valor: R$ 250,00
- Comprovante: [Link]

Ação necessária: Confirme a disponibilidade da vaga
```

---

## 11. Relatórios e Estatísticas

### Dados Disponíveis:
- Total de pagamentos pendentes
- Total de pagamentos confirmados
- Total de reembolsos
- Receita por período
- Taxa de conversão (confirmado/total)

### Query de Exemplo:
```typescript
const estatisticas = await prisma.reserva.groupBy({
  by: ['statusPagamento'],
  _count: true,
  _sum: {
    valor: true,
  },
  where: {
    condominioId: condominioId,
    criadoEm: {
      gte: new Date('2025-11-01'),
      lte: new Date('2025-11-30'),
    },
  },
});
```

---

## 12. Testes Recomendados

### Testes Unitários:
- [ ] Validar transições de status
- [ ] Validar cálculo de valores
- [ ] Validar métodos de pagamento

### Testes de Integração:
- [ ] Criar reserva → Confirmar pagamento
- [ ] Confirmar pagamento → Notificar proprietário
- [ ] Cancelar pagamento → Liberar vaga
- [ ] Reembolsar pagamento → Devolver valor

### Testes E2E:
- [ ] Fluxo completo de pagamento
- [ ] Validação de emails
- [ ] Integração com gateway de pagamento

---

## 13. Roadmap Futuro

### Curto Prazo (1-2 meses):
- [ ] Integração com Stripe
- [ ] Integração com PayPal
- [ ] Sistema de notificações por email
- [ ] Dashboard de pagamentos

### Médio Prazo (2-4 meses):
- [ ] Integração com Pix automático
- [ ] Relatórios financeiros
- [ ] Extrato de pagamentos
- [ ] Recibos digitais

### Longo Prazo (4+ meses):
- [ ] Assinatura recorrente
- [ ] Parcelamento de pagamentos
- [ ] Integração com contabilidade
- [ ] Análise de fraude

---

## 14. Troubleshooting

### Problema: Transição de Status Inválida
**Solução:** Verifique o status atual e consulte a tabela de transições válidas

### Problema: Pagamento Não Confirmado
**Solução:** Verifique se o método foi selecionado e se há conexão com a internet

### Problema: Email Não Recebido
**Solução:** Verifique spam, configure SPF/DKIM, valide email do remetente

---

## 15. Contato e Suporte

Para dúvidas sobre o sistema de pagamento:
- Documentação: `/SISTEMA_PAGAMENTO.md`
- API: `/api/reservas/[id]/pagamento`
- Componentes: `src/components/vagas/ConfirmadorPagamento.tsx`
