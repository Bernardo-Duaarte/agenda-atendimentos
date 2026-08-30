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
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* Primeiro filho do body de propósito: roda enquanto o navegador
            ainda está lendo o HTML, antes de desenhar qualquer coisa. Mais
            abaixo, a tela piscaria no tema errado antes de se corrigir. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_PISCADA }} />
        {children}
      </body>
    </html>
  );
}
