-- CreateTable
CREATE TABLE "public"."configuracao_sistema" (
    "id" TEXT NOT NULL,
    "administradorMestreConfigurado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."condominios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "codigoUnico" TEXT NOT NULL,
    "logoUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condominios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."torres" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "condominioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "torres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."unidades" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "andar" TEXT,
    "torreId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vagas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'comum',
    "unidadeId" TEXT NOT NULL,
    "proprietarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vagas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."perfis_usuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "permissoes" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfis_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."solicitacoes_cadastro" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "unidadeId" TEXT,
    "vagaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_cadastro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "condominios_codigoUnico_key" ON "public"."condominios"("codigoUnico");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_usuario_usuarioId_condominioId_tipo_key" ON "public"."perfis_usuario"("usuarioId", "condominioId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "public"."accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "public"."verification_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "public"."torres" ADD CONSTRAINT "torres_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "public"."condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."unidades" ADD CONSTRAINT "unidades_torreId_fkey" FOREIGN KEY ("torreId") REFERENCES "public"."torres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vagas" ADD CONSTRAINT "vagas_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vagas" ADD CONSTRAINT "vagas_proprietarioId_fkey" FOREIGN KEY ("proprietarioId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."perfis_usuario" ADD CONSTRAINT "perfis_usuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."perfis_usuario" ADD CONSTRAINT "perfis_usuario_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "public"."condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."solicitacoes_cadastro" ADD CONSTRAINT "solicitacoes_cadastro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."solicitacoes_cadastro" ADD CONSTRAINT "solicitacoes_cadastro_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "public"."condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."solicitacoes_cadastro" ADD CONSTRAINT "solicitacoes_cadastro_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."solicitacoes_cadastro" ADD CONSTRAINT "solicitacoes_cadastro_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "public"."vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
