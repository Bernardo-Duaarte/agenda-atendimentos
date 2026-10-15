# Agenda

[English](README.md) · **Português**

Sistema de agenda, clientes e estoque para atendimento de maquiagem — estúdio e
domicílio. Uso pessoal, uma pessoa só.

## Como rodar

Precisa de Node 22 ou mais novo.

```bash
npm install
cp .env.example .env    # e preencha (veja abaixo)
npm run db:migrate      # cria as tabelas
npm run db:seed         # opcional: serviços e produtos de exemplo
npm run dev             # http://localhost:3000
```

## Variáveis de ambiente

Todas ficam no `.env`, que **nunca** vai para o Git.

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Conexão que o app usa. Supabase, pooler na porta **6543**. |
| `DIRECT_URL` | Conexão das migrations. Mesmo banco, porta **5432**. |
| `SENHA_ACESSO` | A senha com que você entra. Mínimo 8 caracteres. |
| `SESSION_SECRET` | Assina o cookie de sessão. Trocar desloga todo mundo. |
| `CRON_SECRET` | Protege a rota que mantém o banco acordado. |
| `CALENDAR_TOKEN` | Protege o endereço da agenda assinada no iPhone. Quem tem o link vê a agenda: trate como senha. |
| `GOOGLE_MAPS_API_KEY` | Calcula distância e tempo até a cliente (Routes API). Opcional: sem ela, ida, volta e taxa ficam manuais. |

Para gerar um segredo aleatório:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe em desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run db:migrate` | Cria/aplica migrations (e regenera o client) |
| `npm run db:deploy` | Aplica migrations sem criar novas (produção) |
| `npm run db:seed` | Insere os dados de exemplo |
| `npm run db:studio` | Abre o navegador de tabelas do Prisma |
| `npm run lint` | Verifica o código |

## Decisões que valem saber

**Dinheiro é sempre inteiro, em centavos.** Nunca `Float` — em ponto flutuante
`0,1 + 0,2` não dá `0,3`, e num relatório de faturamento isso vira centavo
sumido.

**Estoque não é um campo, é uma soma.** O saldo de um produto é a soma dos
movimentos dele. Custa uma consulta a mais e garante que sempre dá para
responder *por que* a base acabou.

**Custo de produto é por unidade, derivado da compra.** Você cadastra "frasco
de 35 ml por R$ 229" e o sistema divide. Guardar o preço do frasco faria 4 ml de
base custarem um frasco inteiro.

**Datas são gravadas em UTC.** A conversão para São Paulo acontece só na
exibição, em `src/lib/tempo.ts`, que é a única fronteira de fuso do projeto.

**A agenda considera o deslocamento.** Um atendimento ocupa de
`início − ida` até `fim + volta`, não apenas `início`–`fim`.

## Segurança

- **TLS verificado** até o banco, com a CA do Supabase fixada em
  `src/lib/supabase-ca.ts`. Sem isso o driver conecta em texto claro.
- **Login com senha única**, sessão em cookie assinado (`httpOnly`, `secure`,
  `sameSite=lax`), válida por 30 dias.
- **Verificação em cada página e em cada Server Action.** Server Actions são
  endpoints POST reais, alcançáveis sem passar por página ou layout — checar só
  no proxy ou no layout deixaria buraco.
- **Limite de tentativas gravado no banco**, não em memória: em ambiente
  serverless cada instância teria o próprio contador.
- **A API pública do Supabase está fechada** — permissões de `anon` e
  `authenticated` revogadas, RLS ligado sem política em todas as tabelas.
  Não crie políticas nem desligue o RLS pelo painel.
- **O banco valida o que o código valida.** Restrições `CHECK` recusam preço
  negativo, atendimento que termina antes de começar e baixa de estoque com
  sinal invertido.

> ⚠️ O Prisma **ignora** os parâmetros de SSL nas migrations (testado: até
> `sslmode=disable` e uma CA falsa conectam). Mantenha **Enforce SSL** ligado no
> painel do Supabase — é o servidor que fecha esse caminho, não o cliente.

## Publicação

Hospedado na Vercel. O `vercel.json` fixa a região em São Paulo (`gru1`), perto
do banco, e agenda uma visita diária a `/api/manter-acordado` — o plano
gratuito do Supabase pausa o projeto após 7 dias sem acesso.

As variáveis do `.env` precisam ser cadastradas também no painel da Vercel.
