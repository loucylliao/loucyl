/* =========================================
   ASCII ANIMATION LOADER
   ========================================= */
function loadAsciiAnimation(jsonPath, elementId, frameDuration) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(frames => {
            const preElement = document.getElementById(elementId);
            if (!preElement) return;

            let currentFrame = 0;

            function renderFrame() {
                preElement.textContent = frames[currentFrame].join('\n');
                currentFrame = (currentFrame + 1) % frames.length;
            }

            renderFrame();
            setInterval(renderFrame, frameDuration);
        })
        .catch(error => console.error(`Error loading ${jsonPath}:`, error));
}

loadAsciiAnimation('addons/ascii-frames.json', 'ascii-animation', 100);
loadAsciiAnimation('addons/butterfly_ascii.json', 'butterfly-animation', 122);


const artScene = document.getElementById("art-butterfly-scene");

if (artScene && "IntersectionObserver" in window) {
    const hints = artScene.querySelectorAll(".hint");

    new IntersectionObserver(([entry]) => {
        hints.forEach((h) => h.classList.toggle("is-visible", entry.isIntersecting));
    }, { threshold: 0.6 }).observe(artScene);
}

/* =========================================
   BOOKSHELF
   ========================================= */
(function () {
    const shelf = document.querySelector('.shelf');
    if (!shelf) return;

    const caption = document.getElementById('shelf-caption');
    const books   = shelf.querySelectorAll('.book');

    books.forEach(book => {
        book.addEventListener('click', () => {
            if (book.classList.contains('is-front')) return;

            books.forEach(b => b.classList.remove('is-front'));
            book.classList.add('is-front');

            if (caption) {
                caption.textContent = `${book.dataset.title} — ${book.dataset.author}`;
            }
        });
    });
})();

/* =========================================
   FOOTER — LIVE CLOCK
   ========================================= */
(function () {
    const el = document.getElementById('footer-clock');
    if (!el) return;

    function tick() {
        const now  = new Date();
        const utc8 = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);

        let h = utc8.getHours();
        const m = String(utc8.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;

        el.textContent = `${h}:${m} ${ampm}`;
    }

    tick();
    setInterval(tick, 15000);
})();

/* =========================================
   SIDEBAR — LIVE CLOCK
   ========================================= */
(function () {
    const el = document.getElementById('sidebar-clock');
    if (!el) return;

    function tick() {
        const now  = new Date();
        const utc8 = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);

        const h = String(utc8.getHours()).padStart(2, '0');
        const m = String(utc8.getMinutes()).padStart(2, '0');
        const s = String(utc8.getSeconds()).padStart(2, '0');

        el.textContent = `${h}:${m}:${s}`;
    }

    tick();
    setInterval(tick, 1000);
})();


/* =========================================
   SIDEBAR — ACTIVE SECTION
   ========================================= */
(function () {
    const navItems = document.querySelectorAll('.sidebar .nav-item[data-section]');
    if (!navItems.length) return;

    const sections = Array.from(navItems)
        .map((item) => document.getElementById(item.dataset.section))
        .filter(Boolean);
    if (!sections.length) return;

    const COLLAPSE_MS = 280;
    const DEBOUNCE_MS = 180;

    const visible = new Map();
    sections.forEach((s) => visible.set(s.id, 0));

    let currentId = null;
    let pendingId = null;
    let debounceTimer = null;
    let expandTimer = null;

    function collapseAll() {
        navItems.forEach((item) => item.classList.remove('is-active'));
    }

    function expand(id) {
        const el = document.querySelector(`.sidebar .nav-item[data-section="${id}"]`);
        if (el) el.classList.add('is-active');
        currentId = id;
    }

    function apply(id) {
        if (id === currentId) return;
        clearTimeout(expandTimer);
        collapseAll();
        expandTimer = setTimeout(() => expand(id), COLLAPSE_MS);
    }

    function update() {
        let bestId = null;
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
            if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
        });
        if (!bestId || bestId === currentId || bestId === pendingId) return;

        pendingId = bestId;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const id = pendingId;
            pendingId = null;
            apply(id);
        }, DEBOUNCE_MS);
    }

    const io = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                visible.set(entry.target.id, entry.intersectionRatio);
            });
            update();
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((s) => io.observe(s));

    const first = document.querySelector('.sidebar .nav-item[data-section="intro"]');
    if (first) first.classList.add('is-active');
    currentId = 'intro';
})();

