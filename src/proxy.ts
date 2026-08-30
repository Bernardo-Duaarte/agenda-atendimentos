import { NextResponse, type NextRequest } from "next/server";

/**
 * Barreira rasa: manda para o login quem chega sem cookie de sessão, antes de
 * qualquer página renderizar.
 *
 * De propósito NÃO valida a assinatura do cookie aqui. Um cookie forjado passa
 * por esta porta e é rejeitado logo em seguida por `exigirSessao()`, que roda
 * dentro de cada página e de cada Server Action. A verificação que vale é
 * aquela, colada no dado; esta serve para economizar renderização e para que
 * quem não entrou veja o login em vez de uma tela quebrada.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/entrar") return NextResponse.next();

  // Rota do agendador: quem chama é uma máquina, que não tem cookie. Ela se
  // protege sozinha com o segredo no cabeçalho — mandá-la para o login só
  // faria o agendador receber um redirecionamento e o banco dormir.
  if (pathname === "/api/manter-acordado") return NextResponse.next();

  // Calendário assinado: quem busca é o app Calendário do iPhone, que não
  // manda cookie. A rota se protege pelo token no próprio endereço.
  if (pathname.startsWith("/api/calendario/")) return NextResponse.next();

  if (request.cookies.has("sessao")) return NextResponse.next();

  return NextResponse.redirect(new URL("/entrar", request.url));
}

export const config = {
  // Sem isto o proxy rodaria também em CSS, JS e imagens — e a página de login
  // apareceria sem estilo nenhum.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
