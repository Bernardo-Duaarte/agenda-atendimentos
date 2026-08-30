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
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="text-base font-semibold tracking-tight text-rose-700">
            Agenda
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {abas.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
          <form action={sair}>
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
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
