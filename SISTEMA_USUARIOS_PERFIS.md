# Sistema de Usuários e Perfis

**Data:** 25 de Novembro de 2025  
**Status:** ✅ Implementado  
**Versão:** 1.0.0

---

## 📋 Visão Geral

Sistema completo de gerenciamento de usuários e perfis, permitindo que administradores mestres e síndicos cadastrem usuários e associem-os a vagas e condomínios.

---

## 🎯 Funcionalidades

### ✅ Gerenciamento de Usuários
- Criar novos usuários
- Editar usuários existentes
- Deletar usuários
- Listar usuários com filtros
- Buscar por nome ou email
- Filtrar por tipo de perfil

### ✅ Gerenciamento de Perfis
- Associar múltiplos perfis a um usuário
- 4 tipos de perfil:
  - **administrador_mestre** - Acesso total ao sistema
  - **administrador_condominio** - Gerencia um condomínio específico
  - **sindico** - Aprova solicitações e relatórios
  - **morador** - Acesso básico (visualiza perfil)
- Ativar/desativar perfis
- Permissões customizáveis por perfil

### ✅ Segurança
- Apenas administrador mestre pode gerenciar usuários
- Proteção contra exclusão do próprio usuário
- Proteção contra exclusão do último admin mestre
- Hash de senha com bcryptjs
- Validação de email único

---

## 🔌 API REST

### Endpoints

#### GET `/api/admin/usuarios`
**Lista todos os usuários**

Parâmetros:
- `busca` (opcional) - Busca por nome ou email
- `tipo` (opcional) - Filtrar por tipo de perfil
- `ativo` (opcional) - Filtrar por status
- `pagina` (opcional) - Número da página
- `limite` (opcional) - Itens por página

Resposta:
```json
[
  {
    "id": "user_123",
    "nome": "João Silva",
    "email": "joao@exemplo.com",
    "ativo": true,
    "perfis": [
      {
        "id": "perfil_123",
        "tipo": "administrador_mestre",
        "ativo": true,
        "condominio": {
          "id": "cond_123",
          "nome": "Condomínio A"
        }
      }
    ],
    "criadoEm": "2025-11-25T10:00:00Z"
  }
]
```

#### POST `/api/admin/usuarios`
**Criar novo usuário**

Body:
```json
{
  "nome": "João Silva",
  "email": "joao@exemplo.com",
  "senha": "senha123",
  "perfis": [
    {
      "condominioId": "cond_123",
      "tipo": "administrador_mestre",
      "ativo": true,
      "permissoes": {
        "gerenciarUsuarios": true,
        "gerenciarVagas": true
      }
    }
  ]
}
```

#### GET `/api/admin/usuarios/[id]`
**Obter usuário específico**

Resposta: Mesmo formato do POST

#### PUT `/api/admin/usuarios/[id]`
**Atualizar usuário**

Body:
```json
{
  "nome": "João Silva Atualizado",
  "email": "joao.novo@exemplo.com",
  "senha": "novaSenha123",
  "perfis": [
    {
      "condominioId": "cond_123",
      "tipo": "sindico",
      "ativo": true
    }
  ]
}
```

#### DELETE `/api/admin/usuarios/[id]`
**Deletar usuário**

Validações:
- Não pode deletar a si mesmo
- Não pode deletar o último admin mestre

---

## 🎨 Frontend

### Página de Usuários
**Localização:** `src/app/dashboard/usuarios/page.tsx`

**Funcionalidades:**
- ✅ Tabela com lista de usuários
- ✅ Busca por nome/email
- ✅ Filtro por tipo de perfil
- ✅ Botão para criar novo usuário
- ✅ Editar usuário
- ✅ Deletar usuário
- ✅ Resumo de estatísticas
- ✅ Indicador de status (ativo/inativo)

**Componentes:**
- `UsuariosPage` - Página principal
- `UsuarioModal` - Modal para criar/editar

### Modal de Usuário
**Localização:** `src/components/modals/UsuarioModal.tsx`

**Funcionalidades:**
- ✅ Formulário para criar/editar usuário
- ✅ Validação de campos
- ✅ Adição/remoção de perfis
- ✅ Seleção de condomínio
- ✅ Seleção de tipo de perfil
- ✅ Ativação/desativação de perfil
- ✅ Carregamento de condomínios

---

## 📊 Tipos TypeScript

```typescript
interface Usuario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  perfis: Perfil[];
  criadoEm: string;
}

interface Perfil {
  id: string;
  tipo: 'administrador_mestre' | 'administrador_condominio' | 'sindico' | 'morador';
  ativo: boolean;
  condominio?: {
    id: string;
    nome: string;
  };
}

interface UsuarioFormData {
  nome: string;
  email: string;
  senha?: string;
  perfis: Array<{
    condominioId: string;
    tipo: 'administrador_mestre' | 'administrador_condominio' | 'sindico' | 'morador';
    ativo?: boolean;
  }>;
}
```

---

## 🔄 Fluxos de Uso

### Fluxo 1: Criar Novo Usuário

```
1. Admin Mestre acessa /dashboard/usuarios
2. Clica em "Novo Usuário"
3. Modal abre
4. Preenche:
   - Nome
   - Email
   - Senha
   - Perfis (condomínio + tipo)
5. Clica "Criar"
6. Usuário criado com sucesso
7. Aparece na lista
```

