import { h, animator, chalkText, speak, speakBtn, confetti, markEnding, formatDate, wait, reducedMotion } from './ui.js';
import { renderQuestion, answerText, joinArt } from './quiz.js';
import { store, pct } from './storage.js';
import { modules, curriculum } from './data/curriculum.js';

const app = document.getElementById('app');
let currentAnim = null;
let installEvent = null;

// ─────────────────────────── Roteamento ───────────────────────────
const routes = [
  [/^#?\/?$/, () => viewIntro()],
  [/^#\/home$/, () => viewHome()],
  [/^#\/modulo\/(\d+)(?:\/([a-z]))?$/, (id, part) => viewLesson(+id, part)],
  [/^#\/reforco\/(\d+)\/(\d)$/, (id, lvl) => viewPractice(+id, +lvl)],
  [/^#\/resultado\/(\d+)$/, (id) => viewResult(+id)],
  [/^#\/historico$/, () => viewHistory()],
];

function router() {
  currentAnim?.cancel();
  currentAnim = null;
  window.speechSynthesis?.cancel();
  document.querySelectorAll('canvas.confetti').forEach((c) => c.remove());
  const hash = location.hash || '#/';
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      app.replaceChildren();
      app.className = '';
      fn(...m.slice(1));
      window.scrollTo(0, 0);
      return;
    }
  }
  location.hash = '#/home';
}

const go = (hash) => { if (location.hash === hash) router(); else location.hash = hash; };

// ───────────────────────────── Intro ─────────────────────────────
function viewIntro() {
  app.className = 'intro-page';
  const name = store.name;
  const words = [
    ['Ciao!', 'Oi!'], ['Grazie', 'Obrigado(a)'], ['Buongiorno', 'Bom dia'], ['Prego', 'De nada'],
    ['Andiamo!', 'Vamos!'], ['Bellissimo', 'Lindíssimo'], ['Pizza', 'Pizza 😄'], ['Amore', 'Amor'],
    ['Arrivederci', 'Até logo'], ['Allora…', 'Então…'],
  ];
  const input = h('input#name', { type: 'text', placeholder: 'Seu nome', maxlength: 24, value: name || '', autocomplete: 'given-name', 'aria-label': 'Seu nome' });
  const start = () => {
    const v = input.value.trim();
    if (v) store.name = v;
    go('#/home');
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });

  const title = 'Parliamo Italiano!';
  app.append(
    h('div.flag-stripe'),
    h('div.floating', { 'aria-hidden': 'true' },
      ...words.map(([it, pt], i) => h('span.bubble', { style: { '--i': i, '--x': `${(i * 37) % 92 + 4}%`, '--d': `${14 + (i % 4) * 3}s` }, 'data-pt': pt }, it))),
    h('main.intro', {},
      flightSvg(),
      h('p.kicker', {}, 'Curso de italiano para brasileiros'),
      h('h1.intro-title', { 'aria-label': title },
        ...[...title].map((c, i) => h('span', { style: { '--i': i }, 'aria-hidden': 'true' }, c === ' ' ? ' ' : c))),
      h('p.intro-sub', { html: 'Gramática viva, passo a passo — da <b>lousa animada</b> aos <b>exercícios com correção na hora</b>. Baseado em <i>Grammatica in contesto</i>.' }),
      h('ul.features', {},
        h('li', {}, h('span', {}, '📖'), h('b', {}, 'Regras animadas'), h('small', {}, 'escritas na lousa, em italiano e português')),
        h('li', {}, h('span', {}, '✍️'), h('b', {}, 'Correção instantânea'), h('small', {}, 'com explicação de cada erro')),
        h('li', {}, h('span', {}, '🏆'), h('b', {}, 'Seu progresso'), h('small', {}, 'histórico, notas e reforço em 3 níveis'))),
      h('div.intro-cta', {},
        name
          ? h('p.welcome', { html: `Che bello rivederti, <b>${escape(name)}</b>! 👋` })
          : h('label.name-label', { for: 'name' }, 'Come ti chiami? ', h('small', {}, '(Como você se chama?)')),
        name ? null : input,
        h('button.btn.btn-primary.btn-lg', { type: 'button', onclick: start }, name ? 'Continuiamo! ' : 'Iniziamo! ', h('span', { 'aria-hidden': 'true' }, '→')),
        name ? h('button.link', { type: 'button', onclick: () => { store.name = ''; viewIntroReset(); } }, 'Não é você? Trocar nome') : null),
      h('p.intro-foot', {}, '🇧🇷 → 🇮🇹  Andiamo in Italia!')),
  );
}
function viewIntroReset() { app.replaceChildren(); viewIntro(); }

function flightSvg() {
  const wrap = h('div.flight', { 'aria-hidden': 'true' });
  wrap.innerHTML = `
    <svg viewBox="0 0 320 110" role="presentation">
      <path id="route" d="M30 85 C 110 -10, 210 -10, 290 70" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 7" stroke-linecap="round" opacity=".45"/>
      <g class="pin br" transform="translate(30 85)"><circle r="16" fill="#009c3b"/><path d="M-11 0 L0 -8 L11 0 L0 8Z" fill="#ffdf00"/><circle r="4.2" fill="#002776"/></g>
      <g class="pin it" transform="translate(290 70)"><clipPath id="itc"><circle r="16"/></clipPath><g clip-path="url(#itc)"><rect x="-16" y="-16" width="11" height="32" fill="#009246"/><rect x="-5" y="-16" width="10" height="32" fill="#fff"/><rect x="5" y="-16" width="11" height="32" fill="#ce2b37"/></g><circle r="16" fill="none" stroke="rgba(0,0,0,.12)"/></g>
      <g class="plane"><text font-size="22" text-anchor="middle" dominant-baseline="central" transform="rotate(45)">✈</text>
        <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".45 0 .55 1"><mpath href="#route"/></animateMotion></g>
    </svg>`;
  return wrap;
}

// ───────────────────────────── Home ─────────────────────────────
function viewHome() {
  app.className = 'home-page';
  const all = store.attempts();
  const avg = all.length ? Math.round(all.reduce((s, a) => s + pct(a), 0) / all.length) : null;
  const best = all.length ? Math.max(...all.map(pct)) : null;

  app.append(
    topbar(),
    h('main.container', {},
      h('section.hello', {},
        h('div', {},
          h('h1', {}, `Ciao${store.name ? ', ' + store.name : ''}! `, h('span.wave', {}, '👋')),
          h('p', {}, 'Pronto(a) para mais uma aula? Escolha um capítulo e buon studio!')),
        h('div.stats', {},
          stat('📚', all.length, all.length === 1 ? 'estudo feito' : 'estudos feitos'),
          stat('🎯', avg == null ? '—' : `${avg}%`, 'média de acerto'),
          stat('⭐', best == null ? '—' : `${best}%`, 'melhor nota'))),
      h('h2.section-title', {}, 'Moduli disponibili ', h('small', {}, 'módulos disponíveis')),
      ...Object.values(modules).map(moduleCard),
      h('h2.section-title', {}, 'Prossimamente ', h('small', {}, 'em breve')),
      h('div.locked-grid', {},
        ...curriculum.filter((c) => !modules[c.id]).map((c) =>
          h('div.locked-card', { title: 'Em breve' },
            h('span.lc-emoji', {}, c.emoji), h('span.lc-num', {}, `Cap. ${c.id}`), h('b', {}, c.title),
            h('small', {}, c.subtitle || ' '), h('span.lock', { 'aria-label': 'bloqueado' }, '🔒')))),
      h('p.credits', {}, 'Conteúdo baseado em "Grammatica in contesto" (Loescher Editore) — uso pessoal de estudo.'),
    ),
  );
}

function topbar(extra) {
  const installBtn = installEvent
    ? h('button.btn.btn-ghost.sm', { type: 'button', onclick: async () => { installEvent.prompt(); await installEvent.userChoice; installEvent = null; installBtn.remove(); } }, '⬇ Instalar app')
    : null;
  return h('header.topbar', {},
    h('a.brand', { href: '#/' }, h('span.brand-flag', { 'aria-hidden': 'true' }), 'Parliamo!'),
    h('nav', {}, extra || null, installBtn,
      h('a.btn.btn-ghost.sm', { href: '#/home' }, '🏠 Início'),
      h('a.btn.btn-ghost.sm', { href: '#/historico' }, '📈 Histórico')));
}

const stat = (icon, value, label) => h('div.stat', {}, h('span.stat-icon', {}, icon), h('b', {}, String(value)), h('small', {}, label));

function ring(value, size = 64, stroke = 7) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value == null ? 0 : value;
  const wrap = h('div.ring', { style: { width: `${size}px`, height: `${size}px` } });
  wrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="${stroke}"/>
    <circle class="ring-val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${scoreColor(v)}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - v / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg><span class="ring-label">${value == null ? '—' : value + '%'}</span>`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = wrap.querySelector('.ring-val');
    el.style.strokeDashoffset = el.dataset.target;
  }));
  return wrap;
}

