# ⚠️ Reinicie o Servidor Next.js

## Problema
A rota `/dashboard/usuarios` retorna 404 porque o servidor Next.js não reconheceu a nova página criada.

## Solução

### Opção 1: Reiniciar o Servidor (Recomendado)

```bash
# 1. Parar o servidor atual (Ctrl+C no terminal)
# 2. Limpar cache do Next.js
rm -r .next

# 3. Reiniciar o servidor
npm run dev
```

### Opção 2: Apenas Parar e Iniciar

```bash
# 1. Parar o servidor (Ctrl+C)
# 2. Iniciar novamente
npm run dev
```

### Opção 3: Build e Iniciar Produção

```bash
# 1. Fazer build
npm run build

# 2. Iniciar em produção
npm start
```

## Após Reiniciar

Acesse: `http://localhost:3000/dashboard/usuarios`

Você deverá ver:
- ✅ Página de gerenciamento de usuários
- ✅ Tabela vazia (ou com usuários existentes)
- ✅ Botão "Novo Usuário"
- ✅ Filtros de busca

## O que Mudou

Foram criados:
- `src/app/dashboard/usuarios/page.tsx` - Página principal
- `src/components/modals/UsuarioModal.tsx` - Modal de criar/editar
- `PUT /api/admin/usuarios/[id]` - Rota para atualizar usuários

O Next.js precisa reconhecer esses novos arquivos, por isso é necessário reiniciar.

## Verificação

Após reiniciar, teste:

```bash
# 1. Acesse a página
http://localhost:3000/dashboard/usuarios

# 2. Verifique se a API funciona
curl http://localhost:3000/api/admin/usuarios

# 3. Verifique se há erros no console
# Procure por mensagens de erro em vermelho
```

## Problemas Comuns

### Erro: "Cannot find module '@/components/modals/UsuarioModal'"
- Solução: Reinicie o servidor com `npm run dev`

### Erro: "404 - This page could not be found"
- Solução: Limpe o cache com `rm -r .next` e reinicie

### Erro: "Port 3000 already in use"
- Solução: Mude a porta com `npm run dev -- -p 3001`

## Próximos Passos

1. ✅ Reinicie o servidor
2. ✅ Acesse `/dashboard/usuarios`
3. ✅ Teste criar um novo usuário
4. ✅ Teste editar um usuário
5. ✅ Teste deletar um usuário

---

**Criado em:** 25 de Novembro de 2025
