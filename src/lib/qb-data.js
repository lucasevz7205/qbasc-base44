export const QB_METRICS = {
  totals(subjects) {
    let c = 0, w = 0, b = 0, studied = 0, total = 0;
    subjects.forEach(s => s.topics.forEach(t => { c += t.correct; w += t.wrong; b += t.blank || 0; total++; if (t.status !== 'not-started') studied++; }));
    return { correct: c, wrong: w, blank: b, valid: c + w, answered: c + w + b, accuracy: c + w ? (c / (c + w)) * 100 : null, studied, total, coverage: total ? (studied / total) * 100 : null };
  },
  pct: v => v == null ? '—' : Math.round(v) + '%',
  dayStats: d => ({ ...d, valid: d.correct + d.wrong, accuracy: d.correct + d.wrong ? (d.correct / (d.correct + d.wrong)) * 100 : null, net: d.correct - d.wrong }),
  fmtDate: iso => iso.slice(8, 10) + '/' + iso.slice(5, 7),
};
