/* Pantiera 32: o cabeçalho da secção. O «32» em contorno sobe da linha de água e o título sobe de dentro da sua linha
   quando entram no ecrã (só transform). 16/11: o carrossel de fotos e a cena presa ao scroll saíram desta secção. */
(() => {
  const { $, $$, reduz } = DA;
  const els = [$('[data-d60-marca]'), ...$$('[data-d60-sobe]')].filter(Boolean);
  if (reduz || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('dentro')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('dentro'); io.unobserve(e.target); } }), { threshold: 0 });
  els.forEach((el) => io.observe(el));
})();
