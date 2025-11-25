# Debug - Vagas não encontra Unidades

**Data:** 25 de Novembro de 2025

---

## 🐛 Problema

Ao tentar cadastrar uma nova vaga, o seletor de unidades não mostra nenhuma unidade, mesmo tendo unidades cadastradas.

---

## 🔍 Como Debugar

### Passo 1: Abra o Console do Navegador (F12)

### Passo 2: Vá para Estrutura → Vagas

Você deve ver logs como:
```
📦 Dados da API de condomínios: { condominios: [...], pagination: {...} }
🏢 Condomínios carregados: [...]
✅ Selecionando primeiro condomínio: abc123...
```

### Passo 3: Clique em "Nova Vaga"

Você deve ver logs do UnidadeSelector:
```
🔍 DEBUG UnidadeSelector - Buscando unidades para condominioId: abc123...
🔍 DEBUG UnidadeSelector - URL da requisição: /api/unidades?condominioId=abc123...
🔍 DEBUG UnidadeSelector - Status da resposta: 200
🔍 DEBUG UnidadeSelector - Dados recebidos: [...]
🔍 DEBUG UnidadeSelector - Número de unidades: X
```

---

## ✅ Checklist de Diagnóstico

- [ ] **Condomínios carregam?**
  - Procure pelo log `🏢 Condomínios carregados:`
  - Se não aparecer, há erro ao carregar condomínios

- [ ] **Condomínio é selecionado?**
  - Procure pelo log `✅ Selecionando primeiro condomínio:`
  - Se não aparecer, nenhum condomínio foi carregado

- [ ] **UnidadeSelector recebe o condominioId?**
  - Procure pelo log `🔍 DEBUG UnidadeSelector - Buscando unidades para condominioId:`
  - Se não aparecer, o condominioId não foi passado

- [ ] **API de unidades retorna dados?**
  - Procure pelo log `🔍 DEBUG UnidadeSelector - Dados recebidos:`
  - Se não aparecer, há erro na API

- [ ] **Unidades aparecem no dropdown?**
  - Procure pelo log `🔍 DEBUG UnidadeSelector - Número de unidades: X`
  - Se X = 0, não há unidades no condomínio

---

## 🔧 Soluções Possíveis

### Se condomínios não carregam:
1. Verifique se há condomínios cadastrados
2. Verifique a API `/api/condominios`
3. Verifique permissões do usuário

### Se UnidadeSelector não recebe condominioId:
1. Verifique se `condominioSelecionado` está preenchido
2. Verifique se está sendo passado como `selectedCondominioId`

### Se API de unidades não retorna dados:
1. Verifique se há unidades no condomínio
2. Verifique a API `/api/unidades?condominioId=...`
3. Verifique se o condomínio está correto

### Se unidades aparecem mas não são exibidas:
1. Verifique o CSS do dropdown
2. Verifique se há erro no render

---

## 📝 Logs Adicionados

**Arquivo:** `src/app/dashboard/estrutura/vagas/page.tsx`
- `📦 Dados da API de condomínios`
- `🏢 Condomínios carregados`
- `✅ Selecionando primeiro condomínio`

**Arquivo:** `src/components/ui/UnidadeSelector.tsx`
- `🔍 DEBUG UnidadeSelector - Buscando unidades para condominioId`
- `🔍 DEBUG UnidadeSelector - URL da requisição`
- `🔍 DEBUG UnidadeSelector - Status da resposta`
- `🔍 DEBUG UnidadeSelector - Dados recebidos`
- `🔍 DEBUG UnidadeSelector - Número de unidades`

---

## 🚀 Próximos Passos

1. Abra o Console (F12)
2. Vá para Estrutura → Vagas
3. Clique em "Nova Vaga"
4. Verifique os logs
5. Compartilhe os logs para diagnóstico

---

**Status:** 🟡 Aguardando Feedback
