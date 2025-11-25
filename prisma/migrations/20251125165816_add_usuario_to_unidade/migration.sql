-- AlterTable
ALTER TABLE "public"."unidades" ADD COLUMN     "usuarioId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."unidades" ADD CONSTRAINT "unidades_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