### Fluxo 2: Editar Usuário

```
1. Admin Mestre acessa /dashboard/usuarios
2. Clica no ícone de edição
3. Modal abre com dados preenchidos
4. Modifica campos desejados
5. Clica "Atualizar"
6. Usuário atualizado
7. Lista atualiza automaticamente
```

### Fluxo 3: Deletar Usuário

```
1. Admin Mestre acessa /dashboard/usuarios
2. Clica no ícone de lixeira
3. Confirmação solicitada
4. Se confirmar:
   - Usuário deletado
   - Lista atualiza
5. Se cancelar:
   - Nada acontece
```

### Fluxo 4: Filtrar Usuários

```
1. Admin Mestre acessa /dashboard/usuarios
2. Preenche busca (nome/email)
3. Seleciona tipo de perfil
4. Clica "Atualizar"
5. Lista filtra em tempo real
```

---

## 🔐 Permissões

### Administrador Mestre
- ✅ Criar usuários
- ✅ Editar usuários
- ✅ Deletar usuários
- ✅ Gerenciar perfis
- ✅ Gerenciar condomínios
- ✅ Gerenciar vagas

### Administrador Condomínio
- ✅ Gerenciar vagas do condomínio
- ✅ Gerenciar torres e unidades
- ✅ Visualizar moradores
- ❌ Criar usuários (apenas admin mestre)

### Síndico
- ✅ Aprovar solicitações
- ✅ Visualizar relatórios
- ✅ Gerenciar reservas
- ❌ Criar usuários

### Morador
- ✅ Visualizar perfil
- ✅ Visualizar vagas
- ✅ Criar reservas
- ❌ Gerenciar usuários

---

## 📁 Estrutura de Arquivos

```
src/
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── usuarios/
│   │           ├── route.ts          (GET, POST)
│   │           └── [id]/
│   │               └── route.ts      (GET, DELETE, PUT)
│   └── dashboard/
│       └── usuarios/
│           └── page.tsx              (Página principal)
│
└── components/
    └── modals/
        └── UsuarioModal.tsx          (Modal de criar/editar)
```

---

## ✅ Validações

### Frontend
- ✅ Nome obrigatório (mín. 2 caracteres)
- ✅ Email obrigatório e válido
- ✅ Senha obrigatória para novo usuário (mín. 6 caracteres)
- ✅ Ao menos um perfil obrigatório
- ✅ Condomínio obrigatório por perfil
- ✅ Tipo de perfil obrigatório

### Backend
- ✅ Validação de autenticação
- ✅ Validação de permissão (apenas admin mestre)
- ✅ Validação de email único
- ✅ Validação de condomínio existente
- ✅ Proteção contra auto-exclusão
- ✅ Proteção do último admin mestre

---

## 🎨 Design

### Paleta de Cores por Perfil
- **Admin Mestre:** Vermelho (#EF4444)
- **Admin Condomínio:** Azul (#3B82F6)
- **Síndico:** Roxo (#A855F7)
- **Morador:** Verde (#10B981)

### Componentes Utilizados
- Tabela responsiva
- Modal com validação
- Filtros e busca
- Badges de status
- Ícones do Lucide React
- Estilos com Tailwind CSS

---

## 🚀 Como Usar

### Acessar Gerenciamento de Usuários
```
1. Faça login como Admin Mestre
2. Acesse /dashboard/usuarios
3. Você verá a lista de usuários
```

### Criar Novo Usuário
```
1. Clique em "Novo Usuário"
2. Preencha os dados
3. Adicione perfis
4. Clique em "Criar"
```

### Editar Usuário
```
1. Clique no ícone de edição
2. Modifique os dados
3. Clique em "Atualizar"
```

### Deletar Usuário
```
1. Clique no ícone de lixeira
2. Confirme a exclusão
```

---

## 📊 Estatísticas

A página exibe:
- Total de usuários
- Usuários ativos
- Admins mestres
- Moradores

---

## 🔄 Integração com Vagas

Após criar um usuário com perfil de **morador**, ele pode:
- Visualizar vagas disponíveis
- Criar reservas
- Gerenciar suas reservas
- Confirmar pagamentos

---

## 🐛 Tratamento de Erros

### Erros Comuns
- Email já em uso → Retorna 409
- Usuário não encontrado → Retorna 404
- Não autorizado → Retorna 401
- Acesso negado → Retorna 403
- Dados inválidos → Retorna 400

### Mensagens de Erro
- "Não autorizado"
- "Acesso negado"
- "Usuário não encontrado"
- "Email já está em uso"
- "Não é possível excluir seu próprio usuário"
- "Não é possível excluir o último administrador mestre"

---

## 📝 Notas Técnicas

- Senhas são hasheadas com bcryptjs (10 rounds)
- Emails são únicos no banco de dados
- Perfis podem ser ativados/desativados sem deletar
- Um usuário pode ter múltiplos perfis em diferentes condomínios
- Permissões são armazenadas como JSON no banco

---

## 🔮 Recursos Futuros

- [ ] Recuperação de senha
- [ ] Autenticação de dois fatores
- [ ] Auditoria de ações
- [ ] Histórico de alterações
- [ ] Exportação de usuários
- [ ] Importação em lote
- [ ] Sincronização com LDAP/Active Directory

---

**Versão:** 1.0.0  
**Status:** ✅ Pronto para Produção  
**Autor:** Sistema SmartPark
