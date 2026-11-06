import Link from "next/link";
import { IMAGENS, variavelCss } from "@/lib/imagens";
import { exigirSessao } from "@/lib/sessao";
import { sair } from "@/app/entrar/acoes";
import { BotaoTema } from "@/components/botao-tema";
import { AtualizarSozinho } from "@/components/atualizar-sozinho";
import { ESTOQUE_ATIVO } from "@/lib/recursos";

const abas = [
  { href: "/", rotulo: "Início" },
  { href: "/agenda", rotulo: "Agenda" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/servicos", rotulo: "Serviços" },
  { href: "/financeiro", rotulo: "Financeiro" },
  { href: "/configuracao", rotulo: "Ajustes" },
] as const;

// A aba de produtos só aparece com o estoque ligado (ver lib/recursos.ts).
const abasVisiveis = ESTOQUE_ATIVO
  ? [...abas.slice(0, 4), { href: "/produtos", rotulo: "Produtos" } as const, ...abas.slice(4)]
  : abas;

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  // Barreira de entrada da área logada. Não é a única: cada página e cada
  // Server Action verifica de novo, porque um layout não re-renderiza a cada
  // navegação e Server Actions são alcançáveis sem passar por layout nenhum.
  await exigirSessao();

  return (
    <>
      <AtualizarSozinho />

      {/* A foto, borrada e ao fundo. Ver `.atmosfera` em globals.css. */}
      {IMAGENS.atmosfera && (
        <div className="atmosfera" style={variavelCss("--img-atmosfera", IMAGENS.atmosfera)} aria-hidden />
      )}

      {/* Translúcido para a foto passar por trás do cabeçalho; o desfoque é de
          um elemento só, então não pesa como pesaria em cada cartão. */}
      <header className="sticky top-0 z-20 border-b border-borda bg-superficie/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            {IMAGENS.rosto ? (
              // `<img>` simples: a miniatura é minúscula e o endereço pode ser de
              // qualquer domínio, o que o `next/image` exigiria cadastrar.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={IMAGENS.rosto}
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-full object-cover ring-1 ring-borda"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full bg-marca text-sm font-semibold text-white ring-1 ring-borda"
              >
                A
              </span>
            )}
            <span className="text-base font-semibold tracking-tight text-marca">Agenda</span>
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {abasVisiveis.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave hover:text-texto"
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
          <BotaoTema />
          <form action={sair}>
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-texto-fraco transition hover:bg-superficie-suave hover:text-texto"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
