import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Configuração do Prisma CLI (migrate, generate, studio).
 *
 * São DUAS conexões diferentes, de propósito:
 *
 *   DIRECT_URL   (aqui) — porta 5432, sessão. As migrations criam tabelas e
 *                pegam lock de schema; isso não funciona por um pooler em
 *                modo transação.
 *   DATABASE_URL (src/lib/prisma.ts) — porta 6543, pooler. É o que o app usa
 *                em runtime, onde o que importa é não estourar conexão.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Resolvido de forma tolerante de propósito. `prisma generate` roda no
    // build da Vercel e não precisa de banco nenhum; com o `env()` estrito, o
    // build inteiro falhava por falta de uma variável que o app em produção
    // nunca usa. Quem precisa dela é migrate/studio, e aí a falta aparece na
    // hora certa, com erro de conexão.
    url: process.env.DIRECT_URL ?? "",
  },
});
