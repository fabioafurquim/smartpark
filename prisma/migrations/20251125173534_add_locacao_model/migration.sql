-- CreateTable
CREATE TABLE "public"."locacoes" (
    "id" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "locatarioId" TEXT NOT NULL,
    "proprietarioId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "tipoLocacao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locacoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."locacoes" ADD CONSTRAINT "locacoes_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "public"."vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."locacoes" ADD CONSTRAINT "locacoes_locatarioId_fkey" FOREIGN KEY ("locatarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."locacoes" ADD CONSTRAINT "locacoes_proprietarioId_fkey" FOREIGN KEY ("proprietarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
