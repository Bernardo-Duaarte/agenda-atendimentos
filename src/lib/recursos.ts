/**
 * Partes do sistema que podem ser ligadas e desligadas.
 *
 * Existe para desligar um módulo inteiro sem apagar código nem dados. O
 * estoque foi desligado porque dimensionar o consumo de cada produto na
 * prática se mostrou difícil demais para valer a pena — e uma estimativa ruim
 * contamina o cálculo de custo e de lucro, que é pior do que não ter o número.
 *
 * Nada foi removido do banco: produtos, fichas técnicas e movimentos
 * continuam gravados. Religar é trocar `false` por `true` aqui, e tudo volta
 * com o histórico intacto.
 */
export const ESTOQUE_ATIVO = false;
