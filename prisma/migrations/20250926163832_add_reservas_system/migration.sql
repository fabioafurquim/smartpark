/*
  Warnings:

  - Made the column `unidadeId` on table `vagas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."vagas" ALTER COLUMN "unidadeId" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."reservas" (
    "id" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."reservas" ADD CONSTRAINT "reservas_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "public"."vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reservas" ADD CONSTRAINT "reservas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reservas" ADD CONSTRAINT "reservas_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "public"."condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
