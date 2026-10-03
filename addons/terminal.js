import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.mjs";

const SHELL_PROMPT   = "loucyl@admin: ~";
const LOADING_SUFFIX = "fetching";
const README_TEXT    = "test out my cli programs here :)";

const mq = window.matchMedia("(max-width: 1023px)");
const isMobile = () => mq.matches;

let pyodide        = null;
let inputResolver  = null;
let runGeneration  = 0;
let hasAutoStarted = false;
let isLoading      = false;

let outputBuffer  = "";
let pendingOutput = "";
let rafScheduled  = false;

const demo       = document.getElementById("terminal-demo");
const inlineOut  = demo?.querySelector(".terminal-out");
const inlineIn   = demo?.querySelector(".terminal-in");

const modal      = document.getElementById("terminal-modal");
const modalOut   = document.getElementById("terminal-modal-out");
const modalIn    = document.getElementById("terminal-modal-in");
const modalFile  = document.getElementById("terminal-modal-file");

if (!demo || !inlineOut || !inlineIn) {
    console.warn("[terminal] missing inline DOM elements — aborting");
} else {
    init();
}

function getActiveOut() { return isMobile() && modalOut ? modalOut : inlineOut; }
function getActiveIn()  { return isMobile() && modalIn  ? modalIn  : inlineIn;  }

function init() {
    syncTerminalMode();

    inlineOut.textContent = SHELL_PROMPT + "\n" + README_TEXT;

    demo.querySelectorAll(".tree-file").forEach((el) => {
        el.addEventListener("click", () => {
            const name = el.dataset.file;
            if (!name) return;
            runFile(name, el, el.dataset.type);
        });
    });

    inlineIn.addEventListener("keydown", handleInput);
    modalIn?.addEventListener("keydown", handleInput);

    modal?.addEventListener("click", (e) => {
        if (e.target.closest("[data-terminal-close]")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal && !modal.hidden) closeModal();
    });

    mq.addEventListener("change", () => {
        syncTerminalMode();
        render();
    });

    if (!isMobile() && "IntersectionObserver" in window) {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting || hasAutoStarted) return;
                    hasAutoStarted = true;
                    io.disconnect();
                    const first = demo.querySelector('.tree-file[data-file="readme"]');
                    if (first) runFile("readme", first, first.dataset.type);
                });
            },
            { threshold: 0.35 }
        );
        io.observe(demo);
    } else if (!isMobile()) {
        const first = demo.querySelector('.tree-file[data-file="readme"]');
        if (first) runFile("readme", first, first.dataset.type);
    }
}

function syncTerminalMode() {
    if (isMobile()) {
        inlineIn.setAttribute("readonly", "");
        inlineIn.setAttribute("tabindex", "-1");
        inlineIn.setAttribute("aria-hidden", "true");
    } else {
        inlineIn.removeAttribute("readonly");
        inlineIn.removeAttribute("tabindex");
        inlineIn.removeAttribute("aria-hidden");
    }
}

function openModal(fileName) {
    if (!modal) return;
    if (modalFile) modalFile.textContent = fileName || "";
    modal.hidden = false;
    document.body.classList.add("terminal-modal-open");
    requestAnimationFrame(() => modalIn?.focus());
}

function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("terminal-modal-open");
    inputResolver = null;
    runGeneration++;
}

function handleInput(e) {
    if (e.key !== "Enter") return;
    const value = e.target.value;
    e.target.value = "";
    writeLine(value);
    if (inputResolver) {
        const resolve = inputResolver;
        inputResolver = null;
        resolve(value);
    }
}

function scheduleRender() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
        rafScheduled = false;
        if (pendingOutput) {
            outputBuffer += pendingOutput;
            pendingOutput = "";
        }
        render();
    });
}

function render() {
    const target = getActiveOut();
    if (!target) return;
    const promptLine = SHELL_PROMPT + (isLoading ? LOADING_SUFFIX : "");
    target.textContent = promptLine + "\n" + outputBuffer;
    target.scrollTop = target.scrollHeight;
}

function write(text)     { pendingOutput += text;       scheduleRender(); }
function writeLine(text) { pendingOutput += text + "\n"; scheduleRender(); }

function clearOutput() {
    outputBuffer = "";
    pendingOutput = "";
    render();
}

async function ensurePyodide() {
    if (pyodide) return pyodide;

    isLoading = true;
    render();

    try {
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
        });

        pyodide.FS.mkdirTree("/home/pyodide/PYTHON");
        pyodide.FS.writeFile("/home/pyodide/PYTHON/message.txt", "");
        pyodide.FS.chdir("/home/pyodide");

        await pyodide.runPythonAsync(`
import js

async def ainput(prompt=""):
    if prompt:
        print(prompt, end="", flush=True)
    return await js.__js_input()
`);

        isLoading = false;
        render();

        return pyodide;
    } catch (err) {
        isLoading = false;
        writeLine("failed to load python runtime:");
        writeLine(String(err));
        throw err;
    }
}

async function offerAsmDownload(name, gen) {
    writeLine("can't import asm yet ://");
    write("download file instead? (y/n) ");

    const answer = await new Promise((resolve) => {
        inputResolver = resolve;
        getActiveIn().focus();
    });
    if (gen !== runGeneration) return;

    if (/^y(es)?$/i.test(answer.trim())) {
        const a = document.createElement("a");
        a.href = `scripts/${name}.asm`;
        a.download = `${name}.asm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        writeLine(`downloading ${name}.asm ...`);
    } else {
        writeLine("ok, maybe next time.");
    }
}

async function runFile(name, fileEl, type = "py") {
    if (!name) return;

    const gen = ++runGeneration;

    clearOutput();
    inlineIn.value = "";
    if (modalIn) modalIn.value = "";

    demo.querySelectorAll(".tree-file").forEach((el) => el.classList.remove("is-active"));
    fileEl?.classList.add("is-active");

    const mobile = isMobile();
    const openInModal = mobile && !(type === "txt" && name === "readme");

    if (openInModal) openModal(`${name}.${type}`);

    if (type === "txt") {
        if (name === "readme")      writeLine(README_TEXT);
        else                        writeLine(`(empty: ${name}.txt)`);
        return;
    }

    if (type === "asm") {
        await offerAsmDownload(name, gen);
        return;
    }

    globalThis.__js_input = () =>
        new Promise((resolve) => {
            inputResolver = resolve;
            getActiveIn().focus();
        });

    let py;
    try {
        py = await ensurePyodide();
    } catch {
        return;
    }
    if (gen !== runGeneration) return;

    py.setStdout({
        raw: (c) => {
            if (gen !== runGeneration) return;
            write(String.fromCharCode(c));
        },
    });
    py.setStderr({
        raw: (c) => {
            if (gen !== runGeneration) return;
            write(String.fromCharCode(c));
        },
    });

    let code;
    try {
        const res = await fetch(`scripts/${name}.py`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        code = await res.text();
    } catch (err) {
        writeLine(`could not load scripts/${name}.py — ${err.message}`);
        return;
    }

    if (gen !== runGeneration) return;

    try {
        await py.runPythonAsync(code);
    } catch (err) {
        if (gen === runGeneration) {
            writeLine("");
            writeLine(String(err));
        }
    }
}