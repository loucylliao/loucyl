(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const CONFIG = {
        size: 24,
        fill: "#fbf6f3",
        glow: "208,175,192",
        glowSoft: "244,237,231",
        hoverScale: 1.05,
        pressScale: 0.92,

        sparkles: false,
        sparkleEvery: 28,
        clickPulse: false
    };

    const INTERACTIVE = [
        "a", "button", "summary", "label", "select",
        "[role='button']", "[data-project]", "[data-project-close]",
        ".project-row", ".her-button", ".book", ".tree-row", ".bio-progress-item",
        ".project-sheet-fs", ".project-sheet-close", ".mobile-menu-btn",
        ".nav-item > a", ".art-butterfly-hybrid", "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    const GRABBABLE = ".art-butterfly-hybrid.mode-interactive";
    const TEXTY = "input, textarea, [contenteditable='true'], p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, dt, dd, td, th, pre, code, [data-cursor='text']";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const A_X = 3,    A_Y = 2;
    const H_X = 10.4, H_Y = 1.6;
    const M_X = 9.5,  M_Y = 9.5;
    const s = CONFIG.size / 24;

    const style = document.createElement("style");
    style.textContent = `
        html.cc, html.cc * { cursor: none !important; }

        .cc-arrow {
            position: fixed;
            top: 0; left: 0;
            width: 0; height: 0;
            pointer-events: none;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity 0.25s ease;
            will-change: transform;
        }
        .cc-arrow.is-on { opacity: 1; }

        .cc-arrow svg {
            position: absolute;
            width: ${CONFIG.size}px;
            height: ${CONFIG.size}px;
            overflow: visible;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease, filter 0.3s ease;
            filter:
                drop-shadow(0 0 1.5px rgba(${CONFIG.glowSoft}, 0.95))
                drop-shadow(0 0 5px rgba(${CONFIG.glow}, 0.8))
                drop-shadow(0 0 12px rgba(${CONFIG.glow}, 0.4))
                brightness(0.9);
        }
        .cc-arrow .cc-a {
            left: ${-A_X * s}px; top: ${-A_Y * s}px;
            transform-origin: ${A_X * s}px ${A_Y * s}px;
        }
        .cc-arrow .cc-h {
            left: ${-H_X * s}px; top: ${-H_Y * s}px;
            transform-origin: ${H_X * s}px ${H_Y * s}px;
            opacity: 0;
            transform: scale(0.85);
        }
        .cc-arrow .cc-m {
            left: ${-M_X * s}px; top: ${-M_Y * s}px;
            transform-origin: ${M_X * s}px ${M_Y * s}px;
            opacity: 0;
            transform: scale(0.85);
        }
        .cc-arrow .cc-t,
        .cc-arrow .cc-g,
        .cc-arrow .cc-gr {
            left: -12px; top: -12px;
            opacity: 0;
            transform: scale(0.85);
        }
        .cc-arrow path { fill: ${CONFIG.fill}; stroke: ${CONFIG.fill}; stroke-width: 0.5; stroke-linejoin: round; }
        .cc-arrow .cc-h rect { fill: ${CONFIG.fill}; }
        .cc-arrow .cc-m circle { fill: rgba(${CONFIG.glow}, 0.18); stroke: ${CONFIG.fill}; stroke-width: 1.7; }
        .cc-arrow .cc-m line   { stroke: ${CONFIG.fill}; stroke-width: 2.8; stroke-linecap: round; }
        .cc-arrow .cc-h line { stroke: #202020; stroke-width: 0.55; stroke-linecap: round; opacity: 0.4; }
        .cc-arrow .cc-t path { fill: none; stroke: ${CONFIG.fill}; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
        .cc-arrow .cc-g path,
        .cc-arrow .cc-gr path { fill: ${CONFIG.fill}; stroke: ${CONFIG.fill}; stroke-width: 0.7; stroke-linejoin: round; }
        .cc-arrow .cc-g line,
        .cc-arrow .cc-gr line { stroke: #202020; stroke-width: 0.55; stroke-linecap: round; opacity: 0.4; }
        .cc-arrow .cc-g .cc-detail,
        .cc-arrow .cc-gr .cc-detail { fill: none; stroke: #202020; stroke-width: 0.55; stroke-linecap: round; opacity: 0.4; }

        .cc-arrow.is-hover .cc-a,
        .cc-arrow.is-zoom .cc-a,
        .cc-arrow.is-text .cc-a,
        .cc-arrow.is-grab .cc-a,
        .cc-arrow.is-grabbing .cc-a { opacity: 0; transform: scale(0.85); }
        .cc-arrow.is-zoom .cc-m  { opacity: 1; transform: scale(${CONFIG.hoverScale}); }
        .cc-arrow.is-zoom .cc-h  { opacity: 0; }
        .cc-arrow.is-hover .cc-h { opacity: 1; transform: scale(${CONFIG.hoverScale}); }
        .cc-arrow.is-text .cc-t,
        .cc-arrow.is-grab .cc-g,
        .cc-arrow.is-grabbing .cc-gr { opacity: 1; transform: scale(1); }
        .cc-arrow.is-text .cc-h,
        .cc-arrow.is-text .cc-m,
        .cc-arrow.is-grab .cc-h,
        .cc-arrow.is-grab .cc-m,
        .cc-arrow.is-grabbing .cc-g,
        .cc-arrow.is-grabbing .cc-h,
        .cc-arrow.is-grabbing .cc-m { opacity: 0; }
        .cc-arrow.is-down .cc-a  { transform: scale(${CONFIG.pressScale}); }
        .cc-arrow.is-down .cc-h,
        .cc-arrow.is-down .cc-m,
        .cc-arrow.is-down .cc-t,
        .cc-arrow.is-down .cc-g,
        .cc-arrow.is-down .cc-gr { transform: scale(${CONFIG.pressScale}); }

        .cc-fx {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2147483646;
        }
    `;
    document.head.appendChild(style);

    const arrow = document.createElement("div");
    arrow.className = "cc-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.innerHTML =
        '<svg class="cc-a" viewBox="0 0 24 24"><path d="M3 2 L3 17.6 L6.9 14.1 L9.5 20 L11.9 18.9 L9.3 13.1 L14.4 13.1 Z"/></svg>' +
        '<svg class="cc-h" viewBox="0 0 24 24">' +
            '<rect x="8.8" y="1.6" width="3.2" height="12" rx="1.6"/>' +
            '<rect x="12" y="8.4" width="3" height="7" rx="1.5"/>' +
            '<rect x="14.8" y="9.2" width="3" height="7" rx="1.5"/>' +
            '<rect x="17.6" y="10.2" width="2.9" height="6.5" rx="1.45"/>' +
            '<rect x="8.8" y="11" width="11.7" height="10" rx="4"/>' +
            '<rect x="4.6" y="11.8" width="6.4" height="3.2" rx="1.6" transform="rotate(24 7.8 13.4)"/>' +
            '<line x1="12" y1="12" x2="12" y2="15.4"/><line x1="14.8" y1="12.6" x2="14.8" y2="15.8"/><line x1="17.6" y1="13.2" x2="17.6" y2="16.2"/>' +
        '</svg>' +
        '<svg class="cc-m" viewBox="0 0 24 24">' +
            '<circle cx="9.5" cy="9.5" r="6"/>' +
            '<line x1="14.4" y1="14.4" x2="20" y2="20"/>' +
        '</svg>' +
        '<svg class="cc-t" viewBox="0 0 24 24">' +
        '<path d="M8 4.8c1.5 0 2 .9 4 1 2-.1 2.5-1 4-1M12 5.8v12.4M8 19.2c1.5 0 2-.9 4-1 2 .1 2.5 1 4 1"/>' +
        '</svg>' +
        '<svg class="cc-g" viewBox="0 0 24 24">' +
        '<path d="M7.5 11V6.2a1.6 1.6 0 0 1 3.2 0v3.1-4.6a1.6 1.6 0 0 1 3.2 0v4.4-3.3a1.6 1.6 0 0 1 3.2 0v4.1-2a1.6 1.6 0 0 1 3.2 0v6.7c0 4.1-2.8 7-6.7 7h-1.4c-2.1 0-3.4-.8-4.6-2.3L4.1 14a1.8 1.8 0 0 1 2.6-2.5L9 13.8"/>' +
        '<line x1="11.4" y1="7.7" x2="11.4" y2="9.3"/><line x1="14.7" y1="7.7" x2="14.7" y2="9.3"/><line x1="18" y1="8.3" x2="18" y2="9.8"/>' +
        '<path class="cc-detail" d="M11.2 15.2c1 .4 1.7 1.1 2 2.1"/><path class="cc-detail" d="M15 14.8c.8.3 1.4.8 1.8 1.5"/>' +
        '</svg>' +
        '<svg class="cc-gr" viewBox="0 0 24 24">' +
        '<path d="M7.5 10.5V7.2a1.7 1.7 0 0 1 3.4 0v2.3-3.7a1.7 1.7 0 0 1 3.4 0v3.7-2.4a1.7 1.7 0 0 1 3.4 0v2.7-1.2a1.7 1.7 0 0 1 3.4 0v5.1c0 4.5-2.9 7.5-7.3 7.5h-1.1c-2.1 0-3.7-.8-4.9-2.3l-3.2-4a1.8 1.8 0 0 1 2.8-2.3l2.1 2.1"/>' +
        '<line x1="11.6" y1="7.7" x2="11.6" y2="9.3"/><line x1="15" y1="7.7" x2="15" y2="9.3"/><line x1="18.4" y1="8.4" x2="18.4" y2="9.9"/>' +
        '<path class="cc-detail" d="M11.4 14.8c1 .4 1.8 1.2 2.1 2.2"/><path class="cc-detail" d="M15.3 14.4c.8.3 1.4.8 1.8 1.6"/>' +
        '</svg>';
    document.body.appendChild(arrow);

    const useFx = !reduceMotion && (CONFIG.sparkles || CONFIG.clickPulse);
    let ctx = null, w = 0, h = 0, dpr = 1;
    const sparks = [], pulses = [];
    let running = false;
    const rand = (a, b) => a + Math.random() * (b - a);

    if (useFx) {
        const fx = document.createElement("canvas");
        fx.className = "cc-fx";
        fx.setAttribute("aria-hidden", "true");
        document.body.appendChild(fx);
        ctx = fx.getContext("2d");
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth; h = window.innerHeight;
            fx.width = Math.round(w * dpr); fx.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener("resize", resize);
    }

    function drawStar(x, y, r, rot) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.fill(); ctx.restore();
    }

    function frame(now) {
        ctx.clearRect(0, 0, w, h);
        for (let i = sparks.length - 1; i >= 0; i--) {
            const p = sparks[i];
            const age = (now - p.born) / p.life;
            if (age >= 1) { sparks.splice(i, 1); continue; }
            p.x += p.vx; p.y += p.vy; p.rot += p.spin;
            ctx.fillStyle = `rgba(${p.rgb},${(Math.sin(Math.min(1, age * 1.15) * Math.PI) * 0.85).toFixed(3)})`;
            drawStar(p.x, p.y, p.r * (1 - age * 0.5), p.rot);
        }
        for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i];
            const age = (now - p.born) / 480;
            if (age >= 1) { pulses.splice(i, 1); continue; }
            const ease = 1 - Math.pow(1 - age, 3);
            ctx.strokeStyle = `rgba(${CONFIG.glow},${((1 - age) * 0.55).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4 + ease * 22, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (!sparks.length && !pulses.length) { running = false; ctx.clearRect(0, 0, w, h); return; }
        requestAnimationFrame(frame);
    }
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };


    let seen = false, shown = false;
    let last = { x: -100, y: -100 };
    let pointerPosition = null;

    function setShown(on) {
        if (on === shown) return;
        shown = on;
        arrow.classList.toggle("is-on", on);
    }

    function applyTarget(el) {
        if (!el || el.nodeType !== 1) return;
        if (el.tagName === "IFRAME") { setShown(false); return; }
        const zoom = !!el.closest("[data-spot]");
        const grab = !zoom && !!el.closest(GRABBABLE);
        const interactive = !zoom && !grab && !!el.closest(INTERACTIVE);
        const text = !zoom && !grab && !interactive && !!el.closest(TEXTY);
        arrow.classList.toggle("is-zoom", zoom);
        arrow.classList.toggle("is-hover", interactive);
        arrow.classList.toggle("is-grab", grab);
        arrow.classList.toggle("is-grabbing", grab && arrow.classList.contains("is-down"));
        arrow.classList.toggle("is-text", text);
        if (seen) setShown(true);
    }

    window.addEventListener("pointermove", (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        pointerPosition = { x: e.clientX, y: e.clientY };
        arrow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;

        if (!seen) {
            seen = true;
            last = { x: e.clientX, y: e.clientY };
            document.documentElement.classList.add("cc");
            applyTarget(e.target);
        }
        if (!shown) applyTarget(e.target);

        if (useFx && CONFIG.sparkles) {
            const dx = e.clientX - last.x, dy = e.clientY - last.y;
            if (dx * dx + dy * dy > CONFIG.sparkleEvery * CONFIG.sparkleEvery) {
                if (sparks.length > 36) sparks.shift();
                sparks.push({
                    x: e.clientX + rand(-6, 6), y: e.clientY + rand(-6, 6),
                    vx: rand(-0.12, 0.12), vy: rand(0.05, 0.28),
                    r: rand(2.4, 5), rot: rand(0, Math.PI), spin: rand(-0.02, 0.02),
                    born: performance.now(), life: rand(650, 950),
                    rgb: Math.random() < 0.7 ? CONFIG.glow : CONFIG.glowSoft
                });
                last = { x: e.clientX, y: e.clientY };
                kick();
            }
        }
    }, { passive: true });

    document.addEventListener("pointerover", (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        applyTarget(e.target);
    }, { passive: true });

    const butterfly = document.querySelector(".art-butterfly-hybrid");
    if (butterfly) {
        new MutationObserver(() => {
            if (!pointerPosition) return;
            const target = document.elementFromPoint(pointerPosition.x, pointerPosition.y);
            if (target?.closest(".art-butterfly-hybrid")) applyTarget(target);
        }).observe(butterfly, { attributes: true, attributeFilter: ["class"] });
    }

    document.addEventListener("pointerdown", (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        applyTarget(e.target);
        arrow.classList.add("is-down");
        if (e.target.closest?.(GRABBABLE)) arrow.classList.add("is-grabbing");
        if (useFx && CONFIG.clickPulse && shown) {
            pulses.push({ x: e.clientX, y: e.clientY, born: performance.now() });
            kick();
        }
    }, { passive: true });

    const release = () => {
        arrow.classList.remove("is-down", "is-grabbing");
    };
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("blur", () => { release(); setShown(false); });
    document.documentElement.addEventListener("pointerleave", () => setShown(false));
    document.documentElement.addEventListener("pointerenter", () => { if (seen) setShown(true); });
})();