"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import {
  comValidacao,
  dataOpcional,
  decimal,
  dinheiro,
  texto,
  textoOpcional,
  ErroDeCampo,
  type EstadoFormulario,
} from "@/lib/formulario";

/**
 * Você cadastra do jeito que compra — "frasco de 35 ml por R$ 229" — e o custo
 * por unidade sai da divisão. É esse número por unidade que a ficha técnica
 * usa; sem a divisão, 4 ml de base custariam um frasco inteiro.
 */
function custoUnitario(precoCentavos: number, conteudo: number, campo: string): number {
  if (conteudo <= 0) {
    throw new ErroDeCampo(campo, "O conteúdo da embalagem precisa ser maior que zero.");
  }
  return Math.round(precoCentavos / conteudo);
}

function dadosDoProduto(fd: FormData) {
  const conteudo = decimal(fd, "conteudoEmbalagem", "Conteúdo da embalagem");
  const precoEmbalagem = dinheiro(fd, "precoEmbalagem", "Preço da embalagem");

  return {
    nome: texto(fd, "nome", "Nome"),
    marca: textoOpcional(fd, "marca"),
    unidade: texto(fd, "unidade", "Unidade"),
    conteudoEmbalagem: conteudo,
    custoUnitarioCentavos: custoUnitario(precoEmbalagem, Number(conteudo), "conteudoEmbalagem"),
    estoqueMinimo: decimal(fd, "estoqueMinimo", "Estoque mínimo"),
    validade: dataOpcional(fd, "validade", "Validade"),
  };
}

export async function criarProduto(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  return comValidacao(async () => {
    const dados = dadosDoProduto(fd);
    const estoqueInicial = decimal(fd, "estoqueInicial", "Quantidade que você tem");

    const produto = await prisma.produto.create({ data: dados });

    // O estoque inicial não é um campo do produto — é o primeiro lançamento
    // do livro-razão, igual a qualquer outra entrada.
    if (Number(estoqueInicial) > 0) {
      await prisma.movimentoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: "ENTRADA",
          quantidade: estoqueInicial,
          custoTotalCentavos: Math.round(
            dados.custoUnitarioCentavos * Number(estoqueInicial),
          ),
          observacao: "Estoque inicial do cadastro",
        },
      });
    }

    revalidatePath("/produtos");
    redirect("/produtos");
  });
}

export async function atualizarProduto(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  return comValidacao(async () => {
    const id = texto(fd, "id", "Produto");
    await prisma.produto.update({ where: { id }, data: dadosDoProduto(fd) });
    revalidatePath("/produtos");
    redirect("/produtos");
  });
}

/** Entrada, perda ou ajuste lançados à mão. O CONSUMO é automático, sai do atendimento. */
export async function lancarMovimento(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  return comValidacao(async () => {
    const produtoId = texto(fd, "produtoId", "Produto");
    const tipo = texto(fd, "tipo", "Tipo") as "ENTRADA" | "PERDA" | "AJUSTE";
    const quantidade = decimal(fd, "quantidade", "Quantidade");

    // A quantidade é guardada COM SINAL, para o saldo ser um SUM() simples.
    const comSinal = tipo === "PERDA" ? `-${quantidade}` : quantidade;
    const totalPago = tipo === "ENTRADA" ? dinheiro(fd, "custoTotalCentavos", "Valor pago") : null;

    await prisma.movimentoEstoque.create({
      data: {
        produtoId,
        tipo,
        quantidade: comSinal,
        custoTotalCentavos: totalPago,
        observacao: textoOpcional(fd, "observacao"),
      },
    });

    // Uma compra redefine quanto o produto custa hoje, que é o que precifica
    // o consumo dos próximos atendimentos.
    if (totalPago !== null) {
      await prisma.produto.update({
        where: { id: produtoId },
        data: {
          custoUnitarioCentavos: custoUnitario(totalPago, Number(quantidade), "quantidade"),
        },
      });
    }

    revalidatePath("/produtos");
    redirect(`/produtos/${produtoId}`);
  });
}
