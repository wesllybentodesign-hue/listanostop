# Confirmação — Nonstop Clássico Dota 2

Site simples para os jogadores confirmarem presença nas 20 vagas do evento (21/08/2026).

- `index.html` — a página (front-end).
- `api/players.js` — função serverless que guarda a lista de confirmados, compartilhada entre todos que acessarem o link.
- `package.json` — dependência da função (`@vercel/kv`).

> **Importante:** este projeto guarda os dados no **Vercel KV** (um banco chave-valor gratuito no plano free da Vercel), usando uma lista Redis com `rpush` — cada confirmação é adicionada de forma atômica, então mesmo que várias pessoas confirmem ao mesmo tempo, ninguém sobrescreve a confirmação de outra. Sem o KV configurado, a página carrega mas ninguém consegue salvar confirmação. Siga os passos abaixo — leva uns 5 minutos.

## 1. Subir no GitHub

1. Crie um repositório novo no GitHub (pode ser privado ou público).
2. Envie esta pasta inteira para o repositório. Se você tem o Git instalado:
   ```bash
   cd dota-confirmacao
   git init
   git add .
   git commit -m "Site de confirmação do evento"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```
   Se preferir, dá pra fazer isso direto pelo site do GitHub, usando "Upload files" e arrastando os arquivos.

## 2. Importar na Vercel

1. Entre em [vercel.com/new](https://vercel.com/new) e conecte sua conta do GitHub.
2. Selecione o repositório que você acabou de criar.
3. Não precisa mexer em nenhuma configuração de build — é um projeto estático simples com uma função de API. Clique em **Deploy**.

Nesse ponto o site já vai estar no ar, mas a confirmação de presença ainda não vai salvar (falta o banco de dados).

## 3. Criar o banco de dados (Vercel KV)

1. Dentro do projeto na Vercel, vá na aba **Storage**.
2. Clique em **Create Database** → escolha **KV** (é gratuito no plano Hobby).
3. Depois de criado, clique em **Connect Project** e selecione este projeto. Isso adiciona as variáveis de ambiente necessárias automaticamente.
4. Vá na aba **Deployments**, abra os três pontinhos do último deploy e clique em **Redeploy** (para a função pegar as novas variáveis de ambiente).

## 4. Pronto

A URL que a Vercel gerou (algo como `https://seu-projeto.vercel.app`) é o link que você manda no grupo do WhatsApp. Todo mundo que abrir vai ver a mesma lista de confirmados em tempo real.

## Testando localmente (opcional)

Se você tiver o [Vercel CLI](https://vercel.com/docs/cli) instalado:
```bash
npm i -g vercel
vercel dev
```
Ele vai pedir para linkar ao projeto na Vercel (para usar o mesmo banco KV) e então abrir em `http://localhost:3000`.
