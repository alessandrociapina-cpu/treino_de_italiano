// Renderização das questões e correção instantânea.
import { h, speakBtn, speak } from './ui.js';

const GENDER = { m: 'maschile', f: 'femminile' };
const GENDER_PT = { m: 'masculino', f: 'feminino' };
const NO_ART = '—';

/** Junta artigo e palavra: "l'" cola na palavra, os demais levam espaço. */
export const joinArt = (art, word) =>
  (art === NO_ART ? word : art.endsWith("'") ? art + word : `${art} ${word}`);

const norm = (s) => String(s ?? '').toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();
const plain = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

export const accepted = (q) => (Array.isArray(q.a) ? q.a : [q.a]);

/** Resposta canônica em texto legível. */
export function answerText(q) {
  const a = accepted(q)[0];
  if (q.kind === 'gender') return GENDER[a];
  if (q.kind === 'ending') return q.stem + a;
  if (q.kind === 'fill') return lastWord(q.before) + a;
  if (q.kind === 'article') return q.ctx ? q.ctx.replace('___', a === NO_ART ? '' : a).replace(/\s+/g, ' ').trim() : joinArt(a, q.w);
  return a;
}

const lastWord = (s) => (s.match(/(\S+)$/) || ['', ''])[1];

/** Corrige uma resposta. Retorna { ok, accentOnly }. */
export function check(q, given) {
  const g = norm(given);
  let options = accepted(q).map(norm);
  // Na múltipla escolha o aluno não digita: a opção é exata. Sem isso, escolher a
  // armadilha "da" em vez de "dà" contaria como acerto com aviso de acento.
  if (q.type === 'choice') return { ok: options.includes(g) };
  // Para lacunas, aceita também a palavra inteira (ex.: "pranzo" em vez de "o").
  if (q.kind === 'ending') options = options.concat(options.map((o) => norm(q.stem) + o));
  if (q.kind === 'fill') options = options.concat(options.map((o) => norm(lastWord(q.before)) + o));
  // Numa frase reescrita, a pontuação final e os parênteses do pronome não contam.
  if (q.kind === 'transform') {
    const loose = (x) => x.replace(/[.?!…]+$/, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
    if (options.map(loose).includes(loose(g))) return { ok: true };
    if (options.map((o) => plain(loose(o))).includes(plain(loose(g))) && g) return { ok: true, accentOnly: true };
  }
  if (options.includes(g)) return { ok: true };
  if (options.map(plain).includes(plain(g)) && g) return { ok: true, accentOnly: true };
  return { ok: false };
}

/** Texto do que o aluno respondeu, para mostrar na correção. */
function givenText(q, given) {
  if (q.kind === 'gender') return GENDER[given] || given;
  if (q.kind === 'ending' && given.length <= 3) return q.stem + given;
  if (q.kind === 'fill' && given.length <= 3) return lastWord(q.before) + given;
  if (q.kind === 'article') return q.ctx ? q.ctx.replace('___', given === NO_ART ? '' : given).replace(/\s+/g, ' ').trim() : joinArt(given, q.w);
  return given;
}

export function feedback(q, given, result, rule) {
  const why = q.why || rule?.short || '';
  const ruleTag = rule ? h('span.rule-tag', {}, `Regra ${rule.num}`) : null;
  if (result.ok) {
    return h('div.feedback.ok', { role: 'status' },
      h('div.fb-title', {}, h('strong', {}, '✓ Giusto!'), ' ', h('span', {}, 'Correto!')),
      result.accentOnly ? h('p', { html: `Atenção ao acento: escreve-se <b>${answerText(q)}</b>.` }) : null,
      q.why ? h('p.fb-why', { html: q.why }) : null);
  }
  return h('div.feedback.ko', { role: 'alert' },
    h('div.fb-title', {}, h('strong', {}, '✗ Sbagliato'), ' ', ruleTag),
    h('p', { html: `Você respondeu <s>${escapeHtml(givenText(q, given)) || '—'}</s> → o correto é <b>${answerText(q)}</b>${/[.?!…]$/.test(answerText(q)) ? '' : '.'}` }),
    why ? h('p.fb-why', { html: `<span class="why-label">Por quê?</span> ${why}` }) : null);
}

/** Gerador pseudoaleatório determinístico a partir de um texto. */
function seeded(text) {
  let seed = 2166136261;
  for (const ch of text) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  // Espalha bem o hash: textos parecidos não podem dar sorteios parecidos.
  seed ^= seed >>> 16; seed = Math.imul(seed, 0x85ebca6b);
  seed ^= seed >>> 13; seed = Math.imul(seed, 0xc2b2ae35);
  seed ^= seed >>> 16;
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Opções da múltipla escolha na ordem em que o aluno as vê. Nos dados a resposta
 * certa quase sempre vem primeiro; desenhada assim, dava para acertar pela posição.
 *
 * O lugar da resposta certa é distribuído por bloco (ex2-1, ex2-2…): a cada grupo
 * de questões vizinhas — tantas quantas as opções —, cada lugar recebe a resposta
 * uma vez, numa ordem sorteada. Fica equilibrado sem virar um padrão fixo.
 * Tudo sai da própria questão, então a ordem é sempre a mesma para ela: o painel
 * pode se redesenhar, ou a sessão ser retomada, sem as opções trocarem de lugar.
 */
export function shuffledOpts(q) {
  const certa = accepted(q).find((a) => q.opts.includes(a));
  const outras = shuffle(q.opts.filter((o) => o !== certa), seeded(`${q.id}|${q.q}|${q.opts.join('|')}`));
  if (certa == null) return outras;
  const n = q.opts.length;
  const m = String(q.id).match(/^(.*)-(\d+)$/);
  let lugar;
  if (m) {
    const k = Number(m[2]) - 1;
    const grupo = shuffle([...Array(n).keys()], seeded(`${m[1]}|${Math.floor(k / n)}|${n}`));
    lugar = grupo[k % n];
  } else {
    lugar = Math.floor(seeded(`${q.id}|${q.q}`)() * n);
  }
  outras.splice(lugar, 0, certa);
  return outras;
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Desenha uma questão. `onAnswer({ given, ok })` é chamado uma única vez.
 * `prev` = resposta já dada (ao retomar uma sessão), mostra a questão travada.
 */
export function renderQuestion(q, { rule, onAnswer, prev, number, big = false } = {}) {
  const box = h(`div.q.q-${q.kind}${big ? '.q-big' : ''}`, { 'data-id': q.id });
  const fbSlot = h('div.fb-slot');
  let done = false;

  const finish = (given, silent) => {
    if (done) return;
    done = true;
    const res = check(q, given);
    box.classList.add(res.ok ? 'is-ok' : 'is-ko', 'answered');
    box.querySelectorAll('button.opt, input, button.verify').forEach((n) => { n.disabled = true; });
    if (q.type === 'choice') {
      box.querySelectorAll('button.opt').forEach((b) => {
        if (accepted(q).includes(b.dataset.v)) b.classList.add('correct');
        else if (b.dataset.v === given) b.classList.add('wrong');
      });
    } else {
      const inp = box.querySelector('input');
      if (inp) inp.value = given;
    }
    fbSlot.append(feedback(q, given, res, rule));
    if (!silent) onAnswer?.({ given, ok: res.ok });
  };

  const num = number != null ? h('span.q-num', {}, number) : null;

  if (q.kind === 'gender') {
    const word = h('span.word', {}, q.w);
    const head = q.ctx
      ? h('div.q-head', {}, num, h('span.ctx', { html: q.ctx.replace(q.w, `<mark>${q.w}</mark>`) }), speakBtn(q.ctx))
      : h('div.q-head', {}, num, word, speakBtn(q.w));
    box.append(head, h('div.opts', {},
      ...q.opts.map((v) => h(`button.opt.g-${v}`, { type: 'button', 'data-v': v, onclick: () => finish(v) },
        h('span.g-badge', {}, v.toUpperCase()), GENDER[v], h('small', {}, GENDER_PT[v])))));
  } else if (q.kind === 'article') {
    const head = q.ctx
      ? h('div.q-head', {}, num, h('span.ctx', { html: q.ctx.replace('___', '<span class="blank">?</span>') }), speakBtn(q.ctx.replace('___', '')))
      : h('div.q-head', {}, num, h('span.word', {}, q.w), speakBtn(q.w));
    if (q.note) head.append(h('span.note', {}, q.note));
    box.append(head, h('div.opts.opts-art', {},
      ...q.opts.map((v) => h('button.opt.art', { type: 'button', 'data-v': v, onclick: () => finish(v) }, v))));
  } else if (q.kind === 'mc') {
    box.append(h('div.q-head', {}, num, h('span.ctx', { html: q.q })),
      h('div.opts', {}, ...shuffledOpts(q).map((v) => h('button.opt', { type: 'button', 'data-v': v, onclick: () => finish(v) }, v))));
  } else {
    const input = h('input', {
      type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', lang: 'it',
      'aria-label': 'Sua resposta', enterkeyhint: 'done',
      onkeydown: (e) => { if (e.key === 'Enter' && input.value.trim()) { e.preventDefault(); finish(input.value.trim()); } },
    });
    const verify = h('button.verify', { type: 'button', onclick: () => { if (input.value.trim()) finish(input.value.trim()); else input.focus(); } }, 'Verificar');
    let line;
    if (q.kind === 'transform') {
      input.placeholder = 'riscrivi la frase…';
      box.append(h('div.q-head', {}, num, h('span.ctx', {}, q.from), speakBtn(q.from),
        q.how ? h('span.chip', {}, q.how) : null),
        h('div.answer-row', {}, input, verify));
    } else if (q.kind === 'verb') {
      input.classList.add('mid');
      input.placeholder = '?';
      const [before, after = ''] = q.ctx.split('___');
      box.append(h('div.q-head', {}, num,
        h('span.ctx.inline', {}, before, input, after),
        q.hint ? h('span.base', {}, `(${q.hint})`) : null, speakBtn(q.ctx.replace('___', '')), verify));
    } else if (q.kind === 'adj') {
      input.classList.add('mid');
      input.placeholder = '?';
      const [before, after = ''] = q.ctx.split('___');
      box.append(h('div.q-head', {}, num,
        h('span.ctx.inline', {}, before, input, after),
        h('span.base', {}, `(${q.base})`), speakBtn(q.ctx.replace('___', q.base)), verify));
    } else if (q.kind === 'phrase') {
      input.placeholder = 'articolo + nome + aggettivo…';
      box.append(h('div.q-head', {}, num, h('span.word', {}, q.w), speakBtn(q.w),
        h('span.base', {}, `(${q.base})`), h('span.chip', {}, 'articolo + aggettivo')),
        h('div.answer-row', {}, input, verify));
    } else if (q.kind === 'artplural') {
      input.placeholder = 'articolo + plurale…';
      box.append(h('div.q-head', {}, num, h('span.word', {}, q.w), speakBtn(q.w),
        h('span.arrow', { title: 'plural' }, '→'), h('span.chip', {}, 'articolo + plurale')),
        h('div.answer-row', {}, input, verify));
    } else if (q.kind === 'plural' || q.kind === 'singular') {
      input.placeholder = q.kind === 'plural' ? 'plurale…' : 'singolare…';
      line = h('div.q-head', {}, num,
        h('span.word', {}, q.w), speakBtn(q.w),
        h('span.arrow', { title: q.kind === 'plural' ? 'plural' : 'singular' }, '→'),
        h('span.chip', {}, q.kind === 'plural' ? 'plurale' : 'singolare'));
      box.append(line, h('div.answer-row', {}, input, verify));
    } else if (q.kind === 'ending') {
      input.classList.add('mini');
      input.maxLength = 12;
      input.placeholder = '?';
      box.append(h('div.q-head', {}, num,
        h('span.word.inline', {}, q.stem, input),
        h(`span.g-hint.g-${q.g}`, { title: GENDER_PT[q.g] }, q.g === 'm' ? 'masc.' : 'fem.'), verify));
    } else if (q.kind === 'fill') {
      input.classList.add('mini');
      input.maxLength = 20;
      input.placeholder = '?';
      box.append(h('div.q-head', {}, num, h('span.ctx.inline', {}, q.before, input, q.after), verify));
    }
  }
  box.append(fbSlot);
  if (prev) finish(prev.given, true);
  return box;
}

export { speak };
