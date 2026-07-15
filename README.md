# Nonstop Classico Dota 2

Site de pagina unica para confirmar presenca no campeonato, com 20 vagas fixas, lista de espera automatica e atualizacao ao vivo via polling.

## Estrutura

- `index.html`: interface completa em HTML/CSS/JS puro.
- `api/players.js`: rota serverless com `GET`, `POST { action: "confirm" }` e `POST { action: "remove" }`.
- `package.json`: scripts para rodar localmente com Vercel.
- `vercel.json`: configuracao minima do deploy.

## Como funciona a persistencia

- As confirmacoes ficam numa lista Redis/KV em `nonstop-classico-dota2:players`.
- Os nicks normalizados ficam num set em `nonstop-classico-dota2:names`.
- A confirmacao usa um script `EVAL` para fazer a checagem de duplicidade e o `RPUSH` de forma atomica, evitando o problema de "ler lista inteira -> regravar lista inteira" sob concorrencia.
- A remocao reconstroi a lista filtrada, o que e aceitavel para esse caso porque cancelamentos sao raros e pouco competitivos.

## Variaveis de ambiente

O projeto aceita qualquer um destes pares:

- `KV_REST_API_URL` + `KV_REST_API_TOKEN`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

Se voce usar Vercel KV, normalmente o par `KV_*` ja sera criado ao conectar o banco.

Para desenvolvimento local, voce pode criar um arquivo `.env.local` com um desses pares.

Exemplo:

```bash
KV_REST_API_URL=https://seu-endpoint.upstash.io
KV_REST_API_TOKEN=seu-token
```

## Rodando localmente

1. Instale a CLI da Vercel se ainda nao tiver:
   `npm i -g vercel`
2. Na pasta do projeto, rode:
   `npm run dev`
3. Abra a URL mostrada no terminal. O `vercel dev` serve o `index.html` e a rota `api/players.js` juntos, como no deploy.

## Deploy na Vercel

1. Crie um novo repositorio no GitHub e envie estes arquivos.
2. No painel da Vercel, clique em `Add New > Project`.
3. Importe o repositorio.
4. Antes do primeiro deploy, crie ou conecte um banco KV/Redis:
   - Opcao A: `Storage > Connect Store > KV` na propria Vercel.
   - Opcao B: um banco Upstash Redis com REST API habilitada.
5. Garanta que as variaveis de ambiente do banco estejam disponiveis no projeto.
6. Faça o deploy.
7. Se conectou o KV depois do primeiro deploy, rode um novo deploy para a funcao serverless passar a enxergar as variaveis.

## GitHub + Vercel em 1 passada

1. Inicialize o repositorio local:
   `git init`
2. Adicione os arquivos:
   `git add .`
3. Crie o primeiro commit:
   `git commit -m "feat: cria site de confirmacao do torneio"`
4. Publique no GitHub e conecte esse repositorio na Vercel.

## Fluxo de teste rapido

1. Abra o site.
2. Digite um nick e clique em `Confirmar presenca`.
3. Verifique se o nick aparece na lista de confirmados e se a tela de sucesso mostra a posicao correta.
4. Repita com mais de 20 nomes para validar a lista de espera.
5. Tente confirmar o mesmo nick com variacoes de maiusculas/minusculas para validar o bloqueio de duplicidade.
6. Clique em `Cancelar` em qualquer nome para testar a remocao com confirmacao.

## Observacoes

- A pagina faz polling em `/api/players` a cada 4 segundos e tambem quando a aba volta a ficar em foco.
- O destaque visual de "meu nick" existe so na sessao atual do navegador e nao persiste ao recarregar a pagina.
- Em falhas de leitura apos a carga inicial, o client mantem a ultima lista valida em memoria e nao zera a interface.
