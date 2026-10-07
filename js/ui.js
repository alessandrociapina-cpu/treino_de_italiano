// Utilitários de interface: criação de elementos, animações, voz e confete.

/** Cria um elemento: h('div.card#id', {onclick, html, ...attrs}, ...filhos) */
export function h(tag, props = {}, ...children) {
  const [, name = 'div', rest = ''] = tag.match(/^([a-z0-9]*)(.*)$/i);
  const node = document.createElement(name || 'div');
  for (const part of rest.match(/[.#][^.#]+/g) || []) {
    if (part[0] === '.') node.classList.add(part.slice(1));
    else node.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const wait = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Controle de animações de uma tela. `skip()` termina tudo imediatamente;
 * `cancel()` interrompe ao sair da tela.
 */
export function animator() {
  const a = { skipped: reducedMotion(), cancelled: false };
  a.skip = () => { a.skipped = true; };
  a.cancel = () => { a.cancelled = true; a.skipped = true; };
  a.pause = async (ms) => { if (!a.skipped) await wait(ms); };
  return a;
}

/**
 * Prepara o texto (HTML simples permitido) para ser "escrito a giz": o conteúdo final já é
 * colocado no lugar, com cada letra invisível — assim o espaço fica reservado e a lousa
 * não cresce enquanto escreve. Retorna a função que faz a animação.
 */
export function chalkText(node, html) {
  node.innerHTML = html;
  const chars = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  for (const t of texts) {
    const frag = document.createDocumentFragment();
    for (const ch of t.data) {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      frag.append(span);
      chars.push(span);
    }
    t.replaceWith(frag);
  }
  return async function play(anim, speed = 26) {
    let prev = null;
    for (const c of chars) {
      if (anim.skipped) break;
      prev?.classList.remove('cur');
      c.classList.add('on', 'cur');
      prev = c;
      const t = c.textContent;
      await wait(t === ' ' ? speed * 0.4 : /[.,:;]/.test(t) ? speed * 6 : speed);
    }
    node.innerHTML = html; // limpa os spans por letra
  };
}

/** Atalho: prepara e escreve imediatamente. */
export async function typewrite(node, html, anim, speed) {
  await chalkText(node, html)(anim, speed);
}

// ───── Voz (pronúncia em italiano) ─────
let itVoice = null;
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  itVoice = voices.find((v) => v.lang === 'it-IT' && /google|alice|federica|luca/i.test(v.name))
    || voices.find((v) => v.lang?.startsWith('it')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}
export const canSpeak = () => 'speechSynthesis' in window;
export function speak(text) {
  if (!canSpeak()) return;
  const clean = String(text).replace(/<[^>]+>/g, '').replace(/\((m|f|m\/f)\)/g, '');
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'it-IT';
  if (itVoice) u.voice = itVoice;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export function speakBtn(text, label = 'Ouvir pronúncia') {
  if (!canSpeak()) return null;
  return h('button.speak', { type: 'button', title: label, 'aria-label': label, onclick: (e) => { e.stopPropagation(); speak(text); } }, '🔊');
}

// ───── Confete tricolor ─────
export function confetti() {
  if (reducedMotion()) return;
  const canvas = h('canvas.confetti');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const W = (canvas.width = innerWidth);
  const H = (canvas.height = innerHeight);
  const colors = ['#009246', '#ffffff', '#ce2b37', '#f4c430', '#0b8a4b'];
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * W, y: -20 - Math.random() * H * 0.5,
    vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
    s: 5 + Math.random() * 7, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  const start = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += 0.03;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.strokeStyle = 'rgba(0,0,0,.08)';
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.strokeRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (t - start < 3500 && canvas.isConnected) requestAnimationFrame(frame);
    else canvas.remove();
  })(start);
}

/** Destaca a terminação que muda entre singular e plural (ex.: pranz<b>o</b> → pranz<b>i</b>). */
export function markEnding(word, other) {
  const a = word.replace(/\s*\((m|f|m\/f)\)\*?/, '');
  const b = (other || '').replace(/\s*\((m|f|m\/f)\)\*?/, '');
  const tail = word.slice(a.length);
  if (!b || a === b) return a + tail;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === 0) return a + tail;
  return `${a.slice(0, i)}<span class="end">${a.slice(i)}</span>${tail}`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