const scoreColor = (p) => (p >= 80 ? 'var(--ok)' : p >= 50 ? 'var(--warn)' : 'var(--ko)');

/** Chave da sessão em andamento. Capítulos sem partes mantêm a chave antiga. */
const sessionKey = (mod, part) => (mod.parts.length > 1 ? `lesson-${mod.id}-${part.id}` : `lesson-${mod.id}`);
/** Identificador da parte guardado no histórico (null quando o capítulo é inteiro). */
const partKey = (mod, part) => (mod.parts.length > 1 ? part.id : null);

function moduleCard(mod) {
  const best = store.best({ moduleId: mod.id, kind: 'lesson' });
  const multi = mod.parts.length > 1;

  return h('article.module-card', {},
    h('div.mc-head', {},
      h('div.mc-emoji', {}, mod.emoji),
      h('div.mc-title', {},
        h('span.mc-num', {}, `Capitolo ${mod.id}`),
        h('h3', {}, `${mod.title} — ${mod.subtitle}`),
        h('p', {}, `${mod.pt} · Área lexical: ${mod.area}`)),
      h('div.mc-score', {}, ring(best), h('small', {}, 'melhor nota'))),
    h('div.mc-meta', {},
      h('span', {}, `📖 ${mod.rules.length} regras`),
      h('span', {}, `✍️ ${mod.parts.reduce((n, p) => n + countLessonQuestions(p), 0)} exercícios`),
      multi ? h('span', {}, `🧩 ${mod.parts.length} partes`) : null),
    h('div.parts', {}, ...mod.parts.map((part) => partRow(mod, part, multi))),
    h('div.practice', {},
      h('h4', {}, '💪 Rinforzo ', h('small', {}, 'exercícios novos de todo o capítulo')),
      h('div.levels', {},
        ...Object.entries(mod.practice).map(([lvl, p]) => {
          const b = store.best({ moduleId: mod.id, kind: 'practice', level: +lvl });
          return h(`a.level.level-${lvl}`, { href: `#/reforco/${mod.id}/${lvl}` },
            h('span.lv-emoji', {}, p.emoji), h('b', {}, p.name), h('small', {}, p.label),
            h('span.lv-best', {}, b == null ? 'novo' : `${b}%`));
        }))));
}