/* =========================================
   POPUP SHEET
   ========================================= */
(function () {
    const sheet     = document.getElementById('project-sheet');
    const crumb     = document.getElementById('project-sheet-crumb');
    const bannerFig = document.getElementById('project-sheet-banner-figure');
    const bannerImg = document.getElementById('project-sheet-banner');
    const bannerIfr = document.getElementById('project-sheet-iframe');
    const sandbox   = document.getElementById('project-sheet-sandbox');
    const scrollEl  = sheet?.querySelector('.project-sheet-scroll');
    const panel     = sheet?.querySelector('.project-sheet-panel');
    const fsBtn     = document.getElementById('project-sheet-fs');
    const sheetBar  = document.getElementById('sheet-progress-bar');

    if (!sheet) return;

    const BANNERS = {
        memoir: {
            kind: 'iframe',
            src:  'projects/memoir/index.html',
        },
        algebrawl: {
            kind: 'iframe',
            src:  'https://algebrawl.vercel.app',
        }
    };

    const projectSections = sheet.querySelectorAll('.project-section');

    function sizePreviewIframe() {
        if (!bannerFig || !bannerIfr) return;
        const w = bannerFig.clientWidth;
        if (!w) return;
        const base = bannerIfr.offsetWidth || 1920;
        bannerFig.style.setProperty('--preview-scale', w / base);
    }

    window.addEventListener('resize', sizePreviewIframe);

    function resetSheetBar() {
        if (sheetBar) sheetBar.style.transform = 'scaleX(0)';
    }

    /* biography section indicator */
    let bioProgress = null;

    function buildBioProgress() {
        const bioSection = sheet.querySelector('.project-section[data-section="biography"]');
        if (!bioSection) return null;

        const wrappers = bioSection.querySelectorAll('.project-body-section');
        if (!wrappers.length) return null;

        const el = document.createElement('aside');
        el.className = 'bio-progress';
        el.setAttribute('aria-hidden', 'true');

        const ol = document.createElement('ol');
        ol.className = 'bio-progress-list';

        wrappers.forEach((wrap, i) => {
            const title = wrap.querySelector('.project-section-title');
            if (!title) return;
            const raw = title.textContent.trim();
            const sp = raw.indexOf(' ');
            const name = sp > -1 ? raw.slice(sp + 1) : raw;

            const li = document.createElement('li');
            li.className = 'bio-progress-item';
            li.dataset.bioIndex = i;
            li.innerHTML =
                `<span class="bio-progress-name">${name}</span>` +
                `<span class="bio-progress-line"><span class="bio-progress-fill"></span></span>`;

            li.addEventListener('click', () => {
                const target = wrappers[i];
                const top = target.getBoundingClientRect().top
                          - scrollEl.getBoundingClientRect().top
                          + scrollEl.scrollTop - 60;
                scrollEl.scrollTo({ top, behavior: 'smooth' });
            });

            ol.appendChild(li);
        });

        el.appendChild(ol);
        sheet.appendChild(el);

        return {
            el,
            items: Array.from(el.querySelectorAll('.bio-progress-item')),
            fills: Array.from(el.querySelectorAll('.bio-progress-fill')),
            wrappers: Array.from(wrappers),
        };
    }

    function updateBioProgress() {
        if (!bioProgress || !scrollEl) return;

        const rect = scrollEl.getBoundingClientRect();
        const line = rect.top + rect.height * 0.38;

        const atEnd =
            scrollEl.scrollTop + scrollEl.clientHeight >=
            scrollEl.scrollHeight - 2;

        bioProgress.wrappers.forEach((wrap, i) => {
            const sr = wrap.getBoundingClientRect();
            const item = bioProgress.items[i];
            const fill = bioProgress.fills[i];

            const h = sr.height || 1;
            const raw = (line - sr.top) / h;

            const isLast = i === bioProgress.wrappers.length - 1;
            const forced = isLast && atEnd;

            const p = forced ? 1 : Math.max(0, Math.min(1, raw));
            fill.style.transform = `scaleX(${p})`;

            const isActive = forced || (line >= sr.top && line < sr.bottom);
            const isPast   = !forced && line >= sr.bottom;

            item.classList.toggle('is-active', isActive);
            item.classList.toggle('is-past', isPast && !isActive);
        });
    }

    if (scrollEl) {
        let ticking = false;
        scrollEl.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                if (sheetBar) {
                    const max = scrollEl.scrollHeight - scrollEl.clientHeight;
                    const p = max > 0 ? Math.min(1, Math.max(0, scrollEl.scrollTop / max)) : 0;
                    sheetBar.style.transform = `scaleX(${p})`;
                }
                updateBioProgress();
                ticking = false;
            });
        }, { passive: true });

        window.addEventListener('resize', () => {
            if (sheetBar) {
                const max = scrollEl.scrollHeight - scrollEl.clientHeight;
                const p = max > 0 ? Math.min(1, Math.max(0, scrollEl.scrollTop / max)) : 0;
                sheetBar.style.transform = `scaleX(${p})`;
            }
            updateBioProgress();
        });
    }

    /* full screen mode */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let fsTimer  = null;
    let fsCancel = null;

    function clearFsEntering() {
        clearTimeout(fsTimer);
        if (fsCancel) { fsCancel(); fsCancel = null; }
        sheet.classList.remove('is-fs-leaving', 'is-fs-entering');
    }

    function applyFullscreen(on) {
        sheet.classList.toggle('project-sheet--fullscreen', on);
        document.body.classList.toggle('sheet-fullscreen', on);
        document.documentElement.classList.toggle('sheet-fullscreen', on);
        if (fsBtn) {
            fsBtn.setAttribute('aria-pressed', String(on));
            fsBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Enter full screen');
        }
        if (scrollEl) scrollEl.scrollTop = 0;
        resetSheetBar();
        updateBioProgress();
    }

    function setFullscreen(on, animate = false) {
        const wasOn = isFullscreen();
        clearFsEntering();

        const smooth = on && !wasOn && animate && !reduceMotion.matches
                       && !sheet.hidden && panel;
        if (!smooth) { applyFullscreen(on); return; }

        sheet.classList.add('is-fs-leaving');

        let done = false;
        const go = () => {
            if (done) return;
            done = true;
            clearTimeout(fsTimer);
            panel.removeEventListener('animationend', onEnd);
            fsCancel = null;

            sheet.classList.remove('is-fs-leaving');
            sheet.classList.add('is-fs-entering');
            applyFullscreen(true);
            fsTimer = setTimeout(clearFsEntering, 1500);
        };
        const onEnd = (e) => { if (e.animationName === 'project-sheet-out') go(); };

        panel.addEventListener('animationend', onEnd);
        fsCancel = () => { done = true; panel.removeEventListener('animationend', onEnd); };
        fsTimer = setTimeout(go, 650);
    }

    function isFullscreen() {
        return sheet.classList.contains('project-sheet--fullscreen');
    }

    if (fsBtn) fsBtn.addEventListener('click', () => {
        if (sheet.classList.contains('is-fs-leaving')) return;
        setFullscreen(!isFullscreen(), true);
    });

    function fill(id) {
        const banner = BANNERS[id];
        const isBiography = id === 'biography';

        sheet.dataset.active = id;

        projectSections.forEach((s) => {
            s.hidden = s.dataset.section !== id;
        });

        if (sandbox) sandbox.hidden = isBiography;

        if (isBiography) {
            if (!bioProgress) bioProgress = buildBioProgress();
            updateBioProgress();
            return;
        }

        if (banner?.kind === 'iframe') {
            if (bannerIfr.dataset.loaded !== banner.src) {
                bannerIfr.src = banner.src;
                bannerIfr.dataset.loaded = banner.src;
            }
            bannerFig.dataset.mode = 'preview';
            sizePreviewIframe();
        } else if (banner) {
            bannerImg.src = banner.src;
            bannerImg.alt = banner.alt || '';
            bannerFig.dataset.mode = 'image';
        }
    }

    function open(id) {
        sheet.classList.remove('is-closing');
        bannerFig?.classList.remove('is-closing');

        fill(id);

        const canFullscreen = sheet.querySelector(
            '.project-section:not([hidden])'
        )?.hasAttribute('data-sheet-fullscreen');
        if (fsBtn) fsBtn.hidden = !canFullscreen;
        setFullscreen(false);

        const visibleSection = sheet.querySelector('.project-section:not([hidden])');
        if (crumb && visibleSection) {
            crumb.textContent = visibleSection.dataset.crumb
                || visibleSection.dataset.section
                || '';
        }

        sheet.hidden = false;
        document.body.classList.add('project-sheet-open');

        if (scrollEl) scrollEl.scrollTop = 0;
        resetSheetBar();

        if (typeof lenis !== 'undefined' && lenis) lenis.stop();

        requestAnimationFrame(() => {
            panel?.focus?.();
            sizePreviewIframe();
            updateBioProgress();
        });
    }

    function close() {
        if (sheet.classList.contains('is-closing')) return;
        clearFsEntering();

        bannerFig?.classList.add('is-closing');
        sheet.classList.add('is-closing');

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;

            clearFsEntering();
            sheet.classList.remove('is-closing');
            sheet.hidden = true;
            document.body.classList.remove('project-sheet-open');
            document.body.classList.remove('sheet-fullscreen');
            sheet.classList.remove('project-sheet--fullscreen');
            bannerFig?.classList.remove('is-closing');

            delete sheet.dataset.active;

            if (scrollEl) scrollEl.scrollTop = 0;
            resetSheetBar();

            if (typeof lenis !== 'undefined' && lenis) lenis.start();
            try { bannerIfr.contentWindow.scrollTo(0, 0); } catch {}
        };

        panel.addEventListener('animationend', function handler(e) {
            if (e.animationName !== 'project-sheet-out') return;
            panel.removeEventListener('animationend', handler);
            finish();
        });

        setTimeout(finish, 520);
    }

    document.querySelectorAll('[data-project]').forEach((el) => {
        el.addEventListener('click', () => open(el.dataset.project));
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open(el.dataset.project);
            }
        });
    });

    sheet.addEventListener('wheel', (e) => {
        if (!isFullscreen() || !scrollEl || scrollEl.contains(e.target)) return;
        scrollEl.scrollTop += e.deltaY;
        e.preventDefault();
    }, { passive: false });

    sheet.addEventListener('click', (e) => {
        if (e.target.closest('[data-project-close]')) close();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || sheet.hidden) return;
        if (isFullscreen()) setFullscreen(false);
        else close();
    });
})();

