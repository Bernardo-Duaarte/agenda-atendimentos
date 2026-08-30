/*
  Warnings:

  - You are about to drop the column `custoCentavos` on the `MovimentoEstoque` table. All the data in the column will be lost.
  - You are about to drop the column `custoCentavos` on the `Produto` table. All the data in the column will be lost.
  - Added the required column `conteudoEmbalagem` to the `Produto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `custoUnitarioCentavos` to the `Produto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MovimentoEstoque" DROP COLUMN "custoCentavos",
ADD COLUMN     "custoTotalCentavos" INTEGER;

-- AlterTable
ALTER TABLE "Produto" DROP COLUMN "custoCentavos",
ADD COLUMN     "conteudoEmbalagem" DECIMAL(10,3) NOT NULL,
ADD COLUMN     "custoUnitarioCentavos" INTEGER NOT NULL;
