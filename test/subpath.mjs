// O GitHub Pages serve o app em /treino_de_italiano/, não na raiz. Todos os
// caminhos do app são relativos justamente por isso. Este teste serve o
// repositório sob um subcaminho e confere que nada quebra: a intro, a home
// com os módulos, uma lição, o service worker e o manifest.
import { serve, browser, newPage, listChapters, report } from './lib.mjs';

const PREFIX = 'treino_de_italiano';
const { base, close } = await serve({ prefix: PREFIX });
const b = await browser();
const p = await newPage(b);
const failures = [];
const check = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures.push(msg); };

console.log(`servindo em ${base}`);

await p.goto(base, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
check(await p.isVisible('.intro'), 'a intro aparece');

await p.goto(`${base}#/home`);
await p.waitForTimeout(1200);
const esperados = (await listChapters(p)).length;
const cards = await p.$$eval('.mod-card:not(.soon), .module-card:not(.soon)', (l) => l.length);
check(cards === esperados, `a home mostra os ${esperados} módulos (viu ${cards})`);

const ultimo = (await listChapters(p)).at(-1).id;
await p.goto(`${base}#/modulo/${ultimo}/a`);
await p.waitForTimeout(800);
await p.click('text=Cominciamo!');
await p.waitForSelector('.board', { timeout: 10000 });
await p.waitForTimeout(1200);
check(await p.isVisible('.board'), `a lousa do capítulo ${ultimo} carrega`);

const sw = await p.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return r ? r.scope : null;
});
check(sw === base, `o service worker registra em ${base} (foi ${sw})`);

const man = await p.evaluate(async () => {
  const href = document.querySelector('link[rel=manifest]').href;
  const j = await (await fetch(href)).json();
  return {
    start: new URL(j.start_url, href).href,
    icone: new URL(j.icons[0].src, href).href,
    status: (await fetch(new URL(j.icons[0].src, href))).status,
  };
});
check(man.start === base, `o start_url do manifest aponta para ${base} (foi ${man.start})`);
check(man.status === 200, `o ícone do manifest carrega (${man.status})`);

await b.close();
await close();
report('subcaminho (GitHub Pages)', [...failures, ...p.errors]);
