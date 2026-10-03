(() => {
    const CONFIG = {
        density: 0.00009,
        minNodes: 55,
        maxNodes: 185,
        linkDist: 181,
        speed: 0.18,
        dotRadius: [0.85, 2.5],

        lineRGB: "208,175,192",
        dotRGB: "244,237,231",
        lineAlpha: 0.275,
        fillAlpha: 0.043,
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

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        zIndex: "-1",
        pointerEvents: "none",
        background: "#1a1a1a"
    });
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1;
    let nodes = [];
    let stars = [];
    let t = 0;
    let shootingStar = null;
    let nextShootingStar = 360;
    const mouse = { x: -9999, y: -9999, active: false };

    function rand(a, b) { return a + Math.random() * (b - a); }

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

        if (reduceMotion) draw();
    }

    function step() {
        t += 1;

        if (!reduceMotion) {
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

        if (CONFIG.starDrift > 0) {
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

        drawStars();
        drawShootingStar();

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
        ctx.fillStyle = `rgba(${CONFIG.lineRGB},1)`;
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
                    ctx.globalAlpha = CONFIG.fillAlpha * s * 2;
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
            ctx.strokeStyle = `rgba(${CONFIG.lineRGB},${(CONFIG.lineAlpha * s).toFixed(3)})`;
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
                    ctx.strokeStyle = `rgba(${CONFIG.lineRGB},${(CONFIG.mouseLineAlpha * s).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(mouse.x, mouse.y);
                    ctx.lineTo(n.x, n.y);
                    ctx.stroke();
                }
            }
        }

        ctx.fillStyle = `rgba(${CONFIG.dotRGB},0.75)`;
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
    window.addEventListener("pointermove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    }, { passive: true });
    document.addEventListener("pointerleave", () => { mouse.active = false; });

    resize();
    if (reduceMotion) draw();
    else loop();
})();