/* =========================================
   FLOATING CURSOR
   ========================================= */
(function () {
    const terminal = document.querySelector('.terminal--preview');
    if (!terminal) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const small = window.matchMedia('(max-width: 700px)').matches;

    const NAME     = 'loucyl';
    const PAD_L    = small ? 40 : 480;
    const PAD_R    = small ? 40 : 60;
    const PAD_Y    = 200;
    const LABEL_W  = 58;
    const LABEL_H  = 24;
    const FLEE_R   = 140;
    const FLEE_K   = 2.4;
    const SPRING_K = 0.012;
    const DAMPING  = 0.88;
    const DRIFT_L  = small ? 26 : 380;
    const DRIFT_R  = small ? 26 :  40;
    const DRIFT_Y  = small ? 18 :  26;

    const field = document.createElement('div');
    field.className = 'cursor-field';
    field.setAttribute('aria-hidden', 'true');
    field.style.inset = `${-PAD_Y}px ${-PAD_R}px ${-PAD_Y}px ${-PAD_L}px`;
    terminal.appendChild(field);

    const el = document.createElement('div');
    el.className = 'fake-cursor';
    el.innerHTML =
        '<svg viewBox="0 0 16 16"><path d="M1.5 1.5 L1.5 13 L5 9.8 L7.6 15 L9.9 14 L7.4 8.9 L12.4 8.9 Z"/></svg>' +
        `<span>${NAME}</span>`;
    field.appendChild(el);

    let fw = 0, fh = 0, home = { x: 0, y: 0 };

    function measure() {
        const w = terminal.offsetWidth;
        const h = terminal.offsetHeight;
        fw = w + PAD_L + PAD_R;
        fh = h + PAD_Y * 2;
        home = { x: PAD_L + w * 0.72, y: PAD_Y + h * 0.42 };
    }
    measure();
    window.addEventListener('resize', measure);

    const pos = { x: home.x, y: home.y };
    const vel = { x: 0, y: 0 };

    const mouse = { x: -9999, y: -9999 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
        mouse.x = mouse.y = -9999;
    });

    let raf = null;
    let last = 0;

    function frame(now) {
        const dt = Math.min((now - (last || now)) / 16.67, 3);
        last = now;

        const driftS = Math.sin(now * 0.000175);
        const driftX = driftS < 0 ? driftS * DRIFT_L : 0;

        const floatX = Math.sin(now * 0.0007) * 26;
        const floatY = Math.cos(now * 0.0009) * DRIFT_Y;

        const tx = home.x + driftX + floatX;
        const ty = home.y + floatY;

        vel.x += (tx - pos.x) * SPRING_K * dt;
        vel.y += (ty - pos.y) * SPRING_K * dt;

        const r  = field.getBoundingClientRect();
        const cx = r.left + pos.x + 6;
        const cy = r.top  + pos.y + 6;
        const dx = cx - mouse.x;
        const dy = cy - mouse.y;
        const d  = Math.hypot(dx, dy);

        if (d < FLEE_R) {
            const push = Math.pow(1 - d / FLEE_R, 1.5) * FLEE_K * dt;
            const nx = d > 0.01 ? dx / d : 1;
            const ny = d > 0.01 ? dy / d : 0;
            vel.x += nx * push;
            vel.y += ny * push;
        }

        const damp = Math.pow(DAMPING, dt);
        vel.x *= damp;
        vel.y *= damp;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;

        const maxX = fw - LABEL_W;
        const maxY = fh - LABEL_H;
        if (pos.x < 0)    { pos.x = 0;    vel.x *= -0.4; }
        if (pos.x > maxX) { pos.x = maxX; vel.x *= -0.4; }
        if (pos.y < 0)    { pos.y = 0;    vel.y *= -0.4; }
        if (pos.y > maxY) { pos.y = maxY; vel.y *= -0.4; }

        const tilt = Math.max(-22, Math.min(22, vel.x * 3));

        el.style.transform =
            `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${tilt}deg)`;

        raf = requestAnimationFrame(frame);
    }

    new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !raf) {
            last = 0;
            raf = requestAnimationFrame(frame);
        } else if (!entry.isIntersecting && raf) {
            cancelAnimationFrame(raf);
            raf = null;
        }
    }, { rootMargin: '200px' }).observe(terminal);

    function reveal() {
        setTimeout(() => field.classList.add('is-ready'), 600);
    }
    if (document.readyState === 'complete') {
        reveal();
    } else {
        window.addEventListener('load', reveal);
    }
})();

