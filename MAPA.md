# Mapa do projeto

Onde fica cada parte, para mexer só no pedaço certo em vez de reler tudo.

Quem lê isto: quem for alterar o código — você, o Bernardo ou o Claude numa
sessão nova. Não é documentação de uso do app.

> Mantenha este arquivo junto com a mudança. Um mapa com caminho errado atrasa
> mais do que mapa nenhum — `npm run mapa` confere se os caminhos daqui ainda
> existem.

---

## Em uma frase

Agenda de atendimentos de maquiagem: clientes, serviços, horários, sinal,
pagamentos e o relatório do mês. Uma pessoa só usa, com senha única.

**Pilha:** Next.js 16 (App Router, Turbopack) · React 19 · Prisma 7 ·
PostgreSQL no Supabase · Tailwind 4 · publicado na Vercel.

---

## Quero mudar… → mexa em

| Quero mudar | Vá direto para |
| --- | --- |
| Preço, acréscimo de domicílio, preço fora do horário | [`src/lib/precificacao.ts`](src/lib/precificacao.ts) |
| Quanto se pede de sinal (% ou valor fixo) | [`src/lib/financeiro.ts`](src/lib/financeiro.ts) → `calcularSinal` |
| Quando dois atendimentos conflitam | [`src/lib/agenda.ts`](src/lib/agenda.ts) |
| Os números do relatório do mês ou do ano | [`src/lib/relatorio.ts`](src/lib/relatorio.ts) |
| Como a cliente te conheceu (a lista de origens) | [`src/lib/origem.ts`](src/lib/origem.ts) |
| Bloqueio de horário (folga, viagem) | [`src/lib/agenda.ts`](src/lib/agenda.ts) → `bloqueioChoca` |
| O texto do lembrete no WhatsApp | [`src/lib/whatsapp.ts`](src/lib/whatsapp.ts) |
| Como se busca uma cliente (acento, telefone) | [`src/lib/busca.ts`](src/lib/busca.ts) |
| O que vale como telefone | [`src/lib/telefone.ts`](src/lib/telefone.ts) |
| Cores, tema claro/escuro, foto de fundo | [`src/app/globals.css`](src/app/globals.css) |
| O cabeçalho e as abas | [`src/app/(app)/layout.tsx`](<src/app/(app)/layout.tsx>) |
| Botões, campos, cartões, etiquetas | [`src/components/ui.tsx`](src/components/ui.tsx) |
| Validação de qualquer formulário | [`src/lib/formulario.ts`](src/lib/formulario.ts) |
| Uma coluna nova no banco | [`prisma/schema.prisma`](prisma/schema.prisma) + migração |
| Login, senha, sessão | [`src/lib/sessao.ts`](src/lib/sessao.ts) · [`src/app/entrar/`](src/app/entrar/) |
| Quem pode entrar sem cookie | [`src/proxy.ts`](src/proxy.ts) |
| Ligar/desligar um módulo inteiro | [`src/lib/recursos.ts`](src/lib/recursos.ts) |
| Fuso, formato de data e hora | [`src/lib/tempo.ts`](src/lib/tempo.ts) |
| Valores em reais e centavos | [`src/lib/dinheiro.ts`](src/lib/dinheiro.ts) |

---

## As telas

Tudo sob `src/app/`. A pasta `(app)` é a área logada; `entrar` fica fora dela.

