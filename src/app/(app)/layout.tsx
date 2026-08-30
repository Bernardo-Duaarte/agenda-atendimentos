import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { sair } from "@/app/entrar/acoes";

const abas = [
  { href: "/", rotulo: "Início" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/servicos", rotulo: "Serviços" },
  { href: "/produtos", rotulo: "Produtos" },
] as const;

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  // Barreira de entrada da área logada. Não é a única: cada página e cada
  // Server Action verifica de novo, porque um layout não re-renderiza a cada
  // navegação e Server Actions são alcançáveis sem passar por layout nenhum.
  await exigirSessao();

  return (
    <>
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="text-base font-semibold tracking-tight text-marca">
            Agenda
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {abas.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave hover:text-texto"
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
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
