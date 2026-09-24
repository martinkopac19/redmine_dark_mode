/* Nafotí zoznam stránok v tmavom režime — pomôcka pri dolaďovaní šablóny.
 *
 * Nie je to test (nič netvrdí, nič neoveruje), je to fotoaparát: pri prekrývaní farieb
 * je rýchlejšie pozrieť sa na päť obrazoviek naraz než hádať zo selektorov.
 *
 *   node extra/shots.mjs <base> <login> <heslo> <adresar> [port] <cesta:nazov> ...
 *
 * Rozmer okna sa vynucuje cez CDP — prepínač `--window-size` headless Edge ignoruje
 * a v úzkom okne Redmine prepne na mobilné rozloženie, kde je hlavička úplne inde.
 */
import { writeFileSync } from 'node:fs';

const [BASE, LOGIN, PASS, OUT, PORT = '9393', ...pages] = process.argv.slice(2);
if (!pages.length) {
  console.error('pouzitie: node shots.mjs <base> <login> <heslo> <adresar> <port> <cesta:nazov> ...');
  process.exit(2);
}

const list = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json();
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => { ws.onopen = r; });
await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value;
async function nav(url) {
  await send('Page.navigate', { url });
  for (let i = 0; i < 80 && !(await ev('document.readyState === "complete"')); i++) await sleep(250);
  await sleep(800);
}

await nav(`${BASE}/login?nosso=1`);
if (await ev(`!!document.querySelector('#username')`)) {
  await ev(`document.querySelector('#username').value = ${JSON.stringify(LOGIN)};
            document.querySelector('#password').value = ${JSON.stringify(PASS)};
            document.querySelector('form').submit(); true`);
  await sleep(2500);
}

// Tmavý režim sa zapína raz; je uložený k účtu, takže platí na všetkých ďalších stránkach.
if (await ev(`document.documentElement.getAttribute('data-dark') !== '1'`)) {
  await ev(`document.querySelector('a[data-rdm="toggle"]').click(); true`);
  await sleep(1500);
}

for (const p of pages) {
  const i = p.lastIndexOf(':');
  const path = p.slice(0, i);
  const name = p.slice(i + 1);
  // Cesta zakoncena `#bottom` znamena „pred odfotenim odroluj dole" — komentare
  // a pole na novy komentar su az pod prehybom.
  const bottom = path.endsWith('#bottom');
  // `#plus` rozbali ponuku pod „+" v hlavicke projektu — inak sa ukaze az pri
  // prejdeni mysou a na snimke by nebola.
  const plus = path.endsWith('#plus');
  // `#flyout` odfotí stránku v šírke mobilu s otvoreným bočným menu. Šírka sa musí
  // nastaviť PRED načítaním — jadro presúva menu do vysúvacieho panela pri štarte.
  const flyout = path.endsWith('#flyout');
  // `#drag` nasimuluje ťahanie bloku na My page (jadro vtedy pridá triedu `dragging`),
  // aby sa dalo overiť, že miesta na pustenie sú pri ťahaní stále vidieť.
  const drag = path.endsWith('#drag');
  const suffix = [bottom && '#bottom', plus && '#plus', flyout && '#flyout', drag && '#drag'].find(Boolean);
  const clean = suffix ? path.slice(0, -suffix.length) : path;
  if (flyout) await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 1, mobile: true });
  await nav(BASE + clean);
  if (bottom) {
    await ev(`window.scrollTo(0, document.body.scrollHeight); true`);
    await sleep(900);
  }
  if (plus) {
    await ev(`(function(){ var u = document.querySelector('#main-menu ul.menu-children'); if (u) u.classList.add('visible'); return !!u; })()`);
    await sleep(400);
  }
  if (flyout) {
    await ev(`(function(){ var b = document.querySelector('.js-flyout-menu-toggle-button'); if (b) b.click(); else document.documentElement.classList.add('flyout-is-active'); return true; })()`);
    await sleep(700);
  }
  if (drag) {
    await ev(`document.body.classList.add('dragging'); true`);
    await sleep(300);
  }
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (flyout) await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log(`  ${name}.png  ←  ${path}`);
}

console.log('hotovo');
process.exit(0);
