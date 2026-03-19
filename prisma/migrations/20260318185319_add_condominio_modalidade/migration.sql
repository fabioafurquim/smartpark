-- CreateEnum
CREATE TYPE "public"."ModalidadeCondominio" AS ENUM ('EMPRESTIMO', 'LOCACAO', 'HIBRIDO');

-- AlterTable
ALTER TABLE "public"."condominios" ADD COLUMN     "modalidade" "public"."ModalidadeCondominio" NOT NULL DEFAULT 'EMPRESTIMO';
