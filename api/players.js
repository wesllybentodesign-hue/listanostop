import { kv } from '@vercel/kv';

const KEY = 'dota-confirmacao:players';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const players = (await kv.get(KEY)) || [];
    res.status(200).json({ players });
    return;
  }

  if (req.method === 'POST') {
    const players = Array.isArray(req.body?.players) ? req.body.players : [];
    await kv.set(KEY, players);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método não permitido' });
}
