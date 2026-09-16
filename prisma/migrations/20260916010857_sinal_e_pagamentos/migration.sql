-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('SINAL', 'RESTANTE', 'EXTRA', 'DEVOLUCAO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA');

-- AlterEnum
ALTER TYPE "StatusAgendamento" ADD VALUE 'PRE_AGENDAMENTO';

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "sinalCentavos" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "percentualSinal" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "tipo" "TipoPagamento" NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "pagoEm" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pagamento_agendamentoId_idx" ON "Pagamento"("agendamentoId");

-- CreateIndex
CREATE INDEX "Pagamento_pagoEm_idx" ON "Pagamento"("pagoEm");

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
