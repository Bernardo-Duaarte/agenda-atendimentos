-- Preço fora do horário deixa de ser um valor alternativo e vira acréscimo.
--
-- Motivo: as condições se somam. Um domicílio num domingo paga o acréscimo de
-- domicílio E o de horário. Com preços alternativos seria preciso cadastrar
-- quatro valores por serviço, e eles sairiam de sincronia no primeiro reajuste.

ALTER TABLE "Servico"
  ADD COLUMN "acrescimoDomicilioCentavos"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "acrescimoForaHorarioCentavos" INTEGER NOT NULL DEFAULT 0;

-- Converte o que já estava cadastrado: o acréscimo é a diferença para o preço
-- base. Sem isto, a maquiagem social perderia a regra de R$ 210 ao migrar.
UPDATE "Servico"
SET "acrescimoForaHorarioCentavos" = GREATEST(0, "precoForaHorarioCentavos" - "precoCentavos")
WHERE "precoForaHorarioCentavos" IS NOT NULL;

ALTER TABLE "Servico" DROP COLUMN "precoForaHorarioCentavos";

-- Acréscimo negativo seria desconto disfarçado, e quebraria a leitura do
-- preço final na tela.
ALTER TABLE "Servico"
  ADD CONSTRAINT "servico_acrescimos_nao_negativos"
  CHECK ("acrescimoDomicilioCentavos" >= 0 AND "acrescimoForaHorarioCentavos" >= 0);
