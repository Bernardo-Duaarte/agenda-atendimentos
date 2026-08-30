"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarSessao, encerrarSessao, senhaConfere } from "@/lib/sessao";
import {
  JANELA_MIN,
  estaBloqueado,
  limparAposSucesso,
  registrarTentativa,
} from "@/lib/limite-acesso";
import type { EstadoFormulario } from "@/lib/formulario";

/**
 * Atrás da Vercel o IP real vem em x-forwarded-for; o primeiro da lista é o
 * cliente. Sem proxy na frente não há cabeçalho e todo mundo cai num balde só
 * — pior para quem compartilha o mesmo acesso, mas nunca deixa de contar.
 */
async function ipDeOrigem(): Promise<string> {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "desconhecido";
}

export async function entrar(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  const ip = await ipDeOrigem();

  if (await estaBloqueado(ip)) {
    return {
      ok: false,
      erroGeral: `Muitas tentativas. Espere ${JANELA_MIN} minutos e tente de novo.`,
    };
  }

  const senha = String(fd.get("senha") ?? "");
  const confere = senha.length > 0 && senhaConfere(senha);

  await registrarTentativa(ip, confere);

  if (!confere) {
    // Atraso fixo: torna a força bruta lenta já antes de bater no limite, e
    // não varia com o tempo que a comparação levou.
    await new Promise((r) => setTimeout(r, 700));
    return { ok: false, erroGeral: "Senha incorreta." };
  }

  await limparAposSucesso(ip);
  await criarSessao();
  redirect("/");
}

export async function sair(): Promise<void> {
  await encerrarSessao();
  redirect("/entrar");
}
