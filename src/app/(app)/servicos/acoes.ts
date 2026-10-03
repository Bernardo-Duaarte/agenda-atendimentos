"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import {
  booleano,
  comValidacao,
  percentual,
  dinheiro,
  dinheiroOpcional,
  inteiro,
  inteiroOpcional,
  texto,
  textoOpcional,
  ErroDeCampo,
  type EstadoFormulario,
} from "@/lib/formulario";

/**
 * O sinal vem de um jeito ou do outro, nunca dos dois.
 *
 * O formulário mostra só o campo do modo escolhido, então é a presença do
 * campo que diz qual vale. Gravar o fixo como nulo quando ele não veio é o que
 * devolve o serviço para a porcentagem — sem isso, trocar de valor fixo para
 * porcentagem não teria efeito, porque o valor antigo continuaria no banco e
 * continuaria ganhando.
 */
function dadosDoSinal(fd: FormData): {
  percentualSinal: number;
  sinalFixoCentavos: number | null;
} {
  const fixo = dinheiroOpcional(fd, "sinalFixoCentavos", "Valor do sinal");
  if (fixo != null) {
    // A porcentagem fica guardada como estava, para voltar a valer se um dia
    // você trocar o modo de novo.
    return { percentualSinal: inteiroOpcional(fd, "percentualSinal") ?? 30, sinalFixoCentavos: fixo };
  }
  return { percentualSinal: percentual(fd, "percentualSinal", "Sinal"), sinalFixoCentavos: null };
}

function dadosDoServico(fd: FormData) {
  return {
    nome: texto(fd, "nome", "Nome"),
    descricao: textoOpcional(fd, "descricao"),
    precoCentavos: dinheiro(fd, "precoCentavos", "Preço"),
    duracaoMin: inteiro(fd, "duracaoMin", "Duração", { min: 5 }),
    ...dadosDoSinal(fd),
    // Serviço de parceira: o atendimento passa a exigir escolher quem atende,
    // e o preço vem da tabela dela.
    exigeProfissional: booleano(fd, "exigeProfissional"),
    acrescimoDomicilioCentavos: dinheiro(fd, "acrescimoDomicilioCentavos", "Acréscimo de domicílio"),
    acrescimoForaHorarioCentavos: dinheiro(fd, "acrescimoForaHorarioCentavos", "Acréscimo fora do horário"),
  };
}

/**
 * A ficha técnica chega como um campo por produto (`insumo_<id>`). Campo vazio
 * ou zero significa "esse serviço não usa esse produto".
 */
function dadosDaFicha(fd: FormData): { produtoId: string; quantidade: string }[] {
  const itens: { produtoId: string; quantidade: string }[] = [];

  for (const [chave, valor] of fd.entries()) {
    if (!chave.startsWith("insumo_") || typeof valor !== "string") continue;

    const bruto = valor.trim().replace(",", ".");
    if (!bruto) continue;

    const n = Number(bruto);
    if (!Number.isFinite(n) || n < 0) {
      throw new ErroDeCampo(chave, "Quantidade inválida. Ex: 0,5");
    }
    if (n === 0) continue;

    itens.push({ produtoId: chave.slice("insumo_".length), quantidade: String(n) });
  }

  return itens;
}

export async function criarServico(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  return comValidacao(async () => {
    const dados = dadosDoServico(fd);
    const ficha = dadosDaFicha(fd);

    await prisma.servico.create({
      data: { ...dados, insumos: { create: ficha } },
    });

    revalidatePath("/servicos");
    redirect("/servicos");
  });
}

export async function atualizarServico(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  return comValidacao(async () => {
    const id = texto(fd, "id", "Serviço");
    const dados = dadosDoServico(fd);
    const ficha = dadosDaFicha(fd);

    // Apagar e recriar a ficha inteira, numa transação. É mais simples do que
    // um diff item a item, e a ficha é pequena — vale a troca.
    await prisma.$transaction([
      prisma.servico.update({ where: { id }, data: dados }),
      prisma.servicoProduto.deleteMany({ where: { servicoId: id } }),
      prisma.servicoProduto.createMany({
        data: ficha.map((i) => ({ ...i, servicoId: id })),
      }),
    ]);

    revalidatePath("/servicos");
    redirect("/servicos");
  });
}

export async function excluirServico(fd: FormData): Promise<void> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  const id = String(fd.get("id"));

  const atendimentos = await prisma.agendamento.count({ where: { servicoId: id } });
  if (atendimentos > 0) {
    // Já foi usado: desativar preserva o histórico e some da lista de escolha.
    await prisma.servico.update({ where: { id }, data: { ativo: false } });
  } else {
    await prisma.servico.delete({ where: { id } });
  }

  revalidatePath("/servicos");
  redirect("/servicos");
}
