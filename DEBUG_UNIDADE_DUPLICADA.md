# Debug - Erro de Unidade Duplicada ao Criar Nova

**Data:** 25 de Novembro de 2025

---

## 🐛 Problema

Ao deletar uma unidade e tentar criar uma nova com o mesmo número na mesma torre, recebe erro:
```
Já existe uma unidade com este número nesta torre/bloco
```

---

## 🔍 Causas Possíveis

### 1. **Soft Delete (Mais Provável)**
- A unidade não foi realmente deletada, apenas marcada como deletada
- O banco ainda tem o registro

### 2. **Cache do Prisma**
- O cliente Prisma está usando cache
- Precisa reiniciar o servidor

### 3. **Delay de Replicação**
- Se usar replicação de banco, há delay
- Tente aguardar alguns segundos

### 4. **Vagas Vinculadas**
- Há vagas vinculadas à unidade
- Não é possível deletar unidade com vagas

---

## 🧪 Como Debugar

### Passo 1: Verifique o Console do Servidor
Ao tentar criar a unidade, você deve ver um log:
```
🔴 Unidade duplicada encontrada: {
  numero: "101",
  torreId: "...",
  unidadeExistenteId: "...",
  unidadeExistenteCondominioId: "..."
}
```

### Passo 2: Verifique o Banco de Dados
Conecte ao PostgreSQL e execute:
```sql
SELECT id, numero, torreId, deletedAt FROM unidades 
WHERE numero = '101' AND torreId = 'TORRE_ID';
```

Se houver um registro com `deletedAt` preenchido, é soft delete.

### Passo 3: Verifique as Vagas
```sql
SELECT COUNT(*) FROM vagas WHERE unidadeId = 'UNIDADE_ID';
```

Se houver vagas, elas também precisam ser deletadas.

---

## ✅ Soluções

### Solução 1: Reiniciar o Servidor
```bash
npm run dev
```

Isso limpa o cache do Prisma.

### Solução 2: Aguardar Alguns Segundos
Após deletar, aguarde 5-10 segundos antes de criar a nova unidade.

### Solução 3: Verificar Vagas
Se o erro persistir, verifique se há vagas vinculadas:
1. Estrutura → Vagas
2. Procure por vagas da unidade deletada
3. Delete as vagas também

### Solução 4: Limpar Banco (Último Recurso)
Se nada funcionar, delete manualmente do banco:
```sql
DELETE FROM unidades WHERE id = 'UNIDADE_ID';
```

---

## 📝 Logs Adicionados

A API agora registra quando encontra uma unidade duplicada:
- **Arquivo:** `src/app/api/unidades/route.ts`
- **Linha:** 155-160
- **Log:** `🔴 Unidade duplicada encontrada:`

Isso ajuda a debugar o problema.

---

## 🚀 Próximas Ações

1. Reinicie o servidor
2. Tente criar a unidade novamente
3. Se o erro persistir, verifique o console do servidor para o log `🔴`
4. Se o log aparecer, o banco ainda tem o registro (soft delete)

---

**Status:** 🟡 Aguardando Feedback
