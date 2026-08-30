import { prisma } from "@/lib/prisma";

/**
 * Mantém o projeto do Supabase acordado.
 *
 * O plano gratuito pausa o banco após 7 dias sem nenhum acesso, e voltar exige
 * entrar no painel e clicar em restaurar — o site ficaria fora do ar até
 * alguém perceber. Uma consulta por dia conta como atividade e evita isso.
 *
 * Chamada pelo agendador da Vercel (ver vercel.json). Fica fora do login
 * porque quem chama é uma máquina, então a proteção é o segredo no cabeçalho.
 */
export async function GET(request: Request) {
  const esperado = process.env.CRON_SECRET;

  // Sem segredo configurado a rota não existe, em vez de existir aberta.
  if (!esperado) {
    return new Response("não configurado", { status: 404 });
  }

  if (request.headers.get("authorization") !== `Bearer ${esperado}`) {
    return new Response("não autorizado", { status: 401 });
  }

  // A consulta mais barata que ainda conta como uso do banco.
  const clientes = await prisma.cliente.count();

  return Response.json({
    acordado: true,
    clientes,
    em: new Date().toISOString(),
  });
}
