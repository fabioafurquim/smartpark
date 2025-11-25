-- CreateEnum
CREATE TYPE "public"."TipoLocacao" AS ENUM ('HORA', 'DIARIA', 'MENSAL', 'ANUAL');

-- AlterTable
ALTER TABLE "public"."reservas" ADD COLUMN     "tipoLocacao" "public"."TipoLocacao",
ADD COLUMN     "valor" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "public"."configuracoes_locacao_vaga" (
    "id" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "disponivel" BOOLEAN NOT NULL DEFAULT false,
    "tiposPermitidos" "public"."TipoLocacao"[],
    "valorHora" DECIMAL(10,2),
    "valorDiaria" DECIMAL(10,2),
    "valorMensal" DECIMAL(10,2),
    "valorAnual" DECIMAL(10,2),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_locacao_vaga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_locacao_vaga_vagaId_key" ON "public"."configuracoes_locacao_vaga"("vagaId");

-- AddForeignKey
ALTER TABLE "public"."configuracoes_locacao_vaga" ADD CONSTRAINT "configuracoes_locacao_vaga_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "public"."vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
