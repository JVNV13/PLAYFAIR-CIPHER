// Matrix code-rain background (two depth layers). Static when reduced-motion is set.
const GLYPHS = "ｱｲｳｴｵ0123456789ABCDEFGHKLMNOPQRSTUVWXYZ□ÀÉÑÖÝ$%#@<>/\\=+*".split("");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#3dff7a";

function layer(id, size, speed) {
  const c = document.getElementById(id), ctx = c.getContext("2d");
  let cols, drops, color = css("--rain");
  const resize = () => {
    c.width = innerWidth; c.height = innerHeight; ctx.font = `${size}px 'Share Tech Mono', monospace`;
    cols = Math.ceil(c.width / size); drops = Array.from({ length: cols }, () => Math.random() * -50);
  };
  const step = () => {
    ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,0.09)"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "source-over";
    drops.forEach((y, i) => {
      if (y < 0) { drops[i] += speed; return; }
      ctx.fillStyle = Math.random() > .96 ? "#eafff0" : color;
      ctx.fillText(GLYPHS[Math.random() * GLYPHS.length | 0], i * size, y * size);
      drops[i] = y * size > c.height && Math.random() > .975 ? Math.random() * -20 : y + speed;
    });
  };
  addEventListener("resize", resize); resize();
  new MutationObserver(() => { color = css("--rain"); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return step;
}

const steps = [layer("rainFar", 26, .5), layer("rainNear", 15, .8)];
if (reduce.matches) for (let i = 0; i < 90; i++) steps.forEach(s => s());
else {
  let last = 0;
  const loop = t => { if (t - last > 45 && !document.hidden) { steps.forEach(s => s()); last = t; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
