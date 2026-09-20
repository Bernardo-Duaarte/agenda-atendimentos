-- AlterTable
ALTER TABLE "Configuracao" ADD COLUMN     "diasNormais" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
ALTER COLUMN "horaAbertura" SET DEFAULT '07:00',
ALTER COLUMN "horaFechamento" SET DEFAULT '21:00';

-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "precoForaHorarioCentavos" INTEGER;
