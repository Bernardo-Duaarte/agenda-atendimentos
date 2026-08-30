import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { CA_SUPABASE, ehHostSupabase } from "./supabase-ca";

/**
 * Em desenvolvimento o Next recarrega os módulos a cada alteração. Sem este
 * cache no globalThis, cada reload abriria um pool de conexões novo e o
 * Supabase derrubaria a conexão por excesso.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarCliente() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não está definida. Copie o .env.example para .env e preencha.",
    );
  }

  /**
   * TLS é obrigatório e verificado. Sem isto o driver conecta em texto claro:
   * a senha do banco e os dados das clientes atravessariam a internet
   * legíveis por qualquer ponto no caminho.
   *
   * `rejectUnauthorized: true` é o que dá sentido à criptografia — sem ele
   * qualquer servidor que responda no endereço seria aceito, e um
   * interceptador poderia se passar pelo banco.
   */
  const ssl = ehHostSupabase(connectionString)
    ? { ca: CA_SUPABASE, rejectUnauthorized: true as const }
    : { rejectUnauthorized: true as const };

  return new PrismaClient({ adapter: new PrismaPg({ connectionString, ssl }) });
}

export const prisma = globalForPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
