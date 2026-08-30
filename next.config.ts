import type { NextConfig } from "next";

const emDesenvolvimento = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * `'unsafe-inline'` em script-src é uma concessão consciente: a alternativa é
 * gerar um nonce por requisição no proxy, o que obriga toda rota a ser
 * dinâmica e quebra silenciosamente se algum script escapar. Aqui não há
 * terceiro nenhum, nem innerHTML, nem eval — o React escapa tudo que é
 * renderizado —, então o buraco que ela abre não tem por onde ser explorado.
 *
 * O que continua valendo, e é o grosso do benefício:
 *   script-src 'self'    → nenhum script de outro domínio carrega
 *   frame-ancestors none → ninguém embute o sistema num iframe (clickjacking)
 *   form-action 'self'   → um formulário não pode ser reapontado para fora
 *   base-uri 'self'      → impede reescrever a base das URLs relativas
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${emDesenvolvimento ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(emDesenvolvimento ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const cabecalhos = [
  { key: "Content-Security-Policy", value: csp },
  // Impede o navegador de "adivinhar" o tipo de um arquivo e executá-lo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundante com frame-ancestors, mas cobre navegadores antigos.
  { key: "X-Frame-Options", value: "DENY" },
  // Não vaza a URL interna (que pode conter id de cliente) para sites externos.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

if (!emDesenvolvimento) {
  // Só em produção: em http://localhost o navegador ignoraria, mas deixar de
  // fora evita que a política grude no domínio local durante o desenvolvimento.
  cabecalhos.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  // Não anunciar o framework e a versão para quem varre a internet.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: cabecalhos }];
  },
};

export default nextConfig;