/* =========================================
   MOBILE TOPBAR
   ========================================= */
(function () {
    const btn     = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const scrim   = document.getElementById('sidebar-scrim');
    const bar     = document.getElementById('mobile-progress-bar');
    const pageBar = document.getElementById('page-progress-bar');
    if (!btn || !sidebar) return;

    const mq     = window.matchMedia('(max-width: 1023px)');
    const TOPBAR = 48;
    const isOpen = () => document.body.classList.contains('sidebar-open');

    function setOpen(open) {
        document.body.classList.toggle('sidebar-open', open);
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (typeof lenis !== 'undefined' && lenis) {
            open ? lenis.stop() : lenis.start();
        }
    }

    btn.addEventListener('click', () => setOpen(!isOpen()));
    scrim?.addEventListener('click', () => setOpen(false));
    sidebar.querySelector('.sidebar-close')?.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen()) setOpen(false);
    });

    mq.addEventListener('change', (e) => { if (!e.matches && isOpen()) setOpen(false); });

    sidebar.querySelectorAll('.nav-list a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href').slice(1);
            const target = document.getElementById(id === 'home' ? 'intro' : id);
            if (!target) return;
            e.preventDefault();
            setOpen(false);
            const offset = mq.matches ? -TOPBAR : 0;
            if (typeof lenis !== 'undefined' && lenis) lenis.scrollTo(target, { offset });
            else target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    if (bar || pageBar) {
        let ticking = false;
        const update = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
            const t = `scaleX(${p})`;
            if (bar) bar.style.transform = t;
            if (pageBar) pageBar.style.transform = t;
            ticking = false;
        };
        window.addEventListener('scroll', () => {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        window.addEventListener('resize', update);
        update();
    }
})();

