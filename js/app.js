import { h, animator, typewrite, speak, speakBtn, confetti, markEnding, formatDate, wait } from './ui.js';
import { renderQuestion, answerText } from './quiz.js';
import { store, pct } from './storage.js';
import { modules, curriculum } from './data/curriculum.js';

const app = document.getElementById('app');
let currentAnim = null;
let installEvent = null;

// ─────────────────────────── Roteamento ───────────────────────────
const routes = [
  [/^#?\/?$/, () => viewIntro()],
  [/^#\/home$/, () => viewHome()],
  [/^#\/modulo\/(\d+)$/, (id) => viewLesson(+id)],
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

function moduleCard(mod) {
  const session = store.session(`lesson-${mod.id}`);
  const best = store.best({ moduleId: mod.id, kind: 'lesson' });
  const last = store.last({ moduleId: mod.id, kind: 'lesson' });
  const steps = lessonSteps(mod);
  const resumeStep = session && session.step > 0 ? steps[session.step] : null;

  const mainBtn = resumeStep
    ? h('a.btn.btn-primary', { href: `#/modulo/${mod.id}` }, `▶ Continuar (${stepLabel(resumeStep)})`)
    : h('a.btn.btn-primary', { href: `#/modulo/${mod.id}` }, last ? '↻ Refazer o módulo' : '▶ Começar o módulo');

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
      h('span', {}, `✍️ ${countLessonQuestions(mod)} exercícios`),
      last ? h('span', {}, `🕑 último: ${pct(last)}% em ${formatDate(last.date)}`) : h('span', {}, '✨ ainda não estudado')),
    h('div.mc-actions', {},
      mainBtn,
      resumeStep ? h('button.btn.btn-ghost', { type: 'button', onclick: () => { store.clearSession(`lesson-${mod.id}`); go(`#/modulo/${mod.id}`); } }, '↻ Recomeçar') : null),
    h('div.practice', {},
      h('h4', {}, '💪 Rinforzo ', h('small', {}, 'exercícios novos para reforçar')),
      h('div.levels', {},
        ...Object.entries(mod.practice).map(([lvl, p]) => {
          const b = store.best({ moduleId: mod.id, kind: 'practice', level: +lvl });
          return h(`a.level.level-${lvl}`, { href: `#/reforco/${mod.id}/${lvl}` },
            h('span.lv-emoji', {}, p.emoji), h('b', {}, p.name), h('small', {}, p.label),
            h('span.lv-best', {}, b == null ? 'novo' : `${b}%`));
        }))));
}

// ───────────────────────────── Lição ─────────────────────────────
function lessonSteps(mod) {
  return [
    { type: 'cover' },
    ...mod.rules.map((rule) => ({ type: 'rule', rule, questions: rule.exercises })),
    ...mod.book.map((ex) => ({ type: 'book', ex, questions: ex.questions })),
  ];
}
const stepLabel = (s) => (s.type === 'rule' ? `Regra ${s.rule.num}` : s.type === 'book' ? s.ex.title : 'Início');
const countLessonQuestions = (mod) => lessonSteps(mod).reduce((n, s) => n + (s.questions?.length || 0), 0);

function viewLesson(id) {
  const mod = modules[id];
  if (!mod) return go('#/home');
  app.className = 'lesson-page';
  const key = `lesson-${id}`;
  const steps = lessonSteps(mod);
  const total = countLessonQuestions(mod);
  const state = store.session(key) || { step: 0, answers: {}, startedAt: Date.now() };
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
        h('div.lt-title', {}, h('b', {}, `Cap. ${mod.id} · ${mod.title}`), stepTitle),
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

    const prevBtn = i > 0 ? h('button.btn.btn-ghost', { type: 'button', onclick: () => show(i - 1) }, '← Anterior') : h('span');
    const isLast = i === steps.length - 1;
    const nextBtn = h('button.btn.btn-primary', { type: 'button', onclick: () => (isLast ? finishLesson() : show(i + 1)) },
      isLast ? 'Ver meu resultado 🏁' : 'Próximo →');
    const hint = h('span.nav-hint');
    nav.append(prevBtn, hint, nextBtn);

    if (step.type === 'cover') {
      body.append(coverStep(mod, () => show(1)));
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

    const board = step.type === 'rule' ? ruleBoard(step.rule, anim) : bookBoard(step.ex, anim);
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

  function finishLesson() {
    const all = steps.flatMap((s) => s.questions || []);
    const mistakes = all.filter((q) => state.answers[q.id] && !state.answers[q.id].ok)
      .map((q) => ({ qid: q.id, given: state.answers[q.id].given }));
    const attempt = store.addAttempt({ moduleId: id, kind: 'lesson', correct: correctCount(), total: all.length, mistakes });
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

function coverStep(mod, start) {
  const sections = [];
  for (const r of mod.rules) {
    let s = sections.find((x) => x.name === r.section);
    if (!s) sections.push((s = { name: r.section, rules: [] }));
    s.rules.push(r);
  }
  return h('div.cover', {},
    h('div.cover-card', {},
      h('div.cover-emoji', {}, mod.emoji),
      h('span.mc-num', {}, `Capitolo ${mod.id}`),
      h('h1', {}, mod.title, h('br'), h('span', {}, mod.subtitle)),
      h('p.cover-pt', {}, mod.pt),
      h('p', { html: 'Em italiano os substantivos (<i>nomi</i>) têm <b>gênero</b> — maschile ou femminile — e <b>número</b> — singolare ou plurale. Vamos ver cada regra na lousa e praticar logo em seguida.' }),
      h('div.cover-sections', {},
        ...sections.map((s) => h('div.cs', {}, h('b', {}, s.name), h('ol', { start: s.rules[0].num }, ...s.rules.map((r) => h('li', {}, r.title))))),
        h('div.cs', {}, h('b', {}, 'Esercizi del libro'), h('ol', {}, ...mod.book.map((b) => h('li', {}, `${b.title} — ${b.pt}`))))),
      h('p.cover-source', {}, `📘 ${mod.source}`),
      h('button.btn.btn-primary.btn-lg', { type: 'button', onclick: start }, 'Cominciamo! →')));
}

/** Lousa animada de uma regra. Retorna { node, done }. */
function ruleBoard(rule, anim) {
  const intro = rule.intro ? h('p.chalk-intro') : null;
  const itText = h('p.chalk-text');
  const ptText = h('p.chalk-pt.hidden');
  const extra = h('div.chalk-extra');
  const tip = h('div.tip.hidden', {}, h('span.tip-flag', {}, '🇧🇷'), h('div', {}, h('b', {}, 'Dica para brasileiros'), h('p', { html: rule.tip })));
  const skipBtn = h('button.skip', { type: 'button', onclick: () => anim.skip() }, 'Pular ⏩');

  const node = h('section.board', {},
    h('div.board-head', {}, h('span.board-label', {}, `Regola ${rule.num} · ${rule.section}`), skipBtn),
    h('h2.chalk-title', { html: highlightEndings(rule.title) }),
    intro, h('div.chalk-line', {}, itText, speakBtn(rule.it, 'Ouvir a regra')),
    ptText, extra, tip,
    h('div.chalk-tray', { 'aria-hidden': 'true' }, h('span.chalk.c1'), h('span.chalk.c2'), h('span.eraser')));

  const done = (async () => {
    await anim.pause(350);
    if (intro) { await typewrite(intro, rule.intro, anim); await anim.pause(300); }
    await typewrite(itText, highlightEndings(rule.it), anim);
    await anim.pause(300);
    ptText.classList.remove('hidden');
    ptText.innerHTML = rule.pt;
    await anim.pause(700);

    if (rule.table) {
      const genderTable = /maschil|femminil/i.test(rule.table.cols.join(' '));
      const tbody = h('tbody');
      const table = h(`table.chalk-table${genderTable ? '.gender' : '.number'}`, {},
        h('thead', {}, h('tr', {}, ...rule.table.cols.map((c) => h('th', { class: /femmin/i.test(c) ? 'col-f' : /maschil/i.test(c) ? 'col-m' : '' }, c)))), tbody);
      extra.append(table);
      for (const row of rule.table.rows) {
        const tr = h('tr.appear', {}, ...row.map((w, ci) => {
          const other = genderTable ? null : row[1 - ci];
          return h('td', {}, h('button.word-btn', { type: 'button', title: 'Ouvir', onclick: () => speak(w), html: markEnding(w, other) }));
        }));
        tbody.append(tr);
        await anim.pause(260);
      }
    }
    if (rule.examples) {
      const ul = h('ul.chalk-examples');
      extra.append(ul);
      for (const ex of rule.examples) {
        const li = h('li', {}, h('span'), speakBtn(ex));
        ul.append(li);
        await typewrite(li.firstChild, ex, anim, 20);
        await anim.pause(150);
      }
    }
    await anim.pause(300);
    tip.classList.remove('hidden');
    skipBtn.remove();
  })();
  return { node, done };
}

/** Destaca as terminações (-o, -a, -zione…) no texto da regra. */
function highlightEndings(text) {
  return text.replace(/(^|\s)(-[a-zàèéìòù/]+)/gi, '$1<span class="end">$2</span>');
}

function bookBoard(ex, anim) {
  const itText = h('p.chalk-text');
  const ptText = h('p.chalk-pt.hidden');
  const tip = h('div.tip.hidden', {}, h('span.tip-flag', {}, '📘'),
    h('div', {}, h('b', {}, 'Exercício do livro'), h('p', {}, 'Agora é hora de juntar todas as regras! Se errar, a correção mostra qual regra revisar.')));
  const node = h('section.board.board-book', {},
    h('div.board-head', {}, h('span.board-label', {}, 'Esercizi · Verifica'), h('button.skip', { type: 'button', onclick: () => anim.skip() }, 'Pular ⏩')),
    h('h2.chalk-title', {}, ex.title),
    h('div.chalk-line', {}, itText, speakBtn(ex.it)),
    ptText, tip,
    h('div.chalk-tray', { 'aria-hidden': 'true' }, h('span.chalk.c1'), h('span.chalk.c2'), h('span.eraser')));
  const done = (async () => {
    await anim.pause(300);
    await typewrite(itText, ex.it, anim);
    ptText.classList.remove('hidden');
    ptText.textContent = ex.pt;
    await anim.pause(500);
    tip.classList.remove('hidden');
    node.querySelector('.skip')?.remove();
  })();
  return { node, done };
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
  const filter = { moduleId: mod.id, kind: attempt.kind, level: attempt.level ?? undefined };
  const previous = store.attempts(filter).filter((a) => a.id < attempt.id);
  const prevBest = previous.length ? Math.max(...previous.map(pct)) : null;
  const isLatest = store.last(filter)?.id === attempt.id;

  const [title, msg] =
    p >= 90 ? ['Eccellente! 🌟', 'Você domina o assunto. Complimenti!']
      : p >= 70 ? ['Molto bene! 👏', 'Muito bom! Revise os erros abaixo para chegar à perfeição.']
        : p >= 50 ? ['Bene, ma si può migliorare 💪', 'Bom começo! Veja as explicações e tente de novo.']
          : ['Coraggio! 🍀', 'Não desanime: revise as regras e refaça — você vai melhorar.'];
  const stars = p >= 90 ? 3 : p >= 70 ? 2 : p >= 50 ? 1 : 0;
  const what = attempt.kind === 'lesson' ? 'Módulo completo' : `Reforço · ${mod.practice[attempt.level].name}`;
  const again = attempt.kind === 'lesson' ? `#/modulo/${mod.id}` : `#/reforco/${mod.id}/${attempt.level}`;

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
      h('div.rule-chips', {}, ...mod.rules.map((r) => {
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
          h('a.btn.btn-primary', { href: again, onclick: () => attempt.kind === 'lesson' && store.clearSession(`lesson-${mod.id}`) }, '↻ Refazer para melhorar'),
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
        : q.kind === 'ending' ? `${q.stem}_`
          : q.kind === 'fill' ? `${q.before}_${q.after}`
            : q.q.replace(/<[^>]+>/g, '');
  const givenTxt = q.kind === 'gender' ? ({ m: 'maschile', f: 'femminile' }[given] || given)
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
          const what = a.kind === 'lesson' ? 'Módulo completo' : `Reforço ${mod?.practice[a.level]?.emoji || ''} ${mod?.practice[a.level]?.name || ''}`;
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
