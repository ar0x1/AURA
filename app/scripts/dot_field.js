(function () {
  'use strict';

  const TWO_PI = Math.PI * 2;

  // DotField parameters based on requested specification
  const props = {
    dotRadius: 1.5,
    dotSpacing: 14,
    cursorRadius: 500,
    cursorForce: 0.1,
    bulgeOnly: true,
    bulgeStrength: 67,
    glowRadius: 160,
    sparkle: false,
    waveAmplitude: 0,
    gradientFrom: '#A855F7',
    gradientTo: '#B497CF',
    glowColor: '#120F17'
  };

  let canvas, ctx, glowEl;
  let dots = [];
  const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
  let rafId = null;
  const size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
  let glowOpacity = 0;
  let engagement = 0;
  let frameCount = 0;

  function initDotField() {
    canvas = document.getElementById('dotFieldCanvas');
    glowEl = document.getElementById('dotFieldGlow');
    if (!canvas) return;

    ctx = canvas.getContext('2d', { alpha: true });

    function doResize() {
      const container = canvas.parentElement || document.body;
      const rect = container.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      size.w = w;
      size.h = h;
      size.offsetX = rect.left;
      size.offsetY = rect.top;

      buildDots(w, h);
    }

    let resizeTimer;
    function resize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 100);
    }

    function buildDots(w, h) {
      const step = props.dotRadius + props.dotSpacing;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = (w % step) / 2;
      const padY = (h % step) / 2;
      const newDots = new Array(rows * cols);
      let idx = 0;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          newDots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
        }
      }
      dots = newDots;
    }

    function onMouseMove(e) {
      mouse.x = e.clientX - size.offsetX;
      mouse.y = e.clientY - size.offsetY;
    }

    function onTouchMove(e) {
      if (e.touches && e.touches.length > 0) {
        mouse.x = e.touches[0].clientX - size.offsetX;
        mouse.y = e.touches[0].clientY - size.offsetY;
      }
    }

    function updateMouseSpeed() {
      const dx = mouse.prevX - mouse.x;
      const dy = mouse.prevY - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mouse.speed += (dist - mouse.speed) * 0.5;
      if (mouse.speed < 0.001) mouse.speed = 0;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
    }

    setInterval(updateMouseSpeed, 20);

    function tick() {
      frameCount++;
      const len = dots.length;
      const { w, h } = size;
      const t = frameCount * 0.02;

      const targetEngagement = Math.min(mouse.speed / 5, 1);
      engagement += (targetEngagement - engagement) * 0.06;
      if (engagement < 0.001) engagement = 0;
      const eng = engagement;

      glowOpacity += (eng - glowOpacity) * 0.08;

      if (glowEl) {
        glowEl.setAttribute('cx', mouse.x);
        glowEl.setAttribute('cy', mouse.y);
        glowEl.style.opacity = glowOpacity;
      }

      ctx.clearRect(0, 0, w, h);

      if (len > 0) {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, props.gradientFrom);
        grad.addColorStop(1, props.gradientTo);
        ctx.fillStyle = grad;

        const cr = props.cursorRadius;
        const crSq = cr * cr;
        const rad = props.dotRadius / 2;
        const isBulge = props.bulgeOnly;

        ctx.beginPath();

        for (let i = 0; i < len; i++) {
          const d = dots[i];
          const dx = mouse.x - d.ax;
          const dy = mouse.y - d.ay;
          const distSq = dx * dx + dy * dy;

          if (distSq < crSq && eng > 0.01) {
            const dist = Math.sqrt(distSq);
            if (isBulge) {
              const tDist = 1 - dist / cr;
              const push = tDist * tDist * props.bulgeStrength * eng;
              const angle = Math.atan2(dy, dx);
              d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
              d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
            } else {
              const angle = Math.atan2(dy, dx);
              const move = (500 / dist) * (mouse.speed * props.cursorForce);
              d.vx += Math.cos(angle) * -move;
              d.vy += Math.sin(angle) * -move;
            }
          } else if (isBulge) {
            d.sx += (d.ax - d.sx) * 0.1;
            d.sy += (d.ay - d.sy) * 0.1;
          }

          if (!isBulge) {
            d.vx *= 0.9;
            d.vy *= 0.9;
            d.x = d.ax + d.vx;
            d.y = d.ay + d.vy;
            d.sx += (d.x - d.sx) * 0.1;
            d.sy += (d.y - d.sy) * 0.1;
          }

          let drawX = d.sx;
          let drawY = d.sy;
          if (props.waveAmplitude > 0) {
            drawY += Math.sin(d.ax * 0.03 + t) * props.waveAmplitude;
            drawX += Math.cos(d.ay * 0.03 + t * 0.7) * props.waveAmplitude * 0.5;
          }

          if (props.sparkle) {
            const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
            if ((hash % 100) < 3) {
              ctx.moveTo(drawX + rad * 1.8, drawY);
              ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
            } else {
              ctx.moveTo(drawX + rad, drawY);
              ctx.arc(drawX, drawY, rad, 0, TWO_PI);
            }
          } else {
            ctx.moveTo(drawX + rad, drawY);
            ctx.arc(drawX, drawY, rad, 0, TWO_PI);
          }
        }

        ctx.fill();
      }

      rafId = requestAnimationFrame(tick);
    }

    doResize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    rafId = requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDotField);
  } else {
    initDotField();
  }
})();
