// Motor de interface, I/O e ciclo de vida do terminal.

let currentUser = 'guest';
let currentSym = '$';
const HOST = 'prentece.dev';

let cwd = [];
const out = document.getElementById('out');
const cli = document.getElementById('cli');
const cliDisplay = document.getElementById('cli-display');
const promptEl = document.getElementById('prompt');

// ---- Histórico (apenas em memória) ----
const hist = [];
let hi = 0;
let draft = '';

// ---- Utilitários de I/O e formatação ----
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = s => esc(s).replace(/(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
const pathStr = p => '~' + (p.length ? '/' + p.join('/') : '');
const pad = (s, n) => String(s).padStart(n);

function promptHtml() {
    return `<span class="arrow">&gt;</span> <span class="user">${esc(currentUser)}@${HOST}</span><span class="colon">:</span><span class="path">${esc(pathStr(cwd))}</span><span class="sym">${esc(currentSym)}</span> `;
}

function renderPrompt() {
    promptEl.innerHTML = promptHtml().replace(/ $/, '&nbsp;');
    updateCliDisplay();
}

function getCommands() {
    return (typeof window !== 'undefined' && window.commands) || (typeof commands !== 'undefined' ? commands : {});
}
function getFx() {
    return (typeof window !== 'undefined' && window.fx) || (typeof fx !== 'undefined' ? fx : null);
}

function formatCommandLine(rawStr) {
    if (!rawStr) return '';
    const match = rawStr.match(/^(\s*)(\S+)([\s\S]*)$/);
    if (!match) return esc(rawStr);

    const leading = esc(match[1]);
    const cmd = match[2];
    const rest = esc(match[3]);

    const isCmdValid = Boolean(getCommands()[cmd.toLowerCase()]);
    const cmdHtml = isCmdValid
        ? `<span class="cmd-valid">${esc(cmd)}</span>`
        : esc(cmd);

    return leading + cmdHtml + rest;
}

function updateCliDisplay() {
    if (cliDisplay) {
        cliDisplay.innerHTML = formatCommandLine(cli.value);
    }
}

function print(html, cls = '') {
    const d = document.createElement('div');
    d.className = 'line ' + cls;
    d.innerHTML = html;
    out.appendChild(d);
}

const printText = (t, cls = '') => t.split('\n').forEach(l => print(linkify(l), cls));
const ok = m => print(m);
const fail = m => print(m);

function echoCommand(line) {
    print(promptHtml() + formatCommandLine(line));
}

// ---- Execução de comandos ----
function run(line, echo = true) {
    if (echo) echoCommand(line);
    const t = line.trim();
    if (!t) return;
    const [cmd, ...args] = t.split(/\s+/);
    const cmdMap = getCommands();
    if (cmdMap[cmd]) {
        cmdMap[cmd](args);
        return;
    }
    const fxModule = getFx();
    if (fxModule && fxModule.dispatch(t)) {
        return;
    }
    fail(`${esc(cmd)}: comando não encontrado. Digite 'help' para ver os comandos.`);
}

// ---- Autocompletar ----
function complete() {
    const v = cli.value;
    const parts = v.split(/\s+/);
    const last = parts[parts.length - 1];
    const showOptions = m => { echoCommand(v); print(m.map(esc).join('  ')); };

    if (parts.length === 1) {
        const m = Object.keys(getCommands()).filter(c => c.startsWith(last));
        if (m.length === 1) cli.value = m[0] + ' ';
        else if (m.length > 1) showOptions(m);
        return;
    }
    const idx = last.lastIndexOf('/');
    const base = idx >= 0 ? last.slice(0, idx + 1) : '';
    const frag = last.slice(idx + 1);
    const r = resolve(base || '.');
    if (!r || r.node.type !== 'dir') return;
    const m = Object.keys(r.node.children).filter(n => n.startsWith(frag));
    if (m.length === 1) {
        parts[parts.length - 1] = base + m[0] + (r.node.children[m[0]].type === 'dir' ? '/' : ' ');
        cli.value = parts.join(' ');
        updateCliDisplay();
    } else if (m.length > 1) showOptions(m);
}

// ---- Teclado e Eventos de Janela ----
function scrollDown() { window.scrollTo(0, document.body.scrollHeight); }

cli.addEventListener('input', updateCliDisplay);

cli.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const v = cli.value; cli.value = '';
        updateCliDisplay();
        if (v.trim() && hist[hist.length - 1] !== v) hist.push(v);
        hi = hist.length; draft = '';
        run(v);
        renderPrompt();
        scrollDown();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hi === hist.length) draft = cli.value;
        if (hi > 0) cli.value = hist[--hi];
        updateCliDisplay();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hi < hist.length - 1) cli.value = hist[++hi];
        else { hi = hist.length; cli.value = draft; }
        updateCliDisplay();
    } else if (e.key === 'Tab') {
        e.preventDefault(); complete(); updateCliDisplay(); scrollDown();
    } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault(); if (window.commands && window.commands.clear) window.commands.clear();
    } else if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        print(promptHtml() + esc(cli.value) + '<span class="dim">^C</span>');
        cli.value = ''; hi = hist.length; updateCliDisplay(); scrollDown();
    }
});

document.addEventListener('click', () => {
    if (!window.getSelection().toString()) cli.focus();
});

// ---- Inicialização ----
function boot() {
    renderPrompt();
    print(`<span class="dim">Last login: ${new Date().toLocaleString('pt-BR')} em tty1</span>`);
    print(`<span class="dim">Bem-vindo a ${HOST}. Digite 'help' para ver os comandos disponíveis.</span>`);
    print('');

    ['ls -l', 'cat projetos.yml'].forEach(c => {
        hist.push(c);
        run(c);
    });
    hi = hist.length;

    renderPrompt();
    cli.focus();
}

boot();