| Rota | Pasta | O que é |
| --- | --- | --- |
| `/` | [`(app)/page.tsx`](<src/app/(app)/page.tsx>) | Início: o dia de hoje e os próximos |
| `/agenda` | [`(app)/agenda/`](<src/app/(app)/agenda/>) | Um dia por vez |
| `/agenda/mes` | [`(app)/agenda/mes/`](<src/app/(app)/agenda/mes/>) | Grade do mês |
| `/agenda/novo` | [`(app)/agenda/novo/`](<src/app/(app)/agenda/novo/>) | Marcar atendimento |
| `/agenda/[id]` | [`(app)/agenda/[id]/`](<src/app/(app)/agenda/[id]/>) | Ficha do atendimento: status, pagamentos, lembrete |
| `/clientes` | [`(app)/clientes/`](<src/app/(app)/clientes/>) | Lista com busca |
| `/clientes/importar` | [`(app)/clientes/importar/`](<src/app/(app)/clientes/importar/>) | Importar contatos de um `.vcf` |
| `/servicos` | [`(app)/servicos/`](<src/app/(app)/servicos/>) | Tabela de serviços e preços |
| `/agenda/bloquear` | [`(app)/agenda/bloquear/`](<src/app/(app)/agenda/bloquear/>) | Reservar um período seu |
| `/financeiro` | [`(app)/financeiro/`](<src/app/(app)/financeiro/>) | Relatório do mês |
| `/financeiro/ano` | [`(app)/financeiro/ano/`](<src/app/(app)/financeiro/ano/>) | Os doze meses numa tela |
| `/configuracao` | [`(app)/configuracao/`](<src/app/(app)/configuracao/>) | Ajustes, janela de horário, parceiras |
| `/produtos` | [`(app)/produtos/`](<src/app/(app)/produtos/>) | **Desligado.** Ver "O que está desligado" |
| `/entrar` | [`entrar/`](src/app/entrar/) | Senha |

### O padrão de cada pasta de tela

```
page.tsx        componente de servidor: busca no banco e monta a tela
formulario.tsx  "use client": o formulário, com estado e validação na hora
acoes.ts        "use server": grava no banco
```

**Toda Server Action começa com `await exigirSessao()`.** Ela é um endpoint
POST de verdade, alcançável sem passar por página, layout nem proxy — a
verificação do proxy não cobre isso.

### Rotas de máquina

| Rota | Arquivo | Quem chama | Como se protege |
| --- | --- | --- | --- |
| `/api/calendario/[token]` | [`route.ts`](<src/app/api/calendario/[token]/route.ts>) | Calendário do iPhone | token no endereço (`CALENDAR_TOKEN`) |
| `/api/manter-acordado` | [`route.ts`](src/app/api/manter-acordado/route.ts) | Cron da Vercel, 12h | segredo no cabeçalho (`CRON_SECRET`) |

---

## As regras de negócio (`src/lib/`)

O que decide alguma coisa mora aqui, separado das telas — assim dá para testar
sem subir servidor e a mesma regra roda nos dois lados.

### Dinheiro e preço
- [`dinheiro.ts`](src/lib/dinheiro.ts) — tudo é `Int` em centavos; aqui vira texto e volta
- [`precificacao.ts`](src/lib/precificacao.ts) — preço base + acréscimo de domicílio + acréscimo fora do horário, **que somam**
- [`financeiro.ts`](src/lib/financeiro.ts) — contas de um atendimento; `calcularSinal` (porcentagem **ou** valor fixo)
- [`relatorio.ts`](src/lib/relatorio.ts) — o mês em **duas contas que nunca se somam**: trabalho (por data do atendimento) e caixa (por data do pagamento). Também `relatorioDoAno`, que busca o ano de uma vez em vez de chamar o mês doze vezes
- [`deslocamento.ts`](src/lib/deslocamento.ts) — taxa a partir de distância e tempo

### Agenda
- [`agenda.ts`](src/lib/agenda.ts) — conflito de horário. Regra chave: **cada profissional tem a própria agenda**, então ela pode maquiar enquanto a parceira faz penteado. `bloqueioChoca` trata o bloqueio, que ocupa só a agenda dela
- [`agenda-consulta.ts`](src/lib/agenda-consulta.ts) — as consultas ao banco
- [`calendario-mes.ts`](src/lib/calendario-mes.ts) — grade do mês
- [`janela.ts`](src/lib/janela.ts) — a janela de horário normal, lida da configuração
- [`tempo.ts`](src/lib/tempo.ts) — **a única fronteira** entre UTC (banco) e São Paulo (tela)

