-- CreateEnum
CREATE TYPE "public"."StatusPagamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'REEMBOLSADO');

-- AlterTable
ALTER TABLE "public"."reservas" ADD COLUMN     "statusPagamento" "public"."StatusPagamento" NOT NULL DEFAULT 'PENDENTE';
