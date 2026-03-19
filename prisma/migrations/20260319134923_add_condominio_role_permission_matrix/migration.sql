-- CreateTable
CREATE TABLE "public"."configuracoes_permissao_perfil" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "tipoPerfil" TEXT NOT NULL,
    "permissoes" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_permissao_perfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_permissao_perfil_condominioId_tipoPerfil_key" ON "public"."configuracoes_permissao_perfil"("condominioId", "tipoPerfil");

-- AddForeignKey
ALTER TABLE "public"."configuracoes_permissao_perfil" ADD CONSTRAINT "configuracoes_permissao_perfil_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "public"."condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
