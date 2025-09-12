/*
  Warnings:

  - The `andar` column on the `unidades` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `condominioId` to the `unidades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `condominioId` to the `vagas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."torres" ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'TORRE';

-- AlterTable
ALTER TABLE "public"."unidades" ADD COLUMN     "condominioId" TEXT NOT NULL,
ADD COLUMN     "contato" TEXT,
ADD COLUMN     "proprietario" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'APARTAMENTO',
DROP COLUMN "andar",
ADD COLUMN     "andar" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."vagas" ADD COLUMN     "condominioId" TEXT NOT NULL,
ALTER COLUMN "tipo" SET DEFAULT 'COBERTA',
ALTER COLUMN "unidadeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."unidades" ADD CONSTRAINT "unidades_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "public"."condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vagas" ADD CONSTRAINT "vagas_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "public"."condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
