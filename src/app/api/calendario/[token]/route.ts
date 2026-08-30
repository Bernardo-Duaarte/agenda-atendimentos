import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { montarCalendario, type EventoIcal } from "@/lib/calendario";
import { hora } from "@/lib/tempo";

/**
 * Calendário assinado, para o iPhone buscar sozinho.
 *
 * O token vai NO ENDEREÇO porque não existe alternativa: o app Calendário não
 * manda cookie nem preenche formulário de login. Quem tiver o link vê a agenda
 * — é por isso que ele é longo e aleatório, e deve ser tratado como senha.
 *
 * Somente leitura, de propósito. Apagar o evento no iPhone não apaga nada
 * aqui: o sistema continua sendo a única fonte da verdade.
 */

/** Quanto do passado vale a pena mandar. Mais que isso só engorda o arquivo. */
const MESES_PARA_TRAS = 6;

function tokenConfere(recebido: string): boolean {
  const esperado = process.env.CALENDAR_TOKEN;
  if (!esperado || esperado.length < 24) return false;

  const a = Buffer.from(recebido, "utf8");
  const b = Buffer.from(esperado, "utf8");
  // Comparar tamanhos antes vazaria essa informação; timingSafeEqual exige
  // buffers iguais, então tamanhos diferentes já são recusa.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const LOCAL = { ESTUDIO: "no estúdio", DOMICILIO: "em domicílio" } as const;

export async function GET(_request: Request, ctx: RouteContext<"/api/calendario/[token]">) {
  const { token } = await ctx.params;

  // O iPhone gosta de um endereço terminado em .ics; aceitamos com e sem.
  if (!tokenConfere(token.replace(/\.ics$/i, ""))) {
    return new Response("não autorizado", { status: 401 });
  }

  const desde = new Date();
  desde.setMonth(desde.getMonth() - MESES_PARA_TRAS);

  const [agendamentos, config] = await Promise.all([
    prisma.agendamento.findMany({
      where: { inicio: { gte: desde }, status: { not: "CANCELADO" } },
      orderBy: { inicio: "asc" },
      include: { cliente: true, servico: true },
    }),
    prisma.configuracao.findUnique({ where: { id: "unica" } }),
  ]);

  const eventos: EventoIcal[] = [];

  for (const a of agendamentos) {
    const ondeE = a.local === "DOMICILIO" ? a.endereco : config?.enderecoEstudio;

    eventos.push({
      // Estável: o mesmo atendimento sempre gera o mesmo identificador, então
      // uma alteração ATUALIZA o evento no iPhone em vez de duplicá-lo.
      uid: `${a.id}@agenda-atendimentos`,
      inicio: a.inicio,
      fim: a.fim,
      titulo: `${a.cliente.nome} — ${a.servico.nome}`,
      local: ondeE,
      // De fora ficam telefone, alergias e observações de propósito: um
      // calendário assinado sincroniza com o iCloud, e ficha técnica de
      // cliente não precisa sair do banco. Consulta-se no sistema.
      descricao: `${a.servico.nome} (${LOCAL[a.local]}) — ${a.servico.duracaoMin} min`,
      alarmeMin: 60,
    });

    // Trânsito como blocos próprios: assim a tarde aparece realmente ocupada
    // no celular, em vez de parecer livre até a hora do atendimento.
    if (a.deslocamentoIdaMin > 0) {
      eventos.push({
        uid: `${a.id}-ida@agenda-atendimentos`,
        inicio: new Date(a.inicio.getTime() - a.deslocamentoIdaMin * 60_000),
        fim: a.inicio,
        titulo: `Ida — ${a.cliente.nome}`,
        local: ondeE,
        descricao: `Chegar às ${hora(a.inicio)}`,
      });
    }

    if (a.deslocamentoVoltaMin > 0) {
      eventos.push({
        uid: `${a.id}-volta@agenda-atendimentos`,
        inicio: a.fim,
        fim: new Date(a.fim.getTime() + a.deslocamentoVoltaMin * 60_000),
        titulo: `Volta — ${a.cliente.nome}`,
      });
    }
  }

  const ics = montarCalendario(eventos, { nome: "Atendimentos" });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="atendimentos.ics"',
      // Sem cache: o valor de assinar é ver a mudança, não uma cópia velha.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
