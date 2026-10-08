// Peças comuns dos testes: servidor estático, navegador e as rotinas que
// percorrem uma lição respondendo tudo.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/**
 * Sobe um servidor estático do repositório numa porta livre.
 * `prefix` serve o app num subcaminho (como faz o GitHub Pages).
 * Devolve `base`, a URL em que o app responde, e `close()`.
 */
export async function serve({ prefix = '' } = {}) {
  const pre = prefix ? `/${prefix.replace(/^\/|\/$/g, '')}` : '';
  const server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pre) {
      if (path === pre) { res.writeHead(301, { location: `${pre}/` }); return res.end(); }
      if (!path.startsWith(`${pre}/`)) { res.writeHead(404); return res.end('fora do prefixo'); }
      path = path.slice(pre.length);
    }
    if (path.endsWith('/')) path += 'index.html';
    // Impede sair da pasta do repositório via ../
    const file = join(ROOT, path);
    if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403); return res.end('fora da raiz'); }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('não encontrado');
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}${pre}/`,
    close: () => new Promise((ok) => server.close(ok)),
  };
}

/**
 * O Playwright pode estar instalado no projeto (npm i -D playwright) ou vir
 * do ambiente. PLAYWRIGHT_MODULE permite apontar um caminho à mão.
 */
async function importPlaywright() {
  const tried = [];
  for (const spec of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright/index.mjs']) {
    if (!spec) continue;
    try { return await import(spec); } catch (e) { tried.push(`  ${spec}\n    ${e.message.split('\n')[0]}`); }
  }
  throw new Error(`Playwright não encontrado. Instale com "npm i -D playwright" ou aponte PLAYWRIGHT_MODULE.\nTentei:\n${tried.join('\n')}`);
}

export async function browser() {
  const { chromium } = await importPlaywright();
  return chromium.launch();
}

export const DESKTOP = { width: 1366, height: 950 };
export const MOBILE = { width: 390, height: 844 };

/** Página nova que acumula erros de console, de página e requisições falhas. */
export async function newPage(b, viewport = DESKTOP) {
  const p = await (await b.newContext({ viewport })).newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(`console: ${m.text()}`); });
  p.on('response', (r) => { if (r.status() >= 400) p.errors.push(`${r.status()}: ${r.url()}`); });
  return p;
}

/** Mapa id → questão de um capítulo, lido do próprio módulo de dados. */
export function questionMap(p, cap) {
  return p.evaluate(async (c) => {
    const m = (await import('./js/data/curriculum.js')).modules[c];
    const q = {};
    for (const r of m.rules) for (const x of r.exercises) q[x.id] = x;
    for (const bk of m.book) for (const x of bk.questions) q[x.id] = x;
    return q;
  }, cap);
}

/** Estrutura do capítulo: partes, quantas questões em cada, tamanho do reforço. */
export function chapterPlan(p, cap) {
  return p.evaluate(async (c) => {
    const m = (await import('./js/data/curriculum.js')).modules[c];
    const size = (pt) => pt.rules.reduce((a, r) => a + r.exercises.length, 0)
      + pt.book.reduce((a, bk) => a + bk.questions.length, 0);
    return {
      title: m.title,
      parts: m.parts.map((pt) => ({ id: pt.id, num: pt.num, title: pt.title, n: size(pt) })),
      practice: Object.fromEntries(Object.entries(m.practice).map(([k, v]) => [k, v.pool.length])),
    };
  }, cap);
}

export async function listChapters(p) {
  return p.evaluate(async () => {
    const { modules } = await import('./js/data/curriculum.js');
    return Object.entries(modules).map(([id, m]) => ({ id: +id, parts: m.parts.map((pt) => pt.id) }));
  });
}

/**
 * Espera a lousa parar de crescer.
 *
 * No celular o painel de exercícios fica *abaixo* da lousa, então enquanto a
 * escrita está sendo animada os botões descem a cada letra e o clique nunca
 * encontra o elemento parado. No desktop os dois ficam lado a lado e o
 * problema não aparece — por isso só os testes a 390px dependem disto.
 */
export async function boardStable(p, { quiet = 350, timeout = 20000 } = {}) {
  const inicio = Date.now();
  let ultima = null;
  let desde = Date.now();
  while (Date.now() - inicio < timeout) {
    const h = await p.evaluate(() => document.querySelector('.lesson-grid > .board')?.offsetHeight ?? -1);
    if (h !== ultima) { ultima = h; desde = Date.now(); } else if (Date.now() - desde >= quiet) return;
    await p.waitForTimeout(60);
  }
}

/**
 * Responde todas as questões ainda em aberto do passo atual. Devolve quantas.
 *
 * Responder uma questão re-renderiza o painel, então guardar referências aos
 * elementos não funciona: elas ficam órfãs no meio do caminho. Por isso aqui
 * cada questão é localizada de novo pelo seletor, e só se passa para a
 * seguinte depois que a atual aparece marcada como respondida.
 */
export async function answerStep(p, qmap) {
  const skip = await p.$('.panel.locked .panel-lock button');
  if (skip) await skip.click();
  await p.waitForSelector('.panel.unlocked', { timeout: 15000 });
  await boardStable(p);
  let n = 0;
  for (let guard = 0; guard < 400; guard++) {
    const pendente = await p.$('.q:not(.answered)');
    if (!pendente) break;
    const id = await pendente.getAttribute('data-id');
    const q = qmap[id];
    if (!q) throw new Error(`questão desconhecida no DOM: ${id}`);
    const a = Array.isArray(q.a) ? q.a[0] : q.a;
    const alvo = `.q[data-id="${id}"]`;
    const controle = q.type === 'choice'
      ? `${alvo} button[data-v="${a.replace(/"/g, '\\"')}"]`
      : `${alvo} input`;

    // O painel renderiza os exercícios em levas e se redesenha a cada
    // resposta, então a questão localizada agora pode sumir antes do clique.
    const pronto = await p.waitForSelector(controle, { timeout: 8000 }).catch(() => null);
    if (!pronto) {
      if (await p.$(`${alvo}:not(.answered)`)) {
        throw new Error(q.type === 'choice'
          ? `falta a opção "${a}" em ${id}`
          : `questão ${id} ficou sem campo de resposta`);
      }
      continue; // sumiu do DOM ou já foi respondida: segue para a próxima
    }

    if (q.type === 'choice') await p.click(controle);
    else { await p.fill(controle, a); await p.press(controle, 'Enter'); }
    await p.waitForSelector(`${alvo}.answered`, { timeout: 8000 });
    n++;
  }
  return n;
}

/** Avança para o próximo passo. Devolve false quando a lição acabou. */
export async function nextStep(p) {
  const last = await p.$('text=Ver meu resultado');
  if (last) { await last.click(); return false; }
  // Respondido o último exercício, o app pode ir sozinho para o resultado:
  // aí não há mais passo nenhum para avançar.
  const titulo = await p.$('.step-title');
  const avancar = await p.$('.lesson-nav .btn-primary');
  if (!titulo || !avancar) return false;
  const before = await titulo.textContent();
  await avancar.click();
  await p.waitForFunction((t) => document.querySelector('.step-title')?.textContent !== t, before, { timeout: 8000 })
    .catch(() => {});
  return true;
}

/** Lê os capítulos pedidos na linha de comando; sem argumentos, devolve todos. */
export function chaptersFromArgv(all) {
  const nums = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
  return nums.length ? nums : all;
}

export function report(name, failures) {
  if (failures.length) {
    console.log(`\n✗ ${name}: ${failures.length} problema(s)`);
    for (const f of failures) console.log(`  · ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`\n✓ ${name}: tudo certo`);
  }
  return failures.length === 0;
}
