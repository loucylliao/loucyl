(() => {
    const STEP = 0.01;
    const MAX_T = 24 * Math.PI;
    const PER_FRAME = 12;

    const r = t =>
        Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) +
        Math.pow(Math.sin((2 * t - Math.PI) / 24), 5);
    const point = t => ({ x: r(t) * Math.cos(t), y: -r(t) * Math.sin(t) });

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let t = 0; t <= MAX_T; t += STEP) {
        const p = point(t);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }

    function setup(canvas, {
        axes = true,
        animate = true,
        lineWidth = 0.6,
        alpha = 0.75,
        pad = 8,
        perFrame = PER_FRAME
    } = {}) {
        const ctx = canvas.getContext("2d");
        let w = 0, h = 0, scale = 1, ox = 0, oy = 0, raf, t = 0, visible = false;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            w = canvas.clientWidth; h = canvas.clientHeight;
            if (!w || !h) return false;
            canvas.width = w * dpr; canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            scale = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY));
            ox = w / 2 - ((minX + maxX) / 2) * scale;
            oy = h / 2 - ((minY + maxY) / 2) * scale;
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = `rgba(208, 175, 192, ${alpha})`;
            ctx.lineJoin = "round";
            return true;
        }

        const toScreen = p => [ox + p.x * scale, oy + p.y * scale];

        function drawAxes() {
            if (!axes) return;
            const guide = getComputedStyle(document.documentElement)
                .getPropertyValue("--guide").trim() || "rgba(255,255,255,0.1)";
            const edge = 2, a = 5;
            const yTop = 20, yBottom = 20;

            ctx.save();
            ctx.strokeStyle = guide;
            ctx.lineWidth = 1;
            ctx.lineCap = "round";
            ctx.beginPath();

            ctx.moveTo(edge, oy);
            ctx.lineTo(w - edge, oy);
            ctx.moveTo(w - edge - a, oy - a * 0.6);
            ctx.lineTo(w - edge, oy);
            ctx.lineTo(w - edge - a, oy + a * 0.6);

            ctx.moveTo(ox, h - yBottom);
            ctx.lineTo(ox, yTop);
            ctx.moveTo(ox - a * 0.6, yTop + a);
            ctx.lineTo(ox, yTop);
            ctx.lineTo(ox + a * 0.6, yTop + a);

            ctx.stroke();
            ctx.restore();
        }

        function drawAll() {
            if (!resize()) return;
            ctx.clearRect(0, 0, w, h);
            ctx.beginPath();
            let [x, y] = toScreen(point(0));
            ctx.moveTo(x, y);
            for (let s = STEP; s <= MAX_T; s += STEP) {
                [x, y] = toScreen(point(s));
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        function draw() {
            ctx.beginPath();
            let [x, y] = toScreen(point(t));
            ctx.moveTo(x, y);
            for (let i = 0; i < perFrame && t < MAX_T; i++) {
                t += STEP;
                [x, y] = toScreen(point(t));
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            if (t < MAX_T) raf = requestAnimationFrame(draw);
        }

        function play() {
            cancelAnimationFrame(raf);
            if (!resize()) return;
            ctx.clearRect(0, 0, w, h);
            drawAxes();
            t = 0;
            draw();
        }

        function stop() {
            cancelAnimationFrame(raf);
            if (!w || !h) return;
            ctx.clearRect(0, 0, w, h);
            drawAxes();
            t = 0;
        }

        if (!animate) {
            drawAll();
            window.addEventListener("resize", drawAll);
            return;
        }

        if (resize()) drawAxes();

        new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            if (visible) play();
            else stop();
        }, { threshold: 0.4 }).observe(canvas);

        canvas.addEventListener("click", play);

        window.addEventListener("resize", () => {
            if (visible) play();
            else if (resize()) drawAxes();
        });
    }

    const main = document.getElementById("butterfly-curve");
    if (main) setup(main);

    const logo = document.getElementById("butterfly-logo");
    if (logo) setup(logo, {
        axes: false,
        animate: true,
        lineWidth: 0.9,
        alpha: 0.9,
        pad: 2,
        perFrame: 10
    });

    window.addEventListener("load", () => {
        const el = document.getElementById("curve-eq");
        if (el && window.katex) {
            katex.render(
                String.raw`r = e^{\sin\theta} - 2\cos(4\theta) + \sin^5\left(\frac{2\theta-\pi}{24}\right)`,
                el,
                { throwOnError: false }
            );
        }
    });
})();