### Clientes
- [`busca.ts`](src/lib/busca.ts) — busca por nome **ignorando acento** e por telefone
- [`telefone.ts`](src/lib/telefone.ts) — normaliza para o formato do WhatsApp e recusa número de fora
- [`vcard.ts`](src/lib/vcard.ts) — lê o `.vcf` exportado do iCloud
- [`importacao.ts`](src/lib/importacao.ts) — valida e remove repetidos antes de gravar
- [`whatsapp.ts`](src/lib/whatsapp.ts) — monta o link `wa.me` com a mensagem pronta
- [`origem.ts`](src/lib/origem.ts) — a lista de "como me conheceu"; acrescentar uma origem é acrescentar uma linha, sem migração

### Integrações
- [`calendario.ts`](src/lib/calendario.ts) — **gera** o `.ics` que o iPhone assina
- [`ics-leitura.ts`](src/lib/ics-leitura.ts) — **lê** calendário externo (expande repetições)
- [`calendario-externo.ts`](src/lib/calendario-externo.ts) — busca a agenda pessoal publicada, com cache de 10 min
- [`mapa.ts`](src/lib/mapa.ts) — distância e tempo pela Routes API do Google

### Infraestrutura
- [`prisma.ts`](src/lib/prisma.ts) — a conexão
- [`supabase-ca.ts`](src/lib/supabase-ca.ts) — certificado fixado, para a conexão com o banco ser verificada de verdade
- [`sessao.ts`](src/lib/sessao.ts) — cookie assinado (jose); não há tabela de usuários
- [`limite-acesso.ts`](src/lib/limite-acesso.ts) — trava tentativas de senha
- [`formulario.ts`](src/lib/formulario.ts) — validação compartilhada de todos os formulários
- [`recursos.ts`](src/lib/recursos.ts) — liga e desliga módulos
- [`imagens.ts`](src/lib/imagens.ts) — endereços das fotos, por variável de ambiente

---

## O banco

[`prisma/schema.prisma`](prisma/schema.prisma) · migrações em `prisma/migrations/`

| Modelo | Guarda |
| --- | --- |
| `Cliente` | nome, telefone, ficha técnica, endereço padrão, origem |
| `Servico` | preço, duração, acréscimos, sinal (% ou fixo), se exige parceira |
| `Agendamento` | data, local, preço congelado, sinal, repasse, status |
| `Pagamento` | lançamentos do atendimento (sinal, restante, extra, devolução) |
| `Profissional` | parceiras: preço dela e quanto se repassa |
| `Configuracao` | linha única `id: "unica"` — janela de horário, endereço, taxas |
| `Produto`, `ServicoProduto`, `MovimentoEstoque` | estoque, **desligado** |
| `Bloqueio` | período seu reservado que não é atendimento |
| `TentativaAcesso` | tentativas de senha, para a trava |

**Ao mudar o schema:**

```bash
npx prisma migrate dev --name o_que_mudou
# reinicie o `npm run dev` depois — ele segura o cliente antigo em memória
```

Há **um banco só**: o que você roda no local é o mesmo da produção. Uma
migração aqui atinge os dados reais na hora. **Não existe backup.**

---

## Entrada e segurança

Três camadas, e as três importam:

1. [`src/proxy.ts`](src/proxy.ts) — manda para o login quem chega sem cookie. Barreira **rasa**: não valida a assinatura, e **deixa imagens e estáticos passarem sem login**
2. `exigirSessao()` em toda página e **toda** Server Action — é esta que vale
3. [`limite-acesso.ts`](src/lib/limite-acesso.ts) — trava tentativas repetidas

---

## Aparência

- [`src/app/globals.css`](src/app/globals.css) — a paleta inteira, em três estados de tema (segue o aparelho / claro / escuro), e as camadas de foto
- [`src/components/ui.tsx`](src/components/ui.tsx) — `Cartao`, `Campo`, `Entrada`, `Botao`, `Etiqueta`, `Vazio`
- [`src/components/botao-tema.tsx`](src/components/botao-tema.tsx) — o sol/lua
- [`src/components/seletor-cliente.tsx`](src/components/seletor-cliente.tsx) — escolha de cliente por busca
- [`src/components/atualizar-sozinho.tsx`](src/components/atualizar-sozinho.tsx) — recarrega os dados ao voltar para o app

