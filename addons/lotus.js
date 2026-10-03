(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function createLotus(canvas, hint, userCfg) {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const CFG = Object.assign({
            bloomSeconds: 4.5,
            closeSeconds: 1.8,
            bloomAt: 0.7,
            camElev: 0.5,
            spin: 0.035,
            sway: 0.03,
            petalAlpha: 0.86,
            glow: 12,
            fireflies: 18,
            petalSteps: 16,
            radiusW: 0.38,
            radiusH: 0.4,
            baseY: 0.64,
            noStem: false,
            sitInWater: false
        }, userCfg);

        const css = getComputedStyle(document.documentElement);
        const accentHex = css.getPropertyValue("--color-accent").trim() || "#d0afc0";
        const ACCENT = (() => {
            const m = /^#?([0-9a-f]{6})$/i.exec(accentHex);
            if (!m) return [208, 175, 192];
            const n = parseInt(m[1], 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        })();
        const BASE_OUT = [150, 100, 132];
        const BASE_IN  = [228, 192, 164];
        const TIP      = [250, 232, 241];

        const TAU = Math.PI * 2;
        const DEG = Math.PI / 180;
        const lerp = (a, b, t) => a + (b - a) * t;
        const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
        const easeInOut = t => 0.5 - 0.5 * Math.cos(Math.PI * t);
        const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
        const rgba = (c, shade, a) =>
            `rgba(${Math.round(c[0] * shade)},${Math.round(c[1] * shade)},${Math.round(c[2] * shade)},${a.toFixed(3)})`;

        let seed = 20260;
        const rnd = () => {
            seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };

        const RINGS = [
            { n: 9, open: 80, closed: 13, curl:  0.30, hw: 0.25, len: 1.00, delay: 0.00 },
            { n: 8, open: 66, closed: 10, curl:  0.15, hw: 0.23, len: 0.92, delay: 0.14 },
            { n: 7, open: 52, closed:  8, curl:  0.00, hw: 0.21, len: 0.80, delay: 0.28 },
            { n: 6, open: 38, closed:  5, curl: -0.15, hw: 0.18, len: 0.64, delay: 0.42 },
            { n: 5, open: 24, closed:  3, curl: -0.25, hw: 0.15, len: 0.46, delay: 0.56 }
        ];
        const CURL_CLOSED = -0.4;
        const T_TOTAL = 1 + RINGS[RINGS.length - 1].delay + 0.05;

        const petals = [];
        RINGS.forEach((ring, ri) => {
            for (let i = 0; i < ring.n; i++) {
                petals.push({
                    ring, ri,
                    az0: (i / ring.n) * TAU + (ri % 2 ? Math.PI / ring.n : 0) + (rnd() - 0.5) * 0.12,
                    delay: ring.delay + (rnd() - 0.5) * 0.06,
                    phase: rnd() * TAU,
                    lenJ: 0.94 + rnd() * 0.1,
                    tiltJ: (rnd() - 0.5) * 0.1
                });
            }
        });

        const stamens = Array.from({ length: 34 }, () => ({
            a: rnd() * TAU,
            r1: 0.07 + rnd() * 0.04,
            r2: 0.12 + rnd() * 0.12,
            y1: 0.2,
            y2: 0.3 + rnd() * 0.07
        }));

        const flies = Array.from({ length: CFG.fireflies }, () => ({
            x: (rnd() - 0.5) * 2.6, y: rnd() * 1.6, r: 0.8 + rnd() * 1.5,
            speed: 0.02 + rnd() * 0.04, phase: rnd() * TAU, freq: 0.8 + rnd() * 1.6
        }));

        let w = 0, h = 0, dpr = 1;
        let cx = 0, baseY = 0, waterY = 0, R = 100, k = 1;
        let p = 0, target = 0;
        let spinAz = 0, time = 0, last = 0, raf = 0;
        let cosE = Math.cos(CFG.camElev), sinE = Math.sin(CFG.camElev);

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = canvas.clientWidth;
            h = canvas.clientHeight;
            if (!w || !h) return false;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            R = Math.min(w * CFG.radiusW, h * CFG.radiusH);
            k = clamp(R / 150, 0.3, 1);
            cx = w / 2;
            baseY = h * CFG.baseY;

            if (CFG.sitInWater) {
                waterY = baseY + R * 0.18;
            } else {
                waterY = Math.min(baseY + R * 0.62, h - R * 0.25);
            }
            return true;
        }

        function proj(az, rad, y, tan) {
            const ca = Math.cos(az), sa = Math.sin(az);
            const x = ca * rad - sa * tan;
            const z = sa * rad + ca * tan;
            const yy = y * cosE - z * sinE;
            const zd = y * sinE + z * cosE;
            const f = 1 / (1 - zd * 0.1);
            return [cx + x * R * f, baseY - yy * R * f, zd];
        }

        function petalItem(pt, now) {
            const r = pt.ring;
            const o = easeInOut(clamp(p * T_TOTAL - pt.delay));
            const N = CFG.petalSteps;
            const az = pt.az0 + spinAz;

            const tilt = lerp(r.closed, r.open, o) * DEG + pt.tiltJ * o +
                         Math.sin(now * 0.7 + pt.phase) * CFG.sway * o;
            const curl = lerp(CURL_CLOSED, r.curl, o);
            const len = r.len * pt.lenJ * (0.9 + 0.1 * o);
            const ds = len / N;

            const left = [], right = [], mid = [];
            let rad = 0.05, y = 0;
            let depth = 0;

            for (let i = 0; i <= N; i++) {
                const s = i / N;
                const th = tilt + curl * s;
                if (i > 0) {
                    const thm = tilt + curl * ((i - 0.5) / N);
                    rad += Math.sin(thm) * ds;
                    y += Math.cos(thm) * ds;
                }
                const prof = Math.pow(Math.sin(Math.PI * Math.pow(s, 0.7)), 0.9);
                const hw = r.hw * pt.lenJ * prof;
                const lift = 1.6 * hw * hw;
                const eRad = rad - Math.cos(th) * lift;
                const eY = y + Math.sin(th) * lift;
                const L = proj(az, eRad, eY, -hw);
                const Rr = proj(az, eRad, eY, hw);
                const M = proj(az, rad, y, 0);
                left.push(L); right.push(Rr); mid.push(M);
                if (i === Math.round(N * 0.6)) depth = M[2];
            }

            return {
                depth: depth + pt.ri * 0.002,
                draw() {
                    ctx.beginPath();
                    ctx.moveTo(left[0][0], left[0][1]);
                    for (let i = 1; i <= N; i++) ctx.lineTo(left[i][0], left[i][1]);
                    for (let i = N; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
                    ctx.closePath();

                    const shade = 0.8 + 0.2 * clamp((depth + 1) / 2);
                    const base = mix(BASE_OUT, BASE_IN, pt.ri / (RINGS.length - 1));
                    const g = ctx.createLinearGradient(mid[0][0], mid[0][1], mid[N][0], mid[N][1]);
                    g.addColorStop(0, rgba(base, shade, CFG.petalAlpha));
                    g.addColorStop(0.55, rgba(ACCENT, shade, CFG.petalAlpha));
                    g.addColorStop(1, rgba(TIP, shade, CFG.petalAlpha * 0.92));

                    ctx.save();
                    ctx.shadowColor = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},0.45)`;
                    ctx.shadowBlur = CFG.glow * k * (0.3 + 0.7 * o);
                    ctx.fillStyle = g;
                    ctx.fill();
                    ctx.restore();

                    ctx.lineWidth = 0.8;
                    ctx.strokeStyle = `rgba(244,237,231,${(0.16 + 0.16 * shade).toFixed(3)})`;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(mid[2][0], mid[2][1]);
                    for (let i = 3; i < N - 1; i++) ctx.lineTo(mid[i][0], mid[i][1]);
                    ctx.lineWidth = 0.6;
                    ctx.strokeStyle = "rgba(255,255,255,0.14)";
                    ctx.stroke();
                }
            };
        }

        function podItem(g) {
            return {
                depth: 0.3,
                draw() {
                    if (g <= 0.01) return;
                    const rb = 0.055, yb = 0.12, rt = 0.1 * (0.6 + 0.4 * g), yt = 0.26;
                    const n = 18, quads = [];
                    for (let i = 0; i < n; i++) {
                        const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
                        const p0 = proj(a0 + spinAz, rb, yb, 0), p1 = proj(a1 + spinAz, rb, yb, 0);
                        const p2 = proj(a1 + spinAz, rt, yt, 0), p3 = proj(a0 + spinAz, rt, yt, 0);
                        quads.push({ pts: [p0, p1, p2, p3], d: (p0[2] + p1[2] + p2[2] + p3[2]) / 4 });
                    }
                    quads.sort((a, b) => a.d - b.d);

                    ctx.save();
                    ctx.globalAlpha = g;
                    for (const q of quads) {
                        const s = 0.7 + 0.3 * clamp((q.d + 0.2) / 0.4);
                        ctx.beginPath();
                        ctx.moveTo(q.pts[0][0], q.pts[0][1]);
                        for (let k = 1; k < 4; k++) ctx.lineTo(q.pts[k][0], q.pts[k][1]);
                        ctx.closePath();
                        ctx.fillStyle = rgba([196, 160, 112], s, 0.95);
                        ctx.fill();
                    }
                    ctx.beginPath();
                    for (let i = 0; i <= n; i++) {
                        const t = proj((i / n) * TAU + spinAz, rt, yt, 0);
                        i ? ctx.lineTo(t[0], t[1]) : ctx.moveTo(t[0], t[1]);
                    }
                    ctx.closePath();
                    ctx.fillStyle = "rgba(244,224,174,0.98)";
                    ctx.fill();

                    ctx.fillStyle = "rgba(120,88,64,0.8)";
                    const holes = [[0, 0]];
                    for (let i = 0; i < 6; i++) holes.push([rt * 0.55, (i / 6) * TAU]);
                    for (const [rr, aa] of holes) {
                        const t = proj(aa + spinAz, rr, yt, 0);
                        ctx.beginPath();
                        ctx.arc(t[0], t[1], Math.max(0.8, R * 0.011), 0, TAU);
                        ctx.fill();
                    }
                    ctx.restore();
                }
            };
        }

        function stamenItem(g) {
            return {
                depth: 0.31,
                draw() {
                    if (g <= 0.01) return;
                    ctx.save();
                    ctx.globalAlpha = g;
                    ctx.lineWidth = 0.7;
                    for (const s of stamens) {
                        const a = s.a + spinAz;
                        const A = proj(a, s.r1, s.y1, 0);
                        const B = proj(a, s.r2, s.y2 * g, 0);
                        const C = proj(a, (s.r1 + s.r2) / 2 + 0.03, s.y2 * 0.85 * g, 0);
                        ctx.beginPath();
                        ctx.moveTo(A[0], A[1]);
                        ctx.quadraticCurveTo(C[0], C[1], B[0], B[1]);
                        ctx.strokeStyle = "rgba(246,230,238,0.4)";
                        ctx.stroke();

                        ctx.save();
                        ctx.shadowColor = accentHex;
                        ctx.shadowBlur = 8 * k;
                        ctx.fillStyle = "#f6e6ee";
                        ctx.beginPath();
                        ctx.arc(B[0], B[1], Math.max(0.7, 1.2 * k), 0, TAU);
                        ctx.fill();
                        ctx.restore();
                    }
                    ctx.restore();
                }
            };
        }

        function drawWater(now) {
            const grow = easeInOut(clamp(p * 1.4));

            ctx.save();
            ctx.translate(cx, waterY);
            ctx.scale(1, 0.2);
            const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.2);
            gl.addColorStop(0, `rgba(${ACCENT.join(",")},${(0.16 * grow).toFixed(3)})`);
            gl.addColorStop(1, `rgba(${ACCENT.join(",")},0)`);
            ctx.fillStyle = gl;
            ctx.beginPath();
            ctx.arc(0, 0, R * 1.2, 0, TAU);
            ctx.fill();
            ctx.restore();

            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const ph = (now * 0.16 + i / 3) % 1;
                const rx = R * (0.22 + 0.95 * ph);
                const a = Math.pow(1 - ph, 1.6) * (0.14 + 0.2 * grow);
                ctx.strokeStyle = `rgba(${ACCENT.join(",")},${a.toFixed(3)})`;
                ctx.beginPath();
                ctx.ellipse(cx, waterY, rx, rx * 0.2, 0, 0, TAU);
                ctx.stroke();
            }
        }

        function drawStem() {
            ctx.beginPath();
            ctx.moveTo(cx, baseY);
            ctx.quadraticCurveTo(cx + R * 0.05, (baseY + waterY) / 2, cx, waterY);
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(${ACCENT.join(",")},0.35)`;
            ctx.stroke();
        }

        function drawHalo() {
            const a = 0.1 * easeInOut(p);
            if (a < 0.003) return;
            const gy = baseY - R * 0.2;
            const g = ctx.createRadialGradient(cx, gy, 0, cx, gy, R * 1.5);
            g.addColorStop(0, `rgba(${ACCENT.join(",")},${a.toFixed(3)})`);
            g.addColorStop(1, `rgba(${ACCENT.join(",")},0)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        }

        function drawFireflies(now, dt) {
            const vis = easeInOut(clamp((p - 0.55) / 0.45));
            if (vis < 0.01) return;
            for (const f of flies) {
                f.y += f.speed * dt;
                if (f.y > 1.7) { f.y = -0.1; f.x = (rnd() - 0.5) * 2.6; }
                const x = cx + (f.x + Math.sin(now * 0.4 * f.freq + f.phase) * 0.08) * R;
                const y = waterY - f.y * R * 0.95;
                const life = Math.sin(clamp(f.y / 1.7) * Math.PI);
                const tw = 0.45 + 0.55 * Math.abs(Math.sin(now * f.freq + f.phase));
                ctx.save();
                ctx.globalAlpha = life * tw * 0.9 * vis;
                ctx.fillStyle = "#f6e6ee";
                ctx.shadowColor = accentHex;
                ctx.shadowBlur = 9 * k;
                ctx.beginPath();
                ctx.arc(x, y, f.r * Math.max(0.55, k), 0, TAU);
                ctx.fill();
                ctx.fill();
                ctx.restore();
            }
        }

        function draw(now, dt) {
            ctx.clearRect(0, 0, w, h);
            drawHalo();
            drawWater(now);
            if (!CFG.noStem) drawStem();

            const items = petals.map(pt => petalItem(pt, now));
            const inner = easeInOut(clamp(p * T_TOTAL - RINGS[RINGS.length - 1].delay));
            const g = clamp((inner - 0.25) / 0.75);
            items.push(podItem(g), stamenItem(g));
            items.sort((a, b) => a.depth - b.depth);
            for (const it of items) it.draw();

            drawFireflies(now, dt);
        }

        function frame(t) {
            raf = requestAnimationFrame(frame);
            const dt = Math.min((t - (last || t)) / 1000, 0.05);
            last = t;
            time += dt;

            const step = dt / (target > p ? CFG.bloomSeconds : CFG.closeSeconds);
            p = target > p ? Math.min(target, p + step) : Math.max(target, p - step);
            spinAz += CFG.spin * dt;

            draw(time, dt);
        }

        function startLoop() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
        function stopLoop()  { cancelAnimationFrame(raf); raf = 0; }

        function setHint() {
            if (hint) hint.textContent = target ? "click to close" : "click to bloom";
        }

        function toggle() {
            target = target ? 0 : 1;
            setHint();
            startLoop();
        }

        resize();

        if (reduceMotion) {
            p = 1; target = 1;
            draw(0, 0);
            window.addEventListener("resize", () => { if (resize()) draw(0, 0); });
            if (hint) hint.hidden = true;
            return;
        }

        canvas.addEventListener("click", toggle);
        canvas.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        });
        window.addEventListener("resize", () => { if (resize() && !raf) draw(time, 0); });

        if ("IntersectionObserver" in window) {
            let bloomed = false;
            const steps = Array.from({ length: 41 }, (_, i) => i / 40);

            new IntersectionObserver(([entry]) => {
                if (!entry.isIntersecting) {
                    stopLoop();
                    return;
                }

                if (bloomed) {
                    startLoop();
                    return;
                }

                let need = CFG.bloomAt;
                if (entry.rootBounds) {
                    need = Math.min(need, 0.9 * entry.rootBounds.height / entry.boundingClientRect.height);
                }

                if (entry.intersectionRatio >= need) {
                    bloomed = true;
                    resize();
                    target = 1;
                    setHint();
                    startLoop();
                }
            }, { threshold: steps }).observe(canvas);
        } else {
            target = 1;
            setHint();
            startLoop();
        }
    }

    createLotus(document.getElementById("lotus-logo"), null, {
        bloomSeconds: 4,
        radiusW: 0.37,
        radiusH: 0.40,
        baseY: 0.6,
        fireflies: 8
    });

    createLotus(document.getElementById("lotus-bio"), null, {
        bloomSeconds: 4,
        radiusW: 0.42,
        radiusH: 0.46,
        baseY: 0.62,
        fireflies: 12,
        spin: 0.03,
        noStem: true,
        sitInWater: true
    });
})();