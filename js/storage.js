// Persistência local (localStorage): nome do aluno, histórico de estudos e sessões em andamento.
const KEY = 'parliamo.v1';

const empty = () => ({ name: '', attempts: [], sessions: {} });

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    cache = empty();
  }
  return cache;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* armazenamento indisponível (modo privado): o app segue funcionando só na memória */
  }
}

export const store = {
  get name() { return load().name; },
  set name(v) { load().name = v; save(); },

  /** Registra um estudo concluído. kind: 'lesson' | 'practice'. */
  addAttempt({ moduleId, part, kind, level, correct, total, mistakes }) {
    const a = { id: Date.now(), date: new Date().toISOString(), moduleId, part: part || null, kind, level: level || null, correct, total, mistakes: mistakes || [] };
    load().attempts.push(a);
    save();
    return a;
  },

  attempts(filter = {}) {
    return load().attempts.filter((a) =>
      (filter.moduleId == null || a.moduleId === filter.moduleId) &&
      (filter.kind == null || a.kind === filter.kind) &&
      (filter.level == null || a.level === filter.level) &&
      // `part` undefined = não filtra; null = estudos de capítulos sem partes.
      (filter.part === undefined || (a.part ?? null) === filter.part));
  },

  best(filter) {
    const list = this.attempts(filter);
    return list.length ? Math.max(...list.map(pct)) : null;
  },

  last(filter) {
    const list = this.attempts(filter);
    return list.length ? list[list.length - 1] : null;
  },

  session(key) { return load().sessions[key] || null; },
  setSession(key, value) { load().sessions[key] = value; save(); },
  clearSession(key) { delete load().sessions[key]; save(); },

  reset() { cache = { ...empty(), name: load().name }; save(); },
};

// Só uma prova sem nenhum erro mostra 100% (247/248 não pode virar "100%").
export const pct = (a) => {
  if (!a.total) return 0;
  if (a.correct >= a.total) return 100;
  return Math.min(99, Math.round((a.correct / a.total) * 100));
};
