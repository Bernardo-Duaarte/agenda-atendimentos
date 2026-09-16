-- Regras de dinheiro garantidas pelo banco, não só pelo código.
--
-- Mesma razão das outras restrições: a validação em TypeScript é a primeira
-- linha, não a última. Um erro meu numa ação, ou um acerto feito direto no
-- painel do Supabase, não deve conseguir gravar um sinal negativo ou uma
-- devolução que soma em vez de subtrair.

ALTER TABLE "Servico"
  ADD CONSTRAINT "servico_percentual_sinal_valido"
  CHECK ("percentualSinal" >= 0 AND "percentualSinal" <= 100);

ALTER TABLE "Agendamento"
  ADD CONSTRAINT "agendamento_sinal_nao_negativo"
  CHECK ("sinalCentavos" >= 0);

-- O sinal do valor segue o tipo, como no livro-razão do estoque. É isso que
-- permite somar a coluna inteira e obter o total recebido, sem tratar caso
-- a caso — e impede uma devolução lançada como entrada.
ALTER TABLE "Pagamento"
  ADD CONSTRAINT "pagamento_valor_nao_zero" CHECK ("valorCentavos" <> 0),
  ADD CONSTRAINT "pagamento_sinal_conforme_tipo" CHECK (
        ("tipo" <> 'DEVOLUCAO' OR "valorCentavos" < 0)
    AND ("tipo"  = 'DEVOLUCAO' OR "valorCentavos" > 0)
  );

ALTER TABLE "Pagamento" ENABLE ROW LEVEL SECURITY;
