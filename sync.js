/* Online sync: saves this app's progress to the server so every device that uses the
   same sync key shares it. Records when each progress entry in localStorage changes and
   merges entry by entry with the server (newest change wins). Must load before the app script. */
(function () {
  // Same-origin when served by the Worker; absolute URL from GitHub Pages or a local file.
  const SERVER = 'https://nihongo-vocab-drill.nihongo-vocab-drill.workers.dev';
  const API = location.protocol === 'file:' || /github\.io$/.test(location.hostname) ? SERVER : '';
  const TRACK = /^(n5-|n4-|vocab-(?!sync-))/;
  const K_KEY = 'vocab-sync-key', K_META = 'vocab-sync-meta', K_LAST = 'vocab-sync-last', K_SEEN = 'vocab-sync-seen';

  let ls;
  try { ls = window.localStorage; ls.getItem('x'); } catch (e) { return; }
  const P = Storage.prototype, rawSet = P.setItem, rawRemove = P.removeItem;
  const set = (k, v) => rawSet.call(ls, k, v), remove = k => rawRemove.call(ls, k);

  let meta = {};
  try { meta = JSON.parse(ls.getItem(K_META)) || {}; } catch (e) {}
  const saveMeta = () => set(K_META, JSON.stringify(meta));
  const getKey = () => ls.getItem(K_KEY);

  P.setItem = function (k, v) { rawSet.call(this, k, v); if (this === ls && TRACK.test(k)) touch(k); };
  P.removeItem = function (k) { rawRemove.call(this, k); if (this === ls && TRACK.test(k)) touch(k); };
  function touch(k) { meta[k] = Date.now(); saveMeta(); schedule(); }

  let timer = null, busy = false, again = false, status = 'idle';
  function schedule() { if (!getKey()) return; clearTimeout(timer); timer = setTimeout(sync, 3000); }

  async function sync(opts = {}) {
    const key = getKey();
    if (!key) return;
    if (busy) { again = true; return; }
    busy = true; setStatus('syncing');
    const start = Date.now(), last = +ls.getItem(K_LAST) || 0;
    const items = Object.keys(meta).filter(k => opts.all || meta[k] > last).map(k => ({ k, v: ls.getItem(k), t: meta[k] }));
    const body = JSON.stringify({ items });
    try {
      const r = await fetch(API + '/api/sync', {
        method: 'POST', body, keepalive: !!opts.keepalive && body.length < 60000,
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      });
      if (r.status === 401) { signOut(); setStatus('badkey'); return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      let changed = false;
      for (const it of data.items || []) {
        if (!TRACK.test(it.k) || (meta[it.k] || 0) >= it.t) continue;
        if (it.v === null) remove(it.k); else set(it.k, it.v);
        meta[it.k] = it.t; changed = true;
      }
      saveMeta(); set(K_LAST, String(start)); set(K_SEEN, String(Date.now()));
      setStatus('ok');
      // Newer progress came from another device: reload so the app reads it.
      if (changed && !opts.noReload) location.reload();
    } catch (e) {
      setStatus('offline');
    } finally {
      busy = false;
      if (again) { again = false; schedule(); }
    }
  }

  async function turnOn() {
    setStatus('syncing');
    try {
      const r = await fetch(API + '/api/account', { method: 'POST' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const { key } = await r.json();
      set(K_KEY, key);
      // Everything on this device becomes the account's starting progress.
      const now = Date.now();
      for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (TRACK.test(k)) meta[k] = now; }
      saveMeta(); remove(K_LAST);
      await sync({ all: true, noReload: true });
    } catch (e) { setStatus('offline'); }
    render();
  }

  async function connect(input) {
    const key = String(input || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key.length !== 20) { setStatus('badkey'); return; }
    if (!confirm('Progress on this device will be replaced by the progress saved with this key. Continue?')) return;
    set(K_KEY, key.match(/.{4}/g).join('-'));
    // Server copy wins: forget this device's change times, then pull.
    meta = {}; saveMeta(); remove(K_LAST);
    await sync();
    render();
  }

  function signOut() { remove(K_KEY); remove(K_LAST); remove(K_SEEN); render(); }

  async function deleteOnline() {
    const key = getKey();
    if (!key || !confirm('Delete your progress from the server? This device keeps its own copy.')) return;
    try {
      await fetch(API + '/api/account', { method: 'DELETE', headers: { authorization: 'Bearer ' + key } });
    } catch (e) {}
    signOut();
  }

  /* ---------- UI: a panel on the home screen ---------- */
  const css = `
.sync{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px}
.sync-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.sync-title{font-weight:700}
.sync-status{font-size:.8rem;color:var(--muted)}
.sync-status.ok{color:var(--ok)}.sync-status.bad{color:var(--bad)}
.sync p{margin:0;font-size:.88rem;color:var(--muted)}
.sync-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.sync-key{font-family:ui-monospace,Consolas,monospace;font-size:1.05rem;letter-spacing:.04em;padding:6px 10px;border-radius:8px;background:var(--accent-soft);color:var(--accent);user-select:all;overflow-wrap:anywhere}
.sync input{flex:1;min-width:0;font:inherit;font-family:ui-monospace,Consolas,monospace;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
.sync .link{background:none;border:none;padding:4px 0;color:var(--muted);font-size:.8rem;text-decoration:underline}`;
  let box = null;

  function setStatus(s) { status = s; paintStatus(); }
  function paintStatus() {
    const el = box && box.querySelector('.sync-status');
    if (!el) return;
    const seen = +ls.getItem(K_SEEN);
    const txt = {
      syncing: 'Syncing…',
      ok: '✓ Synced',
      offline: 'Offline — will retry',
      badkey: 'That sync key was not found',
      idle: getKey() && seen ? '✓ Synced ' + new Date(seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    }[status] || '';
    el.textContent = txt;
    el.className = 'sync-status' + (status === 'ok' || status === 'idle' ? ' ok' : status === 'offline' || status === 'badkey' ? ' bad' : '');
  }

  function render() {
    if (!box) return;
    const key = getKey();
    box.innerHTML = key
      ? `<div class="sync-head"><span class="sync-title">☁ Online sync is on</span><span class="sync-status"></span></div>
         <p>Your progress is saved online. To use it on another phone or laptop, open this site there, tap "I have a sync key" and enter:</p>
         <div class="sync-row"><span class="sync-key"></span><button type="button" data-a="copy">Copy</button></div>
         <p>Keep this key private: anyone with it can see and change your progress.</p>
         <div class="sync-row"><button type="button" class="link" data-a="off">Turn off on this device</button><button type="button" class="link" data-a="del">Delete online data</button></div>`
      : `<div class="sync-head"><span class="sync-title">☁ Online sync</span><span class="sync-status"></span></div>
         <p>Save your progress online so your phone and laptop share it. No email or password needed.</p>
         <div class="sync-row"><button type="button" class="primary" data-a="on">Turn on sync</button><button type="button" data-a="have">I have a sync key</button></div>
         <div class="sync-row" data-enter hidden><input type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="xxxx-xxxx-xxxx-xxxx-xxxx" aria-label="Sync key"><button type="button" class="primary" data-a="connect">Connect</button></div>`;
    if (key) box.querySelector('.sync-key').textContent = key;
    paintStatus();
  }

  function mount() {
    const home = document.getElementById('home');
    if (!home) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    box = document.createElement('section'); box.className = 'sync'; box.setAttribute('aria-label', 'Online sync');
    home.appendChild(box);
    box.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const act = a.dataset.a;
      if (act === 'on') turnOn();
      else if (act === 'have') { const row = box.querySelector('[data-enter]'); row.hidden = false; row.querySelector('input').focus(); }
      else if (act === 'connect') connect(box.querySelector('input').value);
      else if (act === 'copy') { navigator.clipboard?.writeText(getKey()).then(() => { a.textContent = 'Copied'; setTimeout(() => a.textContent = 'Copy', 1500); }, () => {}); }
      else if (act === 'off') { if (confirm('Stop syncing on this device? Your progress stays here and online.')) signOut(); }
      else if (act === 'del') deleteOnline();
    });
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) connect(e.target.value); });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  document.addEventListener('visibilitychange', () => {
    if (!getKey()) return;
    if (document.visibilityState === 'hidden') { clearTimeout(timer); sync({ keepalive: true, noReload: true }); }
    else sync();
  });
  if (getKey()) sync();
})();