function partRow(mod, part, multi) {
  const href = multi ? `#/modulo/${mod.id}/${part.id}` : `#/modulo/${mod.id}`;
  const key = sessionKey(mod, part);
  const session = store.session(key);
  const steps = lessonSteps(part);
  const resumeStep = session && session.step > 0 ? steps[session.step] : null;
  const filter = { moduleId: mod.id, kind: 'lesson', part: partKey(mod, part) };
  const best = store.best(filter);
  const last = store.last(filter);

  // Num capítulo de parte única, a linha não repete o título que já está no cabeçalho.
  return h(`div.part-row${multi ? '' : '.single'}`, {},
    h('div.pr-main', {},
      multi ? h('span.pr-num', {}, `Parte ${part.num}`) : null,
      multi ? h('b', {}, part.title) : null,
      multi ? h('small', {}, part.desc || part.pt) : null,
      h('span.pr-meta', {},
        `✍️ ${countLessonQuestions(part)} exercícios`,
        last ? ` · 🕑 último: ${pct(last)}% em ${formatDate(last.date)}` : ' · ✨ ainda não estudado')),
    h('div.pr-side', {},
      h('span.pr-best', { style: { '--c': best == null ? 'var(--line)' : scoreColor(best) } }, best == null ? 'novo' : `${best}%`),
      h('div.pr-actions', {},
        resumeStep
          ? h('a.btn.btn-primary.sm', { href }, `▶ Continuar (${stepLabel(resumeStep)})`)
          : h('a.btn.btn-primary.sm', { href }, last ? '↻ Refazer' : '▶ Começar'),
        resumeStep ? h('button.btn.btn-ghost.sm', { type: 'button', onclick: () => { store.clearSession(key); go(href); } }, '↻ Recomeçar') : null)));
}

// ───────────────────────────── Lição ─────────────────────────────
function lessonSteps(part) {
  return [
    { type: 'cover' },
    ...part.rules.map((rule) => ({ type: 'rule', rule, questions: rule.exercises })),
    ...part.book.map((ex) => ({ type: 'book', ex, questions: ex.questions })),
  ];
}
const stepLabel = (s) => (s.type === 'rule' ? `Regra ${s.rule.num}` : s.type === 'book' ? s.ex.title : 'Início');
const countLessonQuestions = (part) => lessonSteps(part).reduce((n, s) => n + (s.questions?.length || 0), 0);

