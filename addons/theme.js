(() => {
    const KEY = "loucyl-theme";
    const root = document.documentElement;
    const metaColor = document.querySelector('meta[name="theme-color"]');
    const META = { dark: "#d0afc0", light: "#fbf5f7" };

    
    const FRONT_BOOK = { dark: ".book-alittlelife", light: ".book-ineverpromised" };

    function faceBook(theme) {
        const shelf = document.querySelector(".shelf");
        const next = shelf && shelf.querySelector(FRONT_BOOK[theme]);
        if (!next || next.classList.contains("is-front")) return;
        shelf.querySelectorAll(".book.is-front").forEach((b) => b.classList.remove("is-front"));
        next.classList.add("is-front");
        const caption = document.getElementById("shelf-caption");
        if (caption) caption.textContent = `${next.dataset.title} \u2014 ${next.dataset.author}`;
    }

    const isLight = () => root.getAttribute("data-theme") === "light";

    function saved() {
        try { return localStorage.getItem(KEY); } catch (_) { return null; }
    }

    function sync() {
        const light = isLight();
        const btn = document.getElementById("theme-toggle");
        if (btn) {
            btn.setAttribute("aria-checked", light ? "true" : "false");
            const label = btn.querySelector(".theme-toggle__label");
            if (label) label.textContent = light ? "light" : "dark";
        }
        if (metaColor) metaColor.setAttribute("content", light ? META.light : META.dark);
    }

    function apply(theme) {
        if (theme === "light") root.setAttribute("data-theme", "light");
        else root.removeAttribute("data-theme");
        try { localStorage.setItem(KEY, theme); } catch (_) {}
        sync();
        faceBook(theme);
        window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
    }

    if (saved() === "light") root.setAttribute("data-theme", "light");
    if (saved() === "light") faceBook("light");

    window.LoucylTheme = { isLight };

    const btn = document.getElementById("theme-toggle");
    if (btn) btn.addEventListener("click", () => apply(isLight() ? "dark" : "light"));
    sync();
})();