/* =========================================
   SMOOTH SCROLL
   ========================================= */
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

if (typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);
}
if (typeof gsap !== 'undefined') {
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

/* =========================================
   NAV SPOTLIGHT
   ========================================= */
(function () {
    const main = document.querySelector('.main-content');
    const subItems = document.querySelectorAll('.sidebar .sub-nav > li[data-spot]');
    if (!main || !subItems.length) return;
    if (!window.matchMedia('(min-width: 1024px) and (hover: hover)').matches) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const layer = document.createElement('div');
    layer.className = 'nav-spotlight-layer';
    layer.setAttribute('aria-hidden', 'true');
    const glow = document.createElement('div');
    glow.className = 'nav-spotlight';
    layer.appendChild(glow);
    main.insertBefore(layer, main.firstChild);

    const DEFAULT_SPOT = '#about .her-button';

    const MIN = 120;
    const MAX = 300;
    const ROAM_MAX = 60;
    const ROAM_MIN = 14;
    const ROAM_SPEED_X = 0.0009;
    const ROAM_SPEED_Y = 0.0013;

    let currentSelector = null;
    let hideTimer = null;

    let raf = 0, t0 = 0;
    let ax = 0, ay = 0;
    let tx = 0, ty = 0;

    function loop(now) {
        if (!t0) t0 = now;
        const t = now - t0;
        ax += (tx - ax) * 0.04;
        ay += (ty - ay) * 0.04;
        glow.style.setProperty('--wx', (Math.sin(t * ROAM_SPEED_X) * ax).toFixed(2) + 'px');
        glow.style.setProperty('--wy', (Math.sin(t * ROAM_SPEED_Y + 1.2) * ay).toFixed(2) + 'px');
        raf = requestAnimationFrame(loop);
    }

    function startRoam() {
        if (reduceMotion || raf) return;
        t0 = 0; ax = ay = 0;
        raf = requestAnimationFrame(loop);
    }

    function stopRoam() {
        cancelAnimationFrame(raf);
        raf = 0;
    }

    function measure(selector) {
        const els = document.querySelectorAll(selector);
        if (!els.length) return null;
        const base = layer.getBoundingClientRect();
        let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        els.forEach((el) => {
            const rc = el.getBoundingClientRect();
            if (!rc.width && !rc.height) return;
            l = Math.min(l, rc.left);  t = Math.min(t, rc.top);
            r = Math.max(r, rc.right); b = Math.max(b, rc.bottom);
        });
        if (l === Infinity) return null;
        return {
            cx: (l + r) / 2 - base.left,
            cy: (t + b) / 2 - base.top,
            w: r - l,
            h: b - t,
            size: Math.min(MAX, Math.max(MIN, Math.max(r - l, b - t) * 0.9)),
        };
    }

    function placeAt(selector) {
        const m = measure(selector);
        if (!m) return false;
        glow.style.width = glow.style.height = m.size + 'px';
        glow.style.transform = `translate3d(${m.cx - m.size / 2}px, ${m.cy - m.size / 2}px, 0)`;
        tx = Math.min(ROAM_MAX, Math.max(ROAM_MIN, m.w * 0.25));
        ty = Math.min(ROAM_MAX, Math.max(ROAM_MIN, m.h * 0.25));
        return true;
    }

    function showSelector(selector) {
        clearTimeout(hideTimer);

        const wasOn = glow.classList.contains('is-on');
        const isTeleport = !wasOn || currentSelector === null;

        if (isTeleport) glow.classList.add('is-teleport');
        if (!placeAt(selector)) {
            glow.classList.remove('is-on');
            return;
        }
        currentSelector = selector;

        if (isTeleport) {
            void glow.offsetWidth;
            glow.classList.remove('is-teleport');
        }
        glow.classList.add('is-on');
        startRoam();
    }

    function showDefault() {
        glow.classList.add('is-returning');
        showSelector(DEFAULT_SPOT);
    }

    function hide() {
        hideTimer = setTimeout(showDefault, 260);
    }

    subItems.forEach((item) => {
        item.addEventListener('mouseenter', () => {
            glow.classList.remove('is-returning');
            showSelector(item.dataset.spot);
        });
        item.addEventListener('mouseleave', hide);
    });

    let scrollRaf = 0;
    window.addEventListener('scroll', () => {
        if (currentSelector !== DEFAULT_SPOT) return;
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => {
            scrollRaf = 0;
            if (currentSelector !== DEFAULT_SPOT) return;
            placeAt(DEFAULT_SPOT);
        });
    }, { passive: true });

    window.addEventListener('resize', () => {
        if (currentSelector) placeAt(currentSelector);
    });

    requestAnimationFrame(showDefault);
})();


/* =========================================
   SHELF SPOTLIGHT
   ========================================= */
(function () {
    const light = document.querySelector('.shelf-spotlight');
    if (!light) return;

    const lightUp = () => {
        light.classList.remove('is-armed');
        light.classList.add('is-igniting');
        light.addEventListener('animationend', () => {
            light.classList.remove('is-igniting');
            light.classList.add('is-lit');
        }, { once: true });
    };

    if (!('IntersectionObserver' in window)) return;

    light.classList.add('is-armed');
    const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setTimeout(lightUp, 350);
    }, { threshold: 0.5 });
    io.observe(light.parentElement);
})();