function viewLesson(id, partId) {
  const mod = modules[id];
  const part = mod && (partId ? mod.parts.find((p) => p.id === partId) : mod.parts[0]);
  if (!part) return go('#/home');
  if (mod.parts.length > 1 && !partId) return go(`#/modulo/${id}/${mod.parts[0].id}`);
  app.className = 'lesson-page';
  const key = sessionKey(mod, part);
  const steps = lessonSteps(part);
  const total = countLessonQuestions(part);
  const state = store.session(key) || { step: 0, answers: {}, startedAt: Date.now() };
  // Todas as regras do capítulo: uma questão desta parte pode citar regra de outra.
  const ruleById = Object.fromEntries(mod.rules.map((r) => [r.id, r]));

  const persist = () => store.setSession(key, state);
  const correctCount = () => Object.values(state.answers).filter((a) => a.ok).length;
  const answeredCount = () => Object.keys(state.answers).length;

  const progressFill = h('div.progress-fill');
  const scoreChip = h('span.score-chip');
  const stepTitle = h('span.step-title');
  const body = h('div.lesson-body');
  const nav = h('div.lesson-nav');

  const updateHeader = () => {
    progressFill.style.width = `${(state.step / (steps.length - 1)) * 100}%`;
    scoreChip.innerHTML = `✓ <b>${correctCount()}</b> / ${answeredCount()} <small>de ${total}</small>`;
  };

  app.append(
    h('header.lesson-top', {},
      h('a.icon-btn', { href: '#/home', title: 'Voltar ao início', 'aria-label': 'Voltar ao início' }, '✕'),
      h('div.lt-center', {},
        h('div.lt-title', {},
          h('b', {}, `Cap. ${mod.id} · ${mod.title}`),
          mod.parts.length > 1 ? h('span.lt-part', {}, `Parte ${part.num}`) : null,
          stepTitle),
        h('div.progress', { role: 'progressbar' }, progressFill)),
      scoreChip),
    body, nav);

  function show(i) {
    currentAnim?.cancel();
    state.step = i;
    persist();
    updateHeader();
    const step = steps[i];
    stepTitle.textContent = `${stepLabel(step)} · ${i}/${steps.length - 1}`;
    body.replaceChildren();
    nav.replaceChildren();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Ao trocar de passo, o apagador limpa a lousa antes de mostrar a próxima regra.
    const goTo = async (target) => {
      nav.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      currentAnim?.skip();
      await eraseBoard(body);
      if (target === 'end') finishLesson(); else show(target);
    };
    const prevBtn = i > 0 ? h('button.btn.btn-ghost', { type: 'button', onclick: () => goTo(i - 1) }, '← Anterior') : h('span');
    const isLast = i === steps.length - 1;
    const nextBtn = h('button.btn.btn-primary', { type: 'button', onclick: () => goTo(isLast ? 'end' : i + 1) },
      isLast ? 'Ver meu resultado 🏁' : 'Próximo →');
    const hint = h('span.nav-hint');
    nav.append(prevBtn, hint, nextBtn);

    if (step.type === 'cover') {
      body.append(coverStep(mod, part, () => show(1)));
      return;
    }

    const qs = step.questions;
    const refreshNext = () => {
      const left = qs.filter((q) => !state.answers[q.id]).length;
      nextBtn.disabled = left > 0;
      hint.textContent = left > 0 ? `Responda ${left === 1 ? 'mais 1 exercício' : `mais ${left} exercícios`} para avançar` : '✓ Tudo respondido!';
    };
    refreshNext();

    const anim = (currentAnim = animator());
    const already = qs.every((q) => state.answers[q.id]);
    if (already) anim.skip();

    const board = step.type === 'rule' ? ruleBoard(step.rule, anim) : bookBoard(step.ex, anim, memoRules);
    const list = h('div.q-list', {},
      ...qs.map((q, n) => renderQuestion(q, {
        rule: ruleById[q.rule], number: n + 1, prev: state.answers[q.id],
        onAnswer: ({ given, ok }) => {
          state.answers[q.id] = { given, ok };
          persist();
          updateHeader();
          refreshNext();
          if (ok) pulse(scoreChip);
          focusNext(list);
        },
      })));
    const panel = h('section.panel.locked', {},
      h('div.panel-head', {},
        h('h3', {}, '✍️ Tocca a te! ', h('small', {}, 'Agora é sua vez')),
        h('p', {}, step.type === 'rule' ? step.rule.task : step.ex.pt)),
      list,
      h('div.panel-lock', {}, h('p', {}, '📝 Leia a lousa primeiro…'), h('button.btn.btn-ghost.sm', { type: 'button', onclick: () => anim.skip() }, 'Pular animação ⏩')));

    body.append(h('div.lesson-grid', {}, board.node, panel));
    fitBoard();

    board.done.then(() => {
      if (anim.cancelled) return;
      panel.classList.remove('locked');
      panel.classList.add('unlocked');
      if (!already && window.matchMedia('(max-width: 900px)').matches) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (!already) setTimeout(() => focusNext(list, true), 400);
    });
  }

  // Numa parte de revisão (sem regras próprias), o resumo traz as regras do capítulo inteiro.
  const memoRules = part.rules.length ? part.rules : mod.rules;

  // Mantém todas as lousas do módulo com a altura da maior (recalcula ao mudar a largura).
  let measuredWidth = 0;
  function fitBoard(force) {
    const board = body.querySelector('.lesson-grid > .board');
    if (!board) return;
    const w = Math.round(board.getBoundingClientRect().width);
    if (w && (w !== measuredWidth || force)) {
      measuredWidth = w;
      body.style.setProperty('--board-h', `${measureBoards(part, w, memoRules)}px`);
    }
    // Lousa mais alta que a tela não pode ficar "grudada" no topo: rola junto com a página.
    body.classList.toggle('tall-board', board.offsetHeight > innerHeight - 170);
  }
  let resizeTimer;
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => fitBoard(), 150); };
  window.addEventListener('resize', onResize);
  window.addEventListener('hashchange', () => window.removeEventListener('resize', onResize), { once: true });
  document.fonts?.ready.then(() => fitBoard(true));

  function finishLesson() {
    const all = steps.flatMap((s) => s.questions || []);
    const mistakes = all.filter((q) => state.answers[q.id] && !state.answers[q.id].ok)
      .map((q) => ({ qid: q.id, given: state.answers[q.id].given }));
    const attempt = store.addAttempt({ moduleId: id, part: partKey(mod, part), kind: 'lesson', correct: correctCount(), total: all.length, mistakes });
    store.clearSession(key);
    go(`#/resultado/${attempt.id}`);
  }

  show(Math.min(state.step, steps.length - 1));
}

