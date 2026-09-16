-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "distanciaMetros" INTEGER;

-- AlterTable
ALTER TABLE "Configuracao" ADD COLUMN     "taxaBaseCentavos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxaPorKmCentavos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxaPorMinutoCentavos" INTEGER NOT NULL DEFAULT 0;
