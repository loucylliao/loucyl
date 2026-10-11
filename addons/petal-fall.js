
(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const CFG = {
        interval: [1800, 4200],   
        maxPetals: 9,             
        size: [12, 22],            
        fall: [0.45, 0.95],       
        sway: [0.25, 0.6],        
        wind: 0.12,               
        spin: 0.0022,
        flutter: 0.0045,
        alpha: [0.45, 0.8],
        colors: ["#f1d3df", "#e8bfd0", "#dba7bd", "#f6e3ea", "#cf93ad"],
    };

    const root = document.documentElement;
    const isLight = () => root.getAttribute("data-theme") === "light";
    const rand = (a, b) => a + Math.random() * (b - a);

    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "40", 
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

    const petals = [];
    let nextSpawn = 0;
    let running = false;
    let prev = 0;

    function spawn(now, firstLoad) {
        const depth = Math.random(); 
        petals.push({
            x: rand(-40, window.innerWidth * 0.95),
            y: firstLoad ? rand(-20, window.innerHeight * 0.5) : rand(-40, -15),
            size: CFG.size[0] + (CFG.size[1] - CFG.size[0]) * depth,
            vy: CFG.fall[0] + (CFG.fall[1] - CFG.fall[0]) * depth,
            sway: rand(CFG.sway[0], CFG.sway[1]),
            swayFreq: rand(0.0008, 0.0016),
            swayPhase: rand(0, Math.PI * 2),
            rot: rand(0, Math.PI * 2),
            spinDir: Math.random() < 0.5 ? -1 : 1,
            flutterPhase: rand(0, Math.PI * 2),
            alpha: CFG.alpha[0] + (CFG.alpha[1] - CFG.alpha[0]) * depth,
            color: CFG.colors[(Math.random() * CFG.colors.length) | 0],
            born: now,
        });
    }

    function drawPetal(len, color) {
        const w = len * 0.55;
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.bezierCurveTo(w * 1.3, -len * 0.45, w * 1.0, len * 0.55, 0, len);
        ctx.bezierCurveTo(-w * 0.25, len * 0.5, -w * 0.45, -len * 0.4, 0, -len);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, -len, 0, len);
        g.addColorStop(0, color);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fill();
    }

    function frame(now) {
        if (!isLight()) {
            petals.length = 0;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            running = false;
            prev = 0;
            return;
        }
        const dt = Math.min((now - (prev || now)) / 16.67, 3);
        prev = now;

        if (now >= nextSpawn) {
            if (petals.length < CFG.maxPetals) spawn(now, false);
            nextSpawn = now + rand(CFG.interval[0], CFG.interval[1]);
        }

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        const H = window.innerHeight;
        for (let i = petals.length - 1; i >= 0; i--) {
            const p = petals[i];
            const age = now - p.born;
            p.y += p.vy * dt;
            p.x += (Math.sin(age * p.swayFreq + p.swayPhase) * p.sway + CFG.wind) * dt;
            p.rot += p.spinDir * CFG.spin * 16.67 * dt;
            if (p.y > H + 30) {
                petals.splice(i, 1);
                continue;
            }
            
            const a = p.alpha * Math.min(1, Math.max(0, (p.y + 20) / 80)) * Math.min(1, Math.max(0, (H + 30 - p.y) / 120));
            const flip = 0.3 + 0.7 * Math.abs(Math.cos(age * CFG.flutter + p.flutterPhase));
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(flip, 1);
            ctx.globalAlpha = a;
            drawPetal(p.size, p.color);
            ctx.restore();
        }
        requestAnimationFrame(frame);
    }

    function start() {
        if (running || !isLight()) return;
        running = true;
        const now = performance.now();
        if (!petals.length) {
            spawn(now, true);
            spawn(now, true);
        }
        nextSpawn = now + rand(CFG.interval[0], CFG.interval[1]);
        requestAnimationFrame(frame);
    }

    new MutationObserver(start).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    start();
})();