As cores saíram da foto do retrato. Mexer numa cor é mexer **numa linha** no
topo do `globals.css`; os componentes só leem os nomes (`--texto`,
`--superficie`, `--acao`).

---

## Configuração e ambiente

| Variável | Para que serve | Sem ela |
| --- | --- | --- |
| `DATABASE_URL` | conexão do app (pooler, 6543) | não sobe |
| `DIRECT_URL` | migrações (sessão, 5432) | `migrate` falha |
| `SENHA_ACESSO` | a senha de entrada | não entra |
| `SESSION_SECRET` | assina o cookie (≥32 caracteres) | não sobe |
| `CALENDAR_TOKEN` | protege o endereço do `.ics` | calendário do iPhone para |
| `CRON_SECRET` | protege a rota que mantém o banco acordado | o cron é recusado |
| `GOOGLE_MAPS_API_KEY` | distância e tempo de deslocamento | **ausente hoje** — o botão devolve erro |
| `NEXT_PUBLIC_IMG_RETRATO` | foto da tela de entrada | tela sem foto, só a paleta |
| `NEXT_PUBLIC_IMG_ATMOSFERA` | fundo desfocado do app | app sem o fundo |
| `NEXT_PUBLIC_IMG_ROSTO` | miniatura no cabeçalho | cabeçalho sem o retrato |

As fotos **não estão no repositório** de propósito: são de uma pessoa real e o
código é público ([`imagens.ts`](src/lib/imagens.ts) explica). Em
desenvolvimento, as três variáveis ficam no **`.env.local`** apontando para
`/privado/retrato.webp` e companhia, que o Next carrega junto com o `.env`.

O app funciona sem elas: fica só a paleta de cores, e nada quebra.

Outros: [`prisma.config.ts`](prisma.config.ts) (duas conexões, e por quê),
[`vercel.json`](vercel.json) (região `gru1` e o cron diário),
[`next.config.ts`](next.config.ts).

---

## O que está desligado

`ESTOQUE_ATIVO = false` em [`recursos.ts`](src/lib/recursos.ts).

Some a aba de Produtos, a ficha técnica no serviço e o custo no relatório.
**Nada foi apagado do banco** — produtos, fichas e movimentos continuam lá.
Religar é trocar `false` por `true`.

Foi desligado porque estimar o consumo de cada produto se mostrou difícil
demais, e um número ruim contamina o cálculo de lucro.

---

## Armadilhas que já custaram tempo

| Sintoma | Causa | O que fazer |
| --- | --- | --- |
| "column does not exist", HTTP 500 depois de migrar | o `npm run dev` segura o cliente Prisma antigo | reinicie o dev |
| Porta 3000 ocupada e o código novo não aparece | sobrou um `next dev` de antes | encerre o processo da porta 3000 |
| Regex ou `\` sumindo em arquivo gerado por shell | heredoc come a barra invertida | use a ferramenta de escrita, não `cat <<EOF` |
| "não consigo testar isso, tem `server-only`" | o módulo não pode ser importado fora do servidor | extraia a lógica pura para um arquivo sem `server-only` |
| Fundo fixo some atrás de um elemento | `z-index` negativo pinta atrás do fundo do pai | ponha a cor base em outra camada |
| "Quinta-Feira, 5 De Novembro" | `capitalize` maiúscula toda palavra | `first-letter:uppercase` |
| Toque no celular não seleciona | o teclado fecha, a página se mexe, o clique erra o alvo | resolva em `touchend` |
| Teste de tela faz logout sozinho | o cabeçalho tem um `<button type="submit">Sair</button>`, e um seletor por `type` pega ele primeiro | mire o botão pelo texto |
| Texto do título não bate no teste | `uppercase` é CSS: o texto renderizado vem em maiúsculas | compare sem caixa |

---

## Ao mexer em qualquer coisa

```bash
npx tsc --noEmit     # tipos
npx eslint src       # estilo
npm run build        # pega o que o dev não pega
```

Leia o [`AGENTS.md`](AGENTS.md): este Next tem mudanças que quebram o que se
sabia de versões anteriores, e a documentação da versão instalada está em
`node_modules/next/dist/docs/`.
