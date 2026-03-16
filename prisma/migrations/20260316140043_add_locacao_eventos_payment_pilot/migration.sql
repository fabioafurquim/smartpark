-- AlterTable
ALTER TABLE "public"."locacoes" ADD COLUMN     "pagamentoObservacao" TEXT,
ADD COLUMN     "pagamentoPrevistoEm" TIMESTAMP(3),
ADD COLUMN     "pagamentoReferencia" TEXT,
ADD COLUMN     "statusPagamento" "public"."StatusPagamento" NOT NULL DEFAULT 'PENDENTE';

-- CreateTable
CREATE TABLE "public"."locacoes_eventos" (
    "id" TEXT NOT NULL,
    "locacaoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locacoes_eventos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."locacoes_eventos" ADD CONSTRAINT "locacoes_eventos_locacaoId_fkey" FOREIGN KEY ("locacaoId") REFERENCES "public"."locacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."locacoes_eventos" ADD CONSTRAINT "locacoes_eventos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
