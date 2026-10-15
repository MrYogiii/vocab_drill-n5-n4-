/* Backend for the vocab drill: serves the static app and a small sync API.
   A user is identified only by a random sync key (no email, no password); the
   database stores a SHA-256 hash of the key, never the key itself.
   Progress is a set of localStorage entries {k, v, t}; for each entry the newest t wins. */

const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i, easy to type
const KEY_LEN = 20;
const MAX_BODY = 2_000_000;
const MAX_ITEMS = 500;

const CORS = {
  'access-control-allow-origin': '*', // auth is a bearer header, not a cookie, so * is safe
  'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-max-age': '86400',
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });

const normKey = k => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fmtKey = k => k.match(/.{4}/g).join('-');

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function newKey() {
  let out = '';
  while (out.length < KEY_LEN) {
    for (const b of crypto.getRandomValues(new Uint8Array(32))) {
      if (b < 248 && out.length < KEY_LEN) out += ALPHA[b % 31]; // 248 = 8*31, avoids modulo bias
    }
  }
  return out;
}

async function findUser(req, env) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') || '');
  if (!m) return null;
  const key = normKey(m[1]);
  if (key.length !== KEY_LEN) return null;
  return env.DB.prepare('SELECT id FROM users WHERE key_hash = ?').bind(await sha256(key)).first();
}

async function api(req, env, path) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (path === '/api/health') return json({ ok: true });

  if (path === '/api/account' && req.method === 'POST') {
    const key = newKey(), now = Date.now();
    await env.DB.prepare('INSERT INTO users (key_hash, created_at, last_seen) VALUES (?, ?, ?)')
      .bind(await sha256(key), now, now).run();
    return json({ key: fmtKey(key) });
  }

  const user = await findUser(req, env);
  if (!user) return json({ error: 'invalid sync key' }, 401);

  if (path === '/api/sync' && req.method === 'POST') {
    const body = await req.text();
    if (body.length > MAX_BODY) return json({ error: 'too large' }, 413);
    let items;
    try { ({ items = [] } = JSON.parse(body || '{}')); } catch { return json({ error: 'bad json' }, 400); }
    if (!Array.isArray(items) || items.length > MAX_ITEMS) return json({ error: 'bad items' }, 400);
    const stmts = [];
    for (const it of items) {
      const ok = it && typeof it.k === 'string' && it.k.length <= 100 && Number.isFinite(it.t) &&
        (it.v === null || typeof it.v === 'string');
      if (!ok) return json({ error: 'bad item' }, 400);
      stmts.push(env.DB.prepare(
        `INSERT INTO kv (user_id, k, v, t) VALUES (?, ?, ?, ?)
         ON CONFLICT (user_id, k) DO UPDATE SET v = excluded.v, t = excluded.t WHERE excluded.t > kv.t`
      ).bind(user.id, it.k, it.v, Math.floor(it.t)));
    }
    stmts.push(env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(Date.now(), user.id));
    await env.DB.batch(stmts);
    const { results } = await env.DB.prepare('SELECT k, v, t FROM kv WHERE user_id = ?').bind(user.id).all();
    return json({ items: results, now: Date.now() });
  }

  if (path === '/api/account' && req.method === 'DELETE') {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM kv WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);
    return json({ ok: true });
  }

  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      return await api(req, env, url.pathname);
    } catch (e) {
      console.error(e);
      return json({ error: 'server error' }, 500);
    }
  },
};
