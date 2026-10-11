(() => {
    const CONFIG = {
        density: 0.00009,
        minNodes: 55,
        maxNodes: 185,
        linkDist: 181,
        speed: 0.18,
        dotRadius: [0.85, 2.5],

        maxTriangles: 290,

        mouseRadius: 170,
        mouseLineAlpha: 0.5,

        starDensity: 0.00022,
        minStars: 80,
        maxStars: 420,
        starRadius: [0.3, 1.4],
        starRGB: "244,237,231",
        starAlpha: 0.85,
        starTwinkleSpeed: 0.9,
        starDrift: 0.03
    };

    const THEMES = {
        dark: {
            bg: "#1a1a1a",
            lineRGB: "208,175,192",
            dotRGB: "244,237,231",
            lineAlpha: 0.275,
            fillAlpha: 0.043,
            dotAlpha: 0.75
        },
        light: {
            bg: "#fbf5f7",
            lineRGB: "180,127,154",
            dotRGB: "138,90,116",
            lineAlpha: 0.32,
            fillAlpha: 0.06,
            dotAlpha: 0.55
        }
    };

    const CLOUDS = {
        density: 0.000006,
        min: 5,
        max: 12,
        width: [220, 460],
        alpha: [0.75, 0.95],
        drift: [0.04, 0.12],
        variants: 5,
        spriteW: 160,
        spriteH: 80,
        shadow: [214, 182, 202],
        light: [232, 208, 221]
    };

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        zIndex: "-1",
        pointerEvents: "none",
        background: THEMES.dark.bg
    });
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1;
    let nodes = [];
    let stars = [];
    let clouds = [];
    let t = 0;
    let shootingStar = null;
    let nextShootingStar = 360;
    let theme = THEMES.dark;
    let isLight = false;
    const mouse = { x: -9999, y: -9999, active: false };

    function rand(a, b) { return a + Math.random() * (b - a); }

    function applyTheme() {
        isLight = document.documentElement.getAttribute("data-theme") === "light";
        theme = isLight ? THEMES.light : THEMES.dark;
        canvas.style.background = theme.bg;
        if (reduceMotion) draw();
    }

    function makeNode() {
        const angle = Math.random() * Math.PI * 2;
        const s = rand(0.4, 1) * CONFIG.speed;
        return {
            x: rand(0, w),
            y: rand(0, h),
            vx: Math.cos(angle) * s,
            vy: Math.sin(angle) * s,
            r: rand(CONFIG.dotRadius[0], CONFIG.dotRadius[1])
        };
    }

    function makeStar() {
        return {
            x: rand(0, w),
            y: rand(0, h),
            r: rand(CONFIG.starRadius[0], CONFIG.starRadius[1]),
            phase: Math.random() * Math.PI * 2,
            speed: rand(0.6, 1.4)
        };
    }

    
    let noiseTable = null;
    let sprites = null;

    const smooth = (t) => t * t * (3 - 2 * t);
    const smoothstep = (a, b, x) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    };

    function vnoise(x, y) {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const x0 = xi & 255, y0 = yi & 255;
        const x1 = (x0 + 1) & 255, y1 = (y0 + 1) & 255;
        const a = noiseTable[y0 * 256 + x0], b = noiseTable[y0 * 256 + x1];
        const c = noiseTable[y1 * 256 + x0], d = noiseTable[y1 * 256 + x1];
        const u = smooth(xf), v = smooth(yf);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }

    function fbm(x, y) {
        let sum = 0, amp = 0.5, freq = 1, norm = 0;
        for (let o = 0; o < 5; o++) {
            sum += amp * vnoise(x * freq, y * freq);
            norm += amp;
            amp *= 0.52;
            freq *= 2;
        }
        return sum / norm;
    }

    function buildCloudSprite() {
        const sw = CLOUDS.spriteW, sh = CLOUDS.spriteH;
        const sprite = document.createElement("canvas");
        sprite.width = sw;
        sprite.height = sh;
        const g = sprite.getContext("2d");
        const img = g.createImageData(sw, sh);
        const px = img.data;
        const ox = rand(0, 200), oy = rand(0, 200);
        const sc = 3 / sw;
        const S = CLOUDS.shadow, L = CLOUDS.light;

        for (let y = 0; y < sh; y++) {
            const ey = (y + 0.5) / sh * 2 - 1;
            for (let x = 0; x < sw; x++) {
                const ex = (x + 0.5) / sw * 2 - 1;
                const env = 1 - (ex * ex + ey * ey * 1.5);
                if (env <= 0) continue;

                const nx = ox + x * sc, ny = oy + y * sc;
                const wx = (vnoise(nx * 1.3 + 5.2, ny * 1.3 + 1.7) - 0.5) * 0.4;
                const wy = (vnoise(nx * 1.3 + 9.1, ny * 1.3 + 6.3) - 0.5) * 0.4;
                const n = fbm(nx + wx, ny + wy);

                const d = n * (0.33 + 1.0 * env);
                const a = smoothstep(0.26, 0.76, d);
                if (a <= 0) continue;

                const t = Math.min(1, Math.max(0, (d - 0.52) * 1.5 + 0.5));
                const k = (y * sw + x) * 4;
                px[k]     = S[0] + (L[0] - S[0]) * t;
                px[k + 1] = S[1] + (L[1] - S[1]) * t;
                px[k + 2] = S[2] + (L[2] - S[2]) * t;
                px[k + 3] = Math.round(a * 255);
            }
        }
        g.putImageData(img, 0, 0);
        return sprite;
    }

    function ensureSprites() {
        if (sprites) return sprites;
        noiseTable = new Float32Array(256 * 256);
        for (let i = 0; i < noiseTable.length; i++) noiseTable[i] = Math.random();
        sprites = [];
        for (let i = 0; i < CLOUDS.variants; i++) sprites.push(buildCloudSprite());
        return sprites;
    }

    function makeCloud() {
        const width = rand(CLOUDS.width[0], CLOUDS.width[1]);
        const height = width * rand(0.42, 0.6);
        const size = (width - CLOUDS.width[0]) / (CLOUDS.width[1] - CLOUDS.width[0]);
        return {
            x: rand(-width, w),
            y: rand(-height * 0.2, h * 0.9),
            width,
            height,
            alpha: rand(CLOUDS.alpha[0], CLOUDS.alpha[1]),
            drift: rand(CLOUDS.drift[0], CLOUDS.drift[1]) * (0.7 + 0.6 * size),
            phase: Math.random() * Math.PI * 2,
            variant: Math.floor(Math.random() * CLOUDS.variants),
            flip: Math.random() < 0.5
        };
    }

    function makeShootingStar() {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const angle = direction === 1 ? Math.PI * 0.18 : Math.PI * 0.82;
        return {
            x: direction === 1 ? rand(0, w * 0.7) : rand(w * 0.3, w),
            y: rand(0, h * 0.58),
            vx: Math.cos(angle) * 4.2,
            vy: Math.sin(angle) * 4.2,
            age: 0,
            duration: rand(42, 58)
        };
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const target = Math.max(
            CONFIG.minNodes,
            Math.min(CONFIG.maxNodes, Math.round(w * h * CONFIG.density))
        );
        while (nodes.length < target) nodes.push(makeNode());
        nodes.length = target;

        const starTarget = Math.max(
            CONFIG.minStars,
            Math.min(CONFIG.maxStars, Math.round(w * h * CONFIG.starDensity))
        );
        while (stars.length < starTarget) stars.push(makeStar());
        stars.length = starTarget;

        const cloudTarget = Math.max(
            CLOUDS.min,
            Math.min(CLOUDS.max, Math.round(w * h * CLOUDS.density))
        );
        clouds = [];
        for (let i = 0; i < cloudTarget; i++) clouds.push(makeCloud());

        if (reduceMotion) draw();
    }

    function step() {
        t += 1;

        if (!reduceMotion && !isLight) {
            if (shootingStar) {
                shootingStar.x += shootingStar.vx;
                shootingStar.y += shootingStar.vy;
                shootingStar.age += 1;
                if (shootingStar.age >= shootingStar.duration) shootingStar = null;
            } else if (t >= nextShootingStar) {
                shootingStar = makeShootingStar();
                nextShootingStar = t + rand(720, 1200);
            }
        }

        for (const n of nodes) {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < -20)    { n.x = -20;    n.vx =  Math.abs(n.vx); }
            if (n.x > w + 20) { n.x = w + 20; n.vx = -Math.abs(n.vx); }
            if (n.y < -20)    { n.y = -20;    n.vy =  Math.abs(n.vy); }
            if (n.y > h + 20) { n.y = h + 20; n.vy = -Math.abs(n.vy); }
        }

        if (isLight) {
            for (const c of clouds) {
                c.x += c.drift;
                if (c.x > w + 20) c.x = -c.width - 20;
            }
        } else if (CONFIG.starDrift > 0) {
            for (const s of stars) {
                s.x += CONFIG.starDrift;
                if (s.x > w + 2) s.x = -2;
            }
        }
    }

    function drawStars() {
        const baseR = CONFIG.starAlpha;

        for (const s of stars) {
            const tw = CONFIG.starTwinkleSpeed === 0
                ? 1
                : 0.55 + 0.45 * Math.sin(t * 0.03 * CONFIG.starTwinkleSpeed * s.speed + s.phase);

            ctx.fillStyle = `rgba(${CONFIG.starRGB},${(baseR * tw).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawClouds() {
        const pool = ensureSprites();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        for (const c of clouds) {
            const bob = Math.sin(t * 0.004 + c.phase) * 5;
            ctx.globalAlpha = c.alpha;
            if (c.flip) {
                ctx.save();
                ctx.translate(c.x + c.width, c.y + bob);
                ctx.scale(-1, 1);
                ctx.drawImage(pool[c.variant], 0, 0, c.width, c.height);
                ctx.restore();
            } else {
                ctx.drawImage(pool[c.variant], c.x, c.y + bob, c.width, c.height);
            }
        }
        ctx.globalAlpha = 1;
    }

    function drawShootingStar() {
        if (!shootingStar) return;

        const progress = shootingStar.age / shootingStar.duration;
        const opacity = Math.sin(progress * Math.PI) * 0.48;
        const tailLength = 64;
        const tailX = shootingStar.x - shootingStar.vx * tailLength / 4.2;
        const tailY = shootingStar.y - shootingStar.vy * tailLength / 4.2;
        const gradient = ctx.createLinearGradient(tailX, tailY, shootingStar.x, shootingStar.y);
        gradient.addColorStop(0, `rgba(${CONFIG.starRGB},0)`);
        gradient.addColorStop(1, `rgba(${CONFIG.starRGB},${opacity.toFixed(3)})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(shootingStar.x, shootingStar.y);
        ctx.stroke();
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);

        if (isLight) {
            drawClouds();
        } else {
            drawStars();
            drawShootingStar();
        }

        const L = CONFIG.linkDist;
        const L2 = L * L;
        const count = nodes.length;
        const adj = Array.from({ length: count }, () => []);
        const links = [];

        for (let i = 0; i < count; i++) {
            const a = nodes[i];
            for (let j = i + 1; j < count; j++) {
                const b = nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < L2) {
                    const strength = 1 - Math.sqrt(d2) / L;
                    links.push([i, j, strength]);
                    adj[i].push([j, strength]);
                }
            }
        }

        let tris = 0;
        ctx.fillStyle = `rgba(${theme.lineRGB},1)`;
        outer:
        for (let i = 0; i < count; i++) {
            const list = adj[i];
            for (let p = 0; p < list.length; p++) {
                for (let q = p + 1; q < list.length; q++) {
                    const [j, sj] = list[p];
                    const [k, sk] = list[q];
                    const a = nodes[j], b = nodes[k];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 >= L2) continue;
                    const s = Math.min(sj, sk, 1 - Math.sqrt(d2) / L);
                    ctx.globalAlpha = theme.fillAlpha * s * 2;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.closePath();
                    ctx.fill();
                    if (++tris >= CONFIG.maxTriangles) break outer;
                }
            }
        }
        ctx.globalAlpha = 1;

        ctx.lineWidth = 1;
        for (const [i, j, s] of links) {
            ctx.strokeStyle = `rgba(${theme.lineRGB},${(theme.lineAlpha * s).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
        }

        if (mouse.active) {
            const R = CONFIG.mouseRadius;
            for (const n of nodes) {
                const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
                if (d < R) {
                    const s = 1 - d / R;
                    ctx.strokeStyle = `rgba(${theme.lineRGB},${(CONFIG.mouseLineAlpha * s).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(mouse.x, mouse.y);
                    ctx.lineTo(n.x, n.y);
                    ctx.stroke();
                }
            }
        }

        ctx.fillStyle = `rgba(${theme.dotRGB},${theme.dotAlpha})`;
        for (const n of nodes) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function loop() {
        step();
        draw();
        requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("themechange", applyTheme);
    window.addEventListener("pointermove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    }, { passive: true });
    document.addEventListener("pointerleave", () => { mouse.active = false; });

    applyTheme();
    resize();
    if (reduceMotion) draw();
    else loop();
})();