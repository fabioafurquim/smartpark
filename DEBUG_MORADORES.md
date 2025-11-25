# Debug - Moradores não aparecem no Autocomplete

**Data:** 25 de Novembro de 2025

---

## 🔍 Passos para Debugar

### 1. Abra o Console do Navegador
- Pressione `F12` ou `Ctrl+Shift+I`
- Vá para a aba "Console"

### 2. Edite uma Unidade
- Estrutura → Unidades
- Clique em editar uma unidade
- Selecione um condomínio

### 3. Verifique os Logs
Você deve ver logs como:

```
📊 Dados da API: { usuarios: [...], total: X, pagina: 1, limite: 20 }
🏢 Condomínio selecionado: abc123...
👤 Paulo: perfil condominioId=abc123..., tipo=morador
✅ Usuários filtrados: [...]
```

---

## ✅ Correções Implementadas

### 1. **API Retorna Estrutura Correta**
- Antes: Retornava apenas array de usuários
- Depois: Retorna `{ usuarios, total, pagina, limite }`

### 2. **Comparação Case-Insensitive**
- Antes: `tipo === 'morador'` (exato)
- Depois: `tipo.equals('morador', mode: 'insensitive')`
- Funciona com `morador`, `MORADOR`, `Morador`

### 3. **Logs de Debug**
- Mostra dados da API
- Mostra condomínio selecionado
- Mostra cada perfil sendo verificado
- Mostra usuários filtrados

---

## 🧪 Como Testar Agora

### Teste 1: Verificar Dados da API
1. Abra o Console (F12)
2. Edite uma unidade
3. ✅ Deve ver `📊 Dados da API:` com os usuários

### Teste 2: Verificar Filtro
1. Abra o Console
2. Edite uma unidade
3. ✅ Deve ver `👤 Paulo: perfil condominioId=...`
4. ✅ Deve ver `✅ Usuários filtrados:` com Paulo

### Teste 3: Buscar Morador
1. No campo "Associar Morador", digite "paulo"
2. ✅ Deve aparecer Paulo na lista

---

## 🐛 Se Ainda Não Funcionar

### Verifique:
1. **Paulo tem perfil de morador?**
   - Dashboard → Usuários
   - Clique em Paulo
   - Deve ter perfil "morador" no condomínio

2. **Paulo está ativo?**
   - Dashboard → Usuários
   - Clique em Paulo
   - Status deve ser "Ativo"

3. **Qual é o tipo do perfil?**
   - Abra o Console
   - Veja o log `👤 Paulo: perfil condominioId=..., tipo=...`
   - Tipo deve ser `morador` (minúsculo)

---

## 📋 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/app/api/admin/usuarios/route.ts` | ✅ Retorna estrutura correta + case-insensitive |
| `src/components/modals/UnidadeModal.tsx` | ✅ Logs de debug adicionados |

---

## 🚀 Próximo Passo

1. Reinicie o servidor
2. Abra o Console (F12)
3. Edite uma unidade
4. Verifique os logs
5. Se funcionar, remova os `console.log` de debug

---

**Status:** 🟡 Aguardando Feedback
