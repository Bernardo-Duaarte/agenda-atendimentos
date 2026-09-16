import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SCRIPT_ANTI_PISCADA } from "@/components/botao-tema";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agenda",
  description: "Agenda, clientes e estoque",
  // Sistema privado: nada aqui deve aparecer em busca.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // A barra do Safari no iPhone acompanha o tema junto com a página. Com uma
  // cor só, o topo ficaria branco em volta de uma tela escura.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  // Diz ao navegador que existem os dois temas, para ele desenhar campos de
  // data, teclado e barra de rolagem na versão certa.
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      /**
       * O script abaixo marca o tema escolhido neste elemento ANTES do React
       * assumir. Sem este aviso, o React compara o que o servidor mandou (sem
       * o atributo) com o que encontra no navegador (com), chama de erro e
       * refaz a árvore — o que apaga a correção e traz a piscada de volta.
       * Aqui a divergência é intencional: quem manda é o que está na tela.
       */
      suppressHydrationWarning
    >
      <head>
        {/* No <head> de propósito: roda enquanto o navegador ainda lê o HTML,
            antes de qualquer pintura. Dentro do body já seria tarde para o
            conteúdo que vem antes dele. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_PISCADA }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
