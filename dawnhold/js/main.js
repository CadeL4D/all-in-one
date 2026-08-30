'use strict';
/* ============================================================
   Dawnhold — main.js
   Boot + requestAnimationFrame loop. Fixed render cadence with
   speed-scaled simulation ticks.
   ============================================================ */

(function boot() {
  Art.init();
  Render.init();
  UI.init();
  Bench.initDom(); // the Daycraft bench overlay (canvas + pointer routing)

  // title screen vignette
  const tcv = document.getElementById('titleArt');
  Art.titlePaint(tcv, 'title');

  // expose for tinkering in the console (see README)
  window.G = G; window.Sim = Sim; window.DBG = DBG;

  let last = performance.now();
  let hudT = 0;

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    if (G.state === 'playing' && !G.paused) {
      // subdivide fast-forward so AI/collision stay stable at 3x
      const total = dt * G.speed;
      const steps = Math.max(1, Math.ceil(total / 0.05));
      for (let i = 0; i < steps && G.state === 'playing'; i++) Sim.tick(total / steps);
      // a bench session runs in real seconds while the world keeps simulating
      Bench.tick(dt);
    }

    if (G.state !== 'title') {
      Render.frame(dt);
      Bench.renderFrame();
    }

    hudT -= dt;
    if (hudT <= 0) { hudT = 0.2; UI.updateHUD(); }

    if (G.state === 'playing' && !UI.els.mmWrap.classList.contains('hidden')) Render.minimap(dt);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  const onResize = () => { Render.resize(); };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
})();
