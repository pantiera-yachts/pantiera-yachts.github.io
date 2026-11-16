/* f2-32: a secção «32» (2.ª volta, 16/11).
   1) Plano de cubierta em separadores: 6 botões (01 a 06, de proa a popa) e um só texto à vista. Sem JS, o CSS mostra
      os 6 textos (só html.js os esconde).
   2) O barco a rodar 360° no convite ao configurador: vídeo curto em loop, renderizado offline a partir do GLB oficial.
      Só toca quando está no ecrã; com «reducir movimiento» (sistema ou interruptor do rodapé) fica o poster. Sem o
      atributo autoplay, para o vídeo nunca arrancar antes de sabermos a preferência: o play() é pedido por script
      (vídeo mudo e inline, que o iOS deixa tocar) e, se o iOS o recusar (modo de poupança de energia), tenta-se outra
      vez no primeiro toque no ecrã. */
(() => {
  /* ---------- separadores ---------- */
  const plano = document.querySelector('[data-p32-plano]');
  if (plano) {
    const tabs = [...plano.querySelectorAll('[role="tab"]')];
    const escolhe = (t, foca) => {
      tabs.forEach((x) => {
        const sim = x === t;
        x.setAttribute('aria-selected', String(sim)); x.tabIndex = sim ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !sim;
      });
      if (foca) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => escolhe(t));
      t.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); escolhe(tabs[(i + k + tabs.length) % tabs.length], true); }
        else if (e.key === 'Home') { e.preventDefault(); escolhe(tabs[0], true); }
        else if (e.key === 'End') { e.preventDefault(); escolhe(tabs[tabs.length - 1], true); }
      });
    });
  }

  /* ---------- o barco a rodar ---------- */
  const v = document.querySelector('[data-p32-gira]'); if (!v) return;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const parado = () => mq.matches || document.documentElement.classList.contains('sem-mov');
  let visivel = false;
  const toca = () => {
    if (!visivel || parado() || document.hidden) { v.pause(); return; }
    v.muted = true;
    const p = v.play(); if (p) p.catch(() => {});
  };
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visivel = e.isIntersecting; toca(); }, { threshold: 0 }).observe(v);
  document.addEventListener('visibilitychange', toca);
  if (mq.addEventListener) mq.addEventListener('change', toca);
  // iOS em poupança de energia só deixa tocar dentro de um toque
  addEventListener('touchend', () => { if (visivel && v.paused) toca(); }, { passive: true });
})();
