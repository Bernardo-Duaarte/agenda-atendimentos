-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "ocupaMaquiadora" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ocupaPenteadista" BOOLEAN NOT NULL DEFAULT false;
