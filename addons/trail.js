(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const CFG = {
        spacing: 30,
        maxParticles: 14,
        life: [1100, 1900],
        size: [12, 22],
        oncePerMove: true,
        moveIdle: 180,
        dotCounts: [2, 2, 2, 2, 3],
        halo: false,
        haloSize: 80,
        haloAlpha: 0.13,
        haloFollow: 0.16,
        dotSize: [1, 2.4],
        dotGlow: 9,
        dotAlpha: 0.9,
        dotSpread: 26,
        maxDots: 16,
        fall: 0.22,
        sway: 0.28,
        spin: 0.0025,
        flutter: 0.006,
        scatter: 5,
        glow: 3,
        maxAlpha: 0.7,
        tailDelay: 160,
    };

    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--color-accent").trim() || "#d0afc0";
    const COLORS = [accent, accent, accent, "#e9cfdb", "#c79bb1"];

    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "50",
    });
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let dpr = 1;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const particles = [];
    const dots = [];
    const rand = (a, b) => a + Math.random() * (b - a);

    function spawn(x, y) {
        if (particles.length >= CFG.maxParticles) particles.shift();
        particles.push({
            x: x + rand(-CFG.scatter, CFG.scatter),
            y: y + rand(-CFG.scatter, CFG.scatter),
            size: rand(CFG.size[0], CFG.size[1]),
            born: performance.now(),
            life: rand(CFG.life[0], CFG.life[1]),
            rot: rand(0, Math.PI * 2),
            spinDir: Math.random() < 0.5 ? -1 : 1,
            swayPhase: rand(0, Math.PI * 2),
            flutterPhase: rand(0, Math.PI * 2),
            color: COLORS[(Math.random() * COLORS.length) | 0],
        });
        spawnDots(x, y);
    }

    function spawnDots(x, y) {
        const count = CFG.dotCounts[(Math.random() * CFG.dotCounts.length) | 0];
        for (let i = 0; i < count; i++) {
            if (dots.length >= CFG.maxDots) dots.shift();
            const angle = rand(0, Math.PI * 2);
            const dist = rand(CFG.dotSpread * 0.3, CFG.dotSpread);
            dots.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: rand(-0.08, 0.08),
                vy: rand(0.02, 0.12),
                r: rand(CFG.dotSize[0], CFG.dotSize[1]),
                born: performance.now() + rand(0, 200),
                life: rand(CFG.life[0], CFG.life[1]),
                phase: rand(0, Math.PI * 2),
                freq: rand(0.006, 0.014),
            });
        }
    }

    function drawPetal(len) {
        const w = len * 0.55;
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.bezierCurveTo(w * 1.3, -len * 0.45, w * 1.0, len * 0.55, 0, len);
        ctx.bezierCurveTo(-w * 0.25, len * 0.5, -w * 0.45, -len * 0.4, 0, -len);
        ctx.closePath();

        const g = ctx.createLinearGradient(0, -len, 0, len);
        g.addColorStop(0, ctx.fillStyle);
        g.addColorStop(1, "rgba(255,255,255,0)");
        const base = ctx.fillStyle;
        ctx.fillStyle = g;
        ctx.fill();
        ctx.fillStyle = base;
    }

    const [hr, hg, hb] = (() => {
        const m = /^#?([0-9a-f]{6})$/i.exec(accent);
        if (!m) return [208, 175, 192];
        const n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    })();

    let tx = 0, ty = 0;
    let hx = 0, hy = 0;
    let ha = 0;
    let inside = false;
    let haloInit = false;

    function drawHalo(now, dt) {
        const active = inside && now - lastMove < 500;
        ha += ((active ? 1 : 0) - ha) * Math.min(0.08 * dt, 1);
        hx += (tx - hx) * Math.min(CFG.haloFollow * dt, 1);
        hy += (ty - hy) * Math.min(CFG.haloFollow * dt, 1);
        if (ha < 0.01) return;

        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, CFG.haloSize);
        g.addColorStop(0, `rgba(${hr},${hg},${hb},${CFG.haloAlpha * ha})`);
        g.addColorStop(0.5, `rgba(${hr},${hg},${hb},${CFG.haloAlpha * ha * 0.35})`);
        g.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(hx - CFG.haloSize, hy - CFG.haloSize, CFG.haloSize * 2, CFG.haloSize * 2);
    }

    let running = false;
    let prev = 0;

    function frame(now) {
        const dt = Math.min((now - (prev || now)) / 16.67, 3);
        prev = now;

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        if (CFG.halo) drawHalo(now, dt);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const age = now - p.born;
            if (age >= p.life) {
                particles.splice(i, 1);
                continue;
            }

            const t = age / p.life;
            const fade = Math.sin(Math.min(t * 1.15, 1) * Math.PI);
            const alpha = Math.max(fade, 0) * CFG.maxAlpha;

            p.y += CFG.fall * dt;
            p.x += Math.sin(age * 0.003 + p.swayPhase) * CFG.sway * dt;
            p.rot += p.spinDir * CFG.spin * 16.67 * dt;

            const flip = 0.35 + 0.65 * Math.abs(Math.cos(age * CFG.flutter + p.flutterPhase));

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(flip, 1);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            if (CFG.glow) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = CFG.glow;
            }
            drawPetal(p.size);
            ctx.restore();
        }

        for (let i = dots.length - 1; i >= 0; i--) {
            const d = dots[i];
            const age = now - d.born;
            if (age < 0) continue;
            if (age >= d.life) {
                dots.splice(i, 1);
                continue;
            }

            const t = age / d.life;
            const fade = Math.sin(t * Math.PI);
            const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(age * d.freq + d.phase));
            d.x += d.vx * dt;
            d.y += d.vy * dt;

            ctx.save();
            ctx.globalAlpha = fade * twinkle * CFG.dotAlpha;
            ctx.fillStyle = "#f6e6ee";
            ctx.shadowColor = accent;
            ctx.shadowBlur = CFG.dotGlow;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fill();
            ctx.restore();
        }

        if (particles.length || dots.length || (CFG.halo && (ha > 0.01 || (inside && now - lastMove < 500)))) {
            requestAnimationFrame(frame);
        } else {
            running = false;
            prev = 0;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    function start() {
        if (running) return;
        running = true;
        requestAnimationFrame(frame);
    }

    let lastX = null;
    let lastY = null;
    let travelled = 0;
    let armed = true;
    let lastMove = 0;
    const history = [];

    function tailPoint(now) {
        const cutoff = now - CFG.tailDelay;
        let pt = history[0];
        for (let i = 0; i < history.length; i++) {
            if (history[i].t <= cutoff) pt = history[i];
            else break;
        }
        return pt;
    }

    window.addEventListener(
        "pointermove",
        (e) => {
            if (e.pointerType === "touch") return;
            const now = performance.now();

            tx = e.clientX;
            ty = e.clientY;
            inside = true;
            if (!haloInit) {
                hx = tx;
                hy = ty;
                haloInit = true;
            }
            if (CFG.halo) start();

            if (now - lastMove > CFG.moveIdle) {
                armed = true;
                travelled = 0;
            }
            lastMove = now;

            history.push({ x: e.clientX, y: e.clientY, t: now });
            while (history.length > 1 && now - history[0].t > CFG.tailDelay * 3) {
                history.shift();
            }

            if (lastX !== null) {
                travelled += Math.hypot(e.clientX - lastX, e.clientY - lastY);
                if (travelled >= CFG.spacing && (armed || !CFG.oncePerMove)) {
                    const tail = tailPoint(now);
                    spawn(tail.x, tail.y);
                    travelled = 0;
                    if (CFG.oncePerMove) armed = false;
                    start();
                }
            }
            lastX = e.clientX;
            lastY = e.clientY;
        },
        { passive: true }
    );

    document.addEventListener("mouseleave", () => {
        lastX = lastY = null;
        travelled = 0;
        history.length = 0;
        inside = false;
        haloInit = false;
    });
})();