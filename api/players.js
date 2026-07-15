import { kv } from '@vercel/kv';

const KEY = 'dota-confirmacao:players';

async function getAll() {
  const raw = await kv.lrange(KEY, 0, -1);
  return raw.map(item => (typeof item === 'string' ? JSON.parse(item) : item));
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const players = await getAll();
      res.status(200).json({ players });
      return;
    }

    if (req.method === 'POST') {
      const { action, name } = req.body || {};
      const trimmed = typeof name === 'string' ? name.trim() : '';

      if (!trimmed) {
        res.status(400).json({ ok: false, error: 'Nome vazio.' });
        return;
      }

      if (action === 'confirm') {
        const current = await getAll();
        const exists = current.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
          res.status(200).json({ ok: false, reason: 'duplicate', players: current });
          return;
        }

        const entry = { name: trimmed, ts: Date.now() };
        // rpush is atomic on Redis: two players confirming at the exact same
        // moment can never overwrite or erase each other's entry, unlike a
        // "read the whole list, modify it, write it back" approach.
        await kv.rpush(KEY, JSON.stringify(entry));

        const updated = await getAll();
        const slotIndex = updated.findIndex(p => p.name === entry.name && p.ts === entry.ts);
        res.status(200).json({ ok: true, players: updated, slotIndex });
        return;
      }

      if (action === 'remove') {
        const current = await getAll();
        const filtered = current.filter(p => p.name !== trimmed);
        // Cancellations are rare and not time-critical like the initial rush
        // to confirm, so a full rewrite here is an acceptable trade-off.
        await kv.del(KEY);
        if (filtered.length) {
          await kv.rpush(KEY, ...filtered.map(p => JSON.stringify(p)));
        }
        res.status(200).json({ ok: true, players: filtered });
        return;
      }

      res.status(400).json({ ok: false, error: 'Ação inválida.' });
      return;
    }

    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('Erro na API de confirmação:', err);
    res.status(500).json({
      error: 'Erro interno. Verifique se o banco Vercel KV está criado e conectado a este projeto.'
    });
  }
}
