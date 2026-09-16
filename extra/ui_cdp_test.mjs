/* UI test tmavého režimu — headless Edge cez Chrome DevTools Protocol.
 *
 * Overuje to, čo sa zo servera overiť nedá: že mesiačik je v hlavičke MEDZI lievikom
 * a odhlásením, že klik naozaj prefarbí stránku, že voľba prežije obnovenie stránky
 * (je uložená k účtu, nie v prehliadači) a že druhý klik vráti svetlý režim.
 *
 * Popri tom uloží snímky svetlej a tmavej verzie, aby sa dali porovnať očami.
 *
 *   EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
 *   "$EDGE" --headless=new --disable-gpu --remote-debugging-port=9393 \
 *           --user-data-dir="$(cygpath -w /tmp)/cdpDM" --window-size=1500,1100 about:blank &
 *   node extra/ui_cdp_test.mjs <base> <login> <heslo> <issueId> [port] [adresarNaSnimky]
 */
import { writeFileSync } from 'node:fs';

const [BASE, LOGIN, PASS, ISSUE, PORT = '9393', SHOTS = ''] = process.argv.slice(2);
if (!ISSUE) {
  console.error('pouzitie: node ui_cdp_test.mjs <base> <login> <heslo> <issueId> [port] [adresar]');
  process.exit(2);
}

const list = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json();
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => { ws.onopen = r; });

// Rozmer okna sa vynucuje TU, nie prepinacom `--window-size`. Ten headless Edge tichmo
// ignoruje — nameraneho 500x450 stacilo na to, aby Redmine prepol na mobilne rozlozenie
// a presunul ucetne menu do vysuvacej ponuky, takze test meral uplne iny header.
await send('Emulation.setDeviceMetricsOverride', {
  width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async x => {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true });
  if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'JS err');
  return r?.result?.value;
};
async function waitFor(x, label, ms = 20000) {
  const until = Date.now() + ms;
  for (;;) { try { if (await ev(x)) return true; } catch (e) {} if (Date.now() > until) throw new Error('timeout: ' + label); await sleep(250); }
}
async function nav(url) {
  await send('Page.navigate', { url });
  await waitFor('document.readyState === "complete"', 'nacitanie ' + url);
  await sleep(600);
}
async function shot(name) {
  if (!SHOTS) return;
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log(`  (snimka ${name}.png)`);
}

const OK = []; const BAD = [];
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  (ok ? OK : BAD).push(label);
  console.log('  ' + label.padEnd(50) + (ok ? 'OK' : '!! ZLE (' + JSON.stringify(got) + ', cakalo sa ' + JSON.stringify(want) + ')'));
}

const MOON = `document.querySelector('a[data-rdm="toggle"]')`;
const DARK = `document.documentElement.getAttribute('data-dark')`;

console.log('='.repeat(78));
console.log('  tmavy rezim — UI');
console.log('='.repeat(78));

// --- prihlasenie ------------------------------------------------------------
await nav(`${BASE}/login?nosso=1`);
// Prihlasovaci formular tu byt nemusi — prehliadac si session drzi medzi behmi testu.
if (await ev(`!!document.querySelector('#username')`)) {
  await ev(`document.querySelector('#username').value = ${JSON.stringify(LOGIN)};
            document.querySelector('#password').value = ${JSON.stringify(PASS)};
            document.querySelector('#login-form form, form#login-form, form').submit(); true`);
  await waitFor(`!document.querySelector('#username')`, 'prihlasenie');
  await sleep(600);
}

console.log('\n[1] Ikona v hlavicke');
check('mesiacik existuje', await ev(`!!${MOON}`), true);
check('je v #account', await ev(`!!${MOON} && !!${MOON}.closest('#account')`), true);

// Poradie sa meria SURADNICOU, nie poradim v DOM — tema polozky prehadzuje cez flex
// `order`, takze DOM o vizualnom poradi nevypoveda nic.
const order = await ev(`(() => {
  const x = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().left) : null; };
  return { filter: x('#account .notification-filter'), moon: x('a[data-rdm="toggle"]'), logout: x('#account .logout') };
})()`);
console.log('  suradnice (px):', JSON.stringify(order));
if (order.filter !== null && order.logout !== null) {
  check('mesiacik je napravo od lievika', order.moon > order.filter, true);
  check('mesiacik je nalavo od odhlasenia', order.moon < order.logout, true);
} else {
  console.log('  (poradie sa neda overit — lievik alebo odhlasenie v hlavicke nie su)');
}

// --- svetly stav ------------------------------------------------------------
await nav(`${BASE}/issues/${ISSUE}`);
check('na zaciatku je svetly rezim', await ev(DARK), '0');
const lightBg = await ev(`getComputedStyle(document.body).backgroundColor`);
console.log('  pozadie (svetle):', lightBg);
await shot('darkmode-svetly');

// --- prepnutie --------------------------------------------------------------
console.log('\n[2] Prepnutie');
await ev(`${MOON}.click(); true`);
await waitFor(`${DARK} === '1'`, 'prepnutie do tmy');
const darkBg = await ev(`getComputedStyle(document.body).backgroundColor`);
console.log('  pozadie (tmave): ', darkBg);
check('pozadie sa naozaj zmenilo', darkBg !== lightBg, true);

// Jasnost pozadia — tmavy rezim musi byt naozaj tmavy, nie len iny odtien.
const lum = await ev(`(() => {
  const m = getComputedStyle(document.body).backgroundColor.match(/\\d+/g);
  return m ? Math.round((+m[0] * 0.299 + +m[1] * 0.587 + +m[2] * 0.114)) : null;
})()`);
console.log('  jasnost pozadia (0-255):', lum);
check('pozadie je tmave (< 60)', lum !== null && lum < 60, true);
await shot('darkmode-tmavy');

// --- trvanlivost ------------------------------------------------------------
console.log('\n[3] Volba sa uklada k uctu');
await nav(`${BASE}/issues/${ISSUE}`);
check('po obnoveni stranky stale tmavy', await ev(DARK), '1');
await nav(`${BASE}/projects`);
check('plati aj na inej stranke', await ev(DARK), '1');
await shot('darkmode-zoznam');

// --- navrat -----------------------------------------------------------------
console.log('\n[4] Navrat do svetla');
await ev(`${MOON}.click(); true`);
await waitFor(`${DARK} === '0'`, 'prepnutie spat');
await nav(`${BASE}/projects`);
check('po obnoveni stranky svetly', await ev(DARK), '0');

console.log('\n' + '='.repeat(78));
console.log(`  OK: ${OK.length}   ZLE: ${BAD.length}`);
if (BAD.length) { console.log('  zlyhalo: ' + BAD.join(', ')); }
console.log('='.repeat(78));
process.exit(BAD.length ? 1 : 0);