function focusNext(list, first = false) {
  const next = list.querySelector('.q:not(.answered)');
  if (!next) return;
  const inp = next.querySelector('input');
  if (inp && !matchMedia('(pointer: coarse)').matches) inp.focus({ preventScroll: first });
  if (!first) next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function pulse(node) {
  node.classList.remove('pulse');
  void node.offsetWidth;
  node.classList.add('pulse');
}

function coverStep(mod, part, start) {
  const multi = mod.parts.length > 1;
  const sections = [];
  for (const r of part.rules) {
    let s = sections.find((x) => x.name === r.section);
    if (!s) sections.push((s = { name: r.section, rules: [] }));
    s.rules.push(r);
  }
  return h('div.cover', {},
    h('div.cover-card', {},
      h('div.cover-emoji', {}, mod.emoji),
      h('span.mc-num', {}, multi ? `Capitolo ${mod.id} · Parte ${part.num} di ${mod.parts.length}` : `Capitolo ${mod.id}`),
      h('h1', {}, mod.title, h('br'), h('span', {}, multi ? part.title : mod.subtitle)),
      h('p.cover-pt', {}, part.pt || mod.pt),
      h('p', { html: mod.intro || 'Veja cada regra na lousa e pratique logo em seguida.' }),
      h('div.cover-sections', {},
        ...sections.map((s) => h('div.cs', {}, h('b', {}, s.name), h('ol', { start: s.rules[0].num }, ...s.rules.map((r) => h('li', {}, r.title))))),
        part.book.length ? h('div.cs', {}, h('b', {}, 'Esercizi del libro'), h('ol', {}, ...part.book.map((b) => h('li', {}, `${b.title} — ${b.pt}`)))) : null),
      h('p.cover-source', {}, `📘 ${mod.source}`),
      h('button.btn.btn-primary.btn-lg', { type: 'button', onclick: start }, 'Cominciamo! →')));
}

/**
 * Lousa animada. Todo o conteúdo final é montado de uma vez (invisível) para que a lousa
 * já nasça com o tamanho certo; a animação só revela o que já está no lugar.
 * Retorna { node, done }.
 */
function chalkboard({ label, title, anim, build }) {
  const content = h('div.board-content');
  const skipBtn = h('button.skip', { type: 'button', onclick: () => anim.skip() }, 'Pular ⏩');
  const node = h('section.board', {},
    content,
    h('div.chalk-tray', { 'aria-hidden': 'true' }, h('span.chalk.c1'), h('span.chalk.c2'), h('span.eraser')));
  content.append(h('div.board-head', {}, h('span.board-label', {}, label), skipBtn), h('h2.chalk-title', { html: title }));
  const steps = build(content);
  const done = (async () => {
    await anim.pause(350);
    for (const run of steps) await run();
    skipBtn.classList.add('invisible');
  })();
  return { node, done };
}

/** Elemento que aparece depois (já ocupa seu espaço, só fica invisível). */
const later = (node) => { node.classList.add('pending'); return node; };
const reveal = (node) => { node.classList.remove('pending'); node.classList.add('appear'); };

function ruleBoard(rule, anim) {
  return chalkboard({
    label: `Regola ${rule.num} · ${rule.section}`, title: highlightEndings(rule.title), anim,
    build(content) {
      const steps = [];
      if (rule.intro) {
        const intro = h('p.chalk-intro');
        content.append(intro);
        const play = chalkText(intro, rule.intro);
        steps.push(async () => { await play(anim); await anim.pause(300); });
      }
      const itText = h('p.chalk-text');
      content.append(h('div.chalk-line', {}, itText, speakBtn(rule.it, 'Ouvir a regra')));
      const playIt = chalkText(itText, highlightEndings(rule.it));
      steps.push(async () => { await playIt(anim); await anim.pause(300); });

      const ptText = later(h('p.chalk-pt', { html: rule.pt }));
      content.append(ptText);
      steps.push(async () => { reveal(ptText); await anim.pause(700); });

      if (rule.table) {
        const genderTable = /maschil|femminil/i.test(rule.table.cols.join(' '));
        // A seta "→" só faz sentido quando a 2ª coluna é a transformação da 1ª.
        // Detecta as tabelas Singolare → Plurale; `arrow: false` desliga à mão.
        const numberTable = rule.table.arrow ?? (rule.table.cols.length === 2
          && /^singolare$/i.test(rule.table.cols[0].trim())
          && /^plurale$/i.test(rule.table.cols[1].trim()));
        const mark = rule.table.mark;
        const rows = rule.table.rows.map((row) => later(h('tr', {}, ...row.map((w, ci) => {
          const other = genderTable ? null : row[1 - ci];
          const html = mark === 'article' ? markArticle(w) : mark === 'none' ? w : markEnding(w, other);
          return h('td', {}, h('button.word-btn', { type: 'button', title: 'Ouvir', onclick: () => speak(w), html }));
        }))));
        const kind = genderTable ? '.gender' : numberTable ? '.number' : '.plain';
        // Numa tabela larga a 1ª coluna vira rótulo (di, a, da…); `keys: false`
        // desliga isso quando ela traz conteúdo como as demais.
        const wide = rule.table.wide ? (rule.table.keys === false ? '.wide.nokey' : '.wide') : '';
        // O invólucro rola na horizontal: numa tela estreita a tabela desliza
        // em vez de esticar a lousa (e a página junto).
        content.append(h('div.table-wrap', {}, h(`table.chalk-table${kind}${wide}`, {},
          h('thead', {}, h('tr', {}, ...rule.table.cols.map((c) => h('th', { class: /femmin/i.test(c) ? 'col-f' : /maschil/i.test(c) ? 'col-m' : '' }, c)))),
          h('tbody', {}, ...rows))));
        steps.push(async () => { for (const tr of rows) { reveal(tr); await anim.pause(260); } });
      }
      if (rule.examples) {
        const items = rule.examples.map((ex) => {
          const span = h('span');
          const li = later(h('li', {}, span, speakBtn(ex)));
          return { li, play: chalkText(span, ex) };
        });
        content.append(h('ul.chalk-examples', {}, ...items.map((x) => x.li)));
        steps.push(async () => {
          for (const { li, play } of items) {
            li.classList.remove('pending');
            await play(anim, 20);
            await anim.pause(150);
          }
        });
      }
      const tip = later(h('div.tip', {}, h('span.tip-flag', {}, '🇧🇷'), h('div', {}, h('b', {}, 'Dica para brasileiros'), h('p', { html: rule.tip }))));
      content.append(tip);
      steps.push(async () => { await anim.pause(300); reveal(tip); });
      return steps;
    },
  });
}

/** Destaca o artigo (primeira palavra, ou l'/un' colado) nas tabelas de artigos. */
function markArticle(cell) {
  const m = cell.match(/^((?:l'|un'|lo|il|la|gli|le|i|uno|una|un)\s?)(.*)$/i);
  return m ? `<span class="end">${m[1].trim()}</span>${m[1].endsWith(' ') ? ' ' : ''}${m[2]}` : cell;
}

/** Destaca as terminações (-o, -a, -zione…) no texto da regra. */
function highlightEndings(text) {
  return text.replace(/(^|\s)(-[a-zàèéìòù/]+)/gi, '$1<span class="end">$2</span>');
}

/**
 * Lousa dos exercícios do livro. Como eles misturam todas as regras, a lousa traz
 * um resumo (promemoria) para consulta — que também ocupa o espaço da lousa fixa.
 */
function bookBoard(ex, anim, rules = []) {
  return chalkboard({
    label: 'Esercizi · Verifica', title: ex.title, anim,
    build(content) {
      const itText = h('p.chalk-text');
      const ptText = later(h('p.chalk-pt', {}, ex.pt));
      const memo = later(h('div.memo', {},
        h('b.memo-title', {}, '📌 Promemoria — as regras do capítulo'),
        h('ol.memo-list', {}, ...rules.map((rl) => h('li', {},
          h('b', {}, rl.title), h('span', { html: rl.short }))))));
      const tip = later(h('div.tip', {}, h('span.tip-flag', {}, '📘'),
        h('div', {}, h('b', {}, 'Exercício do livro'), h('p', {}, 'Agora é hora de juntar todas as regras! Se errar, a correção mostra qual regra revisar.'))));
      content.append(h('div.chalk-line', {}, itText, speakBtn(ex.it)), ptText, tip, memo);
      const play = chalkText(itText, ex.it);
      return [
        async () => { await play(anim); reveal(ptText); await anim.pause(500); },
        async () => { reveal(tip); await anim.pause(300); reveal(memo); },
      ];
    },
  });
}

/**
 * Altura fixa da lousa: mede a lousa de todas as regras e exercícios da parte
 * (já com o conteúdo completo) na largura atual e usa a maior.
 */
function measureBoards(part, width, memoRules) {
  const probe = h('div.board-measure', { style: { width: `${width}px` } });
  document.body.append(probe);
  const quiet = animator();
  quiet.cancel();
  // O resumo das regras entra na medida com altura limitada (.board-measure .memo-list):
  // na lousa de verdade ele ocupa o espaço que sobrar e rola, sem esticar a lousa.
  const boards = [...part.rules.map((r) => ruleBoard(r, quiet)), ...part.book.map((b) => bookBoard(b, quiet, memoRules))];
  boards.forEach((b) => probe.append(b.node));
  const max = Math.max(...boards.map((b) => b.node.offsetHeight));
  probe.remove();
  return max;
}

/** Animação do apagador limpando a lousa antes de trocar de regra. */
async function eraseBoard(body) {
  const board = body.querySelector('.lesson-grid > .board');
  if (!board || reducedMotion()) return;
  const rect = board.getBoundingClientRect();
  if (rect.bottom < 80 || rect.top > innerHeight - 80) {
    board.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await wait(450);
  }
  window.speechSynthesis?.cancel();
  board.append(h('div.board-smudge', { 'aria-hidden': 'true' }), h('div.eraser-tool', { 'aria-hidden': 'true' }));
  board.classList.add('erasing');
  body.querySelector('.panel')?.classList.add('leaving');
  await wait(1150);
}

// ───────────────────────────── Reforço ─────────────────────────────
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function viewPractice(id, lvl) {
  const mod = modules[id];
  const level = mod?.practice[lvl];
  if (!level) return go('#/home');
  app.className = 'practice-page';
  const ruleById = Object.fromEntries(mod.rules.map((r) => [r.id, r]));
  const questions = shuffle(level.pool).slice(0, 10);
  const answers = [];
  let i = 0;

  const progressFill = h('div.progress-fill');
  const scoreChip = h('span.score-chip');
  const stage = h('main.practice-stage');

  app.append(
    h('header.lesson-top', {},
      h('a.icon-btn', { href: '#/home', title: 'Voltar', 'aria-label': 'Voltar' }, '✕'),
      h('div.lt-center', {},
        h('div.lt-title', {}, h('b', {}, `Rinforzo · ${level.emoji} ${level.name}`), h('span.step-title', {}, `Cap. ${mod.id} · ${mod.title}`)),
        h('div.progress', { role: 'progressbar' }, progressFill)),
      scoreChip),
    stage);

  const update = () => {
    progressFill.style.width = `${(answers.length / questions.length) * 100}%`;
    scoreChip.innerHTML = `✓ <b>${answers.filter((a) => a.ok).length}</b> / ${questions.length}`;
  };

  function showQ() {
    update();
    const q = questions[i];
    const next = h('button.btn.btn-primary.hidden', { type: 'button', onclick: () => { i++; if (i < questions.length) showQ(); else finish(); } },
      i === questions.length - 1 ? 'Ver resultado 🏁' : 'Próxima →');
    const card = h('div.practice-card', {},
      h('div.pc-top', {}, h('span.pc-count', {}, `Domanda ${i + 1} di ${questions.length}`), h('span.pc-kind', {}, kindLabel(q))),
      renderQuestion(q, {
        rule: ruleById[q.rule], big: true,
        onAnswer: ({ given, ok }) => {
          answers.push({ qid: q.id, given, ok });
          update();
          if (ok) pulse(scoreChip);
          next.classList.remove('hidden');
          next.focus();
        },
      }),
      h('div.pc-actions', {}, next));
    stage.replaceChildren(card);
    const inp = card.querySelector('input');
    if (inp && !matchMedia('(pointer: coarse)').matches) setTimeout(() => inp.focus(), 50);
  }

  function finish() {
    const attempt = store.addAttempt({
      moduleId: id, kind: 'practice', level: lvl,
      correct: answers.filter((a) => a.ok).length, total: questions.length,
      mistakes: answers.filter((a) => !a.ok).map(({ qid, given }) => ({ qid, given })),
    });
    go(`#/resultado/${attempt.id}`);
  }

  showQ();
}

const kindLabel = (q) => ({
  gender: 'Maschile o femminile?', plural: 'Scrivi il plurale', singular: 'Scrivi il singolare',
  ending: 'Completa la parola', fill: 'Completa la frase', mc: 'Scegli la risposta',
  article: 'Scegli l\u2019articolo', artplural: 'Articolo + plurale',
  adj: 'Metti l\u2019aggettivo nella forma giusta', phrase: 'Articolo + nome + aggettivo',
  verb: 'Completa la frase', transform: 'Riscrivi la frase',
}[q.kind]);

// ───────────────────────────── Resultado ─────────────────────────────
function questionIndex(mod) {
  const map = new Map();
  const ruleById = Object.fromEntries(mod.rules.map((r) => [r.id, r]));
  const add = (q) => map.set(q.id, { q, rule: ruleById[q.rule] });
  mod.rules.forEach((r) => r.exercises.forEach(add));
  mod.book.forEach((b) => b.questions.forEach(add));
  Object.values(mod.practice).forEach((p) => p.pool.forEach(add));
  return map;
}

function viewResult(attemptId) {
  const attempt = store.attempts().find((a) => a.id === attemptId);
  const mod = attempt && modules[attempt.moduleId];
  if (!mod) return go('#/home');
  app.className = 'result-page';
  const p = pct(attempt);
  const index = questionIndex(mod);
  const part = attempt.part ? mod.parts.find((x) => x.id === attempt.part) : mod.parts[0];
  const filter = { moduleId: mod.id, kind: attempt.kind, level: attempt.level ?? undefined, part: attempt.kind === 'lesson' ? (attempt.part || null) : undefined };
  const previous = store.attempts(filter).filter((a) => a.id < attempt.id);
  const prevBest = previous.length ? Math.max(...previous.map(pct)) : null;
  const isLatest = store.last(filter)?.id === attempt.id;

  const [title, msg] =
    p >= 90 ? ['Eccellente! 🌟', 'Você domina o assunto. Complimenti!']
      : p >= 70 ? ['Molto bene! 👏', 'Muito bom! Revise os erros abaixo para chegar à perfeição.']
        : p >= 50 ? ['Bene, ma si può migliorare 💪', 'Bom começo! Veja as explicações e tente de novo.']
          : ['Coraggio! 🍀', 'Não desanime: revise as regras e refaça — você vai melhorar.'];
  const stars = p >= 90 ? 3 : p >= 70 ? 2 : p >= 50 ? 1 : 0;
  const what = attempt.kind !== 'lesson' ? `Reforço · ${mod.practice[attempt.level].name}`
    : attempt.part ? `Parte ${part?.num ?? ''} · ${part?.title ?? ''}` : 'Módulo completo';
  const again = attempt.kind !== 'lesson' ? `#/reforco/${mod.id}/${attempt.level}`
    : attempt.part ? `#/modulo/${mod.id}/${attempt.part}` : `#/modulo/${mod.id}`;

  // Desempenho por regra (só na lição completa)
  let breakdown = null;
  if (attempt.kind === 'lesson') {
    const wrongRules = new Map();
    attempt.mistakes.forEach((m) => {
      const r = index.get(m.qid)?.rule;
      if (r) wrongRules.set(r.id, (wrongRules.get(r.id) || 0) + 1);
    });
    breakdown = h('section.card', {},
      h('h3', {}, 'Desempenho por regra'),
      h('div.rule-chips', {}, ...(part?.rules || mod.rules).map((r) => {
        const n = wrongRules.get(r.id) || 0;
        return h(`span.rule-chip${n === 0 ? '.good' : n === 1 ? '.mid' : '.bad'}`, { title: r.title },
          h('b', {}, r.num), ` ${r.title}`, n ? h('small', {}, ` · ${n} erro${n > 1 ? 's' : ''}`) : ' ✓');
      })));
  }

  const mistakes = attempt.mistakes.map((m) => ({ ...m, ...index.get(m.qid) })).filter((m) => m.q);

  app.append(
    topbar(),
    h('main.container.narrow', {},
      h('section.result-hero', {},
        h('span.mc-num', {}, `Cap. ${mod.id} · ${mod.title} — ${what}`),
        ring(p, 150, 13),
        h('div.stars', { 'aria-label': `${stars} de 3 estrelas` }, ...[1, 2, 3].map((n) => h(`span${n <= stars ? '.on' : ''}`, { style: { '--i': n } }, '★'))),
        h('h1', {}, title),
        h('p', {}, msg),
        h('div.result-stats', {},
          stat('✅', attempt.correct, 'acertos'),
          stat('❌', attempt.total - attempt.correct, 'erros'),
          stat('🗓️', new Date(attempt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), 'data')),
        prevBest == null ? h('p.badge-note', {}, '🎉 Primeiro registro deste estudo!')
          : p > prevBest ? h('p.badge-note.up', {}, `🚀 Novo recorde! Antes: ${prevBest}%`)
            : h('p.badge-note', {}, `Seu recorde: ${prevBest}%`),
        h('div.result-actions', {},
          h('a.btn.btn-primary', { href: again, onclick: () => attempt.kind === 'lesson' && part && store.clearSession(sessionKey(mod, part)) }, '↻ Refazer para melhorar'),
          h('a.btn.btn-ghost', { href: '#/home' }, '🏠 Início'))),
      breakdown,
      h('section.card', {},
        h('h3', {}, mistakes.length ? `Revise seus erros (${mistakes.length})` : 'Nenhum erro! Perfetto! 🇮🇹'),
        mistakes.length ? h('ul.mistakes', {}, ...mistakes.map(mistakeItem)) : null),
      h('section.card', {},
        h('h3', {}, '💪 Continue treinando: Rinforzo'),
        h('div.levels', {},
          ...Object.entries(mod.practice).map(([lvl, pr]) => h(`a.level.level-${lvl}`, { href: `#/reforco/${mod.id}/${lvl}` },
            h('span.lv-emoji', {}, pr.emoji), h('b', {}, pr.name), h('small', {}, pr.desc))))),
    ));

  if (isLatest && p >= 70) wait(500).then(confetti);
}

function mistakeItem({ q, rule, given }) {
  const label = q.kind === 'gender' ? (q.ctx || q.w)
    : q.kind === 'plural' ? `${q.w} → plurale`
      : q.kind === 'singular' ? `${q.w} → singolare`
        : q.kind === 'artplural' ? `${q.w} → articolo + plurale`
          : q.kind === 'verb' ? q.ctx + (q.hint ? ` (${q.hint})` : '')
            : q.kind === 'transform' ? `${q.from} → ${q.how || ''}`
              : q.kind === 'adj' ? `${q.ctx.replace('___', '___')} (${q.base})`
            : q.kind === 'phrase' ? `${q.w} (${q.base})`
          : q.kind === 'article' ? (q.ctx ? q.ctx.replace('___', '___') : q.w)
            : q.kind === 'ending' ? `${q.stem}_`
              : q.kind === 'fill' ? `${q.before}_${q.after}`
                : q.q.replace(/<[^>]+>/g, '');
  const givenTxt = q.kind === 'gender' ? ({ m: 'maschile', f: 'femminile' }[given] || given)
    : q.kind === 'article' && !q.ctx ? joinArt(given, q.w)
    : q.kind === 'ending' && given.length <= 3 ? q.stem + given
      : q.kind === 'fill' && given.length <= 3 ? (q.before.match(/(\S+)$/) || ['', ''])[1] + given
        : given;
  return h('li', {},
    h('div.mi-q', {}, h('b', {}, label), rule ? h('span.rule-tag', {}, `Regra ${rule.num}`) : null),
    h('div.mi-a', { html: `<s>${escape(givenTxt)}</s> → <b>${answerText(q)}</b>` }),
    h('p.mi-why', { html: q.why || rule?.short || '' }));
}

// ───────────────────────────── Histórico ─────────────────────────────
function viewHistory() {
  app.className = 'history-page';
  const list = store.attempts().slice().reverse();
  app.append(
    topbar(),
    h('main.container.narrow', {},
      h('h1.page-title', {}, '📈 Il tuo percorso ', h('small', {}, 'seu histórico de estudos')),
      list.length
        ? h('ul.history', {}, ...list.map((a) => {
          const mod = modules[a.moduleId];
          const p = pct(a);
          const ap = a.part ? mod?.parts.find((x) => x.id === a.part) : null;
          const what = a.kind !== 'lesson' ? `Reforço ${mod?.practice[a.level]?.emoji || ''} ${mod?.practice[a.level]?.name || ''}`
            : ap ? `Parte ${ap.num} · ${ap.title}` : 'Módulo completo';
          return h('li', {},
            h('a', { href: `#/resultado/${a.id}` },
              h('span.h-emoji', {}, mod?.emoji || '📘'),
              h('div.h-main', {}, h('b', {}, `Cap. ${a.moduleId} · ${mod?.title || ''} — ${what}`), h('small', {}, `${formatDate(a.date)} · ${a.correct}/${a.total} acertos`)),
              h('span.h-score', { style: { '--c': scoreColor(p) } }, `${p}%`)));
        }))
        : h('div.empty', {}, h('p', {}, 'Você ainda não concluiu nenhum estudo.'), h('a.btn.btn-primary', { href: '#/home' }, 'Começar agora')),
      list.length ? h('button.link.danger', {
        type: 'button',
        onclick: () => { if (confirm('Apagar todo o histórico de estudos? Esta ação não pode ser desfeita.')) { store.reset(); router(); } },
      }, 'Apagar histórico') : null));
}

const escape = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ───────────────────────────── Boot ─────────────────────────────
window.addEventListener('hashchange', router);
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
router();
