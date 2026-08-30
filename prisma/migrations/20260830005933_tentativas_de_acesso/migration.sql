-- CreateTable
CREATE TABLE "TentativaAcesso" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TentativaAcesso_ip_criadoEm_idx" ON "TentativaAcesso"("ip", "criadoEm");

-- CreateIndex
CREATE INDEX "TentativaAcesso_criadoEm_idx" ON "TentativaAcesso"("criadoEm");
