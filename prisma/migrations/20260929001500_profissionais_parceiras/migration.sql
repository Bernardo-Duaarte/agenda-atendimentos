-- Penteadistas parceiras.
--
-- Substitui as marcações ocupaMaquiadora/ocupaPenteadista por algo mais
-- direto: cada atendimento tem UMA executora, e o conflito é entre
-- atendimentos da mesma pessoa. As marcações anteriores presumiam que só
-- existiam dois papéis; com quatro parceiras, duas clientes com a mesma
-- penteadista precisam conflitar entre si, e isso elas não expressavam.

CREATE TABLE "Profissional" (
    "id"              TEXT NOT NULL,
    "nome"            TEXT NOT NULL,
    "ativo"           BOOLEAN NOT NULL DEFAULT true,
    "precoCentavos"   INTEGER NOT NULL,
    "repasseCentavos" INTEGER NOT NULL,
    "criadoEm"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profissional_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Profissional_nome_idx" ON "Profissional"("nome");

ALTER TABLE "Profissional"
  ADD CONSTRAINT "profissional_valores_nao_negativos"
  CHECK ("precoCentavos" >= 0 AND "repasseCentavos" >= 0);

ALTER TABLE "Servico"
  ADD COLUMN "exigeProfissional" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Servico"
  DROP COLUMN "ocupaMaquiadora",
  DROP COLUMN "ocupaPenteadista";

ALTER TABLE "Agendamento"
  ADD COLUMN "profissionalId"  TEXT,
  ADD COLUMN "repasseCentavos" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Agendamento_profissionalId_idx" ON "Agendamento"("profissionalId");

ALTER TABLE "Agendamento"
  ADD CONSTRAINT "Agendamento_profissionalId_fkey"
  FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Agendamento"
  ADD CONSTRAINT "agendamento_repasse_nao_negativo" CHECK ("repasseCentavos" >= 0);

ALTER TABLE "Profissional" ENABLE ROW LEVEL SECURITY;
