-- Reforço do banco: o que o código já valida, o banco passa a garantir.
--
-- Motivo: as Server Actions são endpoints POST reais e a validação em
-- TypeScript é a primeira linha, não a última. Um erro meu numa action, ou um
-- acesso direto ao banco, não deve conseguir gravar um preço negativo, um
-- atendimento que termina antes de começar ou uma baixa de estoque positiva.

-- ---------------------------------------------------------------------------
-- 1. Integridade dos dados
-- ---------------------------------------------------------------------------

ALTER TABLE "Cliente"
  ADD CONSTRAINT "cliente_telefone_e164"
  CHECK ("telefone" ~ '^[0-9]{12,13}$');

ALTER TABLE "Servico"
  ADD CONSTRAINT "servico_preco_nao_negativo" CHECK ("precoCentavos" >= 0),
  ADD CONSTRAINT "servico_duracao_positiva"   CHECK ("duracaoMin" > 0);

ALTER TABLE "Produto"
  ADD CONSTRAINT "produto_custo_nao_negativo"  CHECK ("custoUnitarioCentavos" >= 0),
  ADD CONSTRAINT "produto_embalagem_positiva"  CHECK ("conteudoEmbalagem" > 0),
  ADD CONSTRAINT "produto_minimo_nao_negativo" CHECK ("estoqueMinimo" >= 0);

ALTER TABLE "ServicoProduto"
  ADD CONSTRAINT "ficha_quantidade_positiva" CHECK ("quantidade" > 0);

ALTER TABLE "Agendamento"
  ADD CONSTRAINT "agendamento_termina_depois_de_comecar" CHECK ("fim" > "inicio"),
  ADD CONSTRAINT "agendamento_preco_nao_negativo"        CHECK ("precoCentavos" >= 0),
  ADD CONSTRAINT "agendamento_deslocamento_nao_negativo"
    CHECK ("deslocamentoIdaMin" >= 0 AND "deslocamentoVoltaMin" >= 0 AND "taxaDeslocamentoCentavos" >= 0);

-- A convenção do livro-razão — sinal conforme o tipo — vira regra do banco.
-- É ela que faz o saldo poder ser um SUM() simples e confiável.
ALTER TABLE "MovimentoEstoque"
  ADD CONSTRAINT "movimento_quantidade_nao_zero" CHECK ("quantidade" <> 0),
  ADD CONSTRAINT "movimento_sinal_conforme_tipo" CHECK (
        ("tipo" <> 'ENTRADA' OR "quantidade" > 0)
    AND ("tipo" <> 'CONSUMO' OR "quantidade" < 0)
    AND ("tipo" <> 'PERDA'   OR "quantidade" < 0)
  ),
  ADD CONSTRAINT "movimento_custo_nao_negativo"
    CHECK ("custoTotalCentavos" IS NULL OR "custoTotalCentavos" >= 0);

ALTER TABLE "Configuracao"
  ADD CONSTRAINT "config_horarios_validos" CHECK (
    "horaAbertura"   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND
    "horaFechamento" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

-- ---------------------------------------------------------------------------
-- 2. Fechar a API pública do Supabase
-- ---------------------------------------------------------------------------
-- O Supabase publica automaticamente o schema `public` como API REST e GraphQL,
-- acessível com a chave `anon` — que é pública por natureza, feita para ir em
-- código de front-end. Hoje o RLS sem política já barra o acesso, mas essas
-- permissões continuam concedidas: bastaria alguém criar uma política
-- permissiva ou desligar o RLS pelo painel para tudo ficar legível e gravável.
--
-- Este sistema nunca usa essa API — o Prisma fala direto com o Postgres como
-- dono das tabelas. Então tirar a permissão remove a camada em vez de confiar
-- que a outra segure sozinha.

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- Sem isto, a próxima tabela criada nasceria com as permissões de novo.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS ligado em tudo, explicitamente
-- ---------------------------------------------------------------------------
-- O Supabase já liga por padrão, mas depender de um padrão que pode mudar não
-- é garantia. Sem política nenhuma, RLS ligado nega acesso a todo mundo que
-- não seja o dono da tabela — e o dono é o papel que o app usa.

ALTER TABLE "Cliente"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Servico"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Produto"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServicoProduto"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agendamento"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MovimentoEstoque" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Configuracao"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TentativaAcesso"  ENABLE ROW LEVEL SECURITY;
