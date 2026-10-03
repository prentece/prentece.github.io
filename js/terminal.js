// Lógica do terminal. Depende de `fs` e `projects` (js/filesystem.js).

const USER = 'visitante', HOST = 'prentece.dev';

let cwd = [];
const out = document.getElementById('out');
const cli = document.getElementById('cli');
const cliDisplay = document.getElementById('cli-display');
const promptEl = document.getElementById('prompt');

// ---- Histórico (apenas em memória) ----
// Começa vazio; o boot registra os comandos simulados da abertura.
const hist = [];
let hi = 0;
let draft = '';

// ---- Utilitários ----
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = s => esc(s).replace(/(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
const pathStr = p => '~' + (p.length ? '/' + p.join('/') : '');
const pad = (s, n) => String(s).padStart(n);

function promptHtml() {
    return `<span class="arrow">&gt;</span> <span class="user">${USER}@${HOST}</span><span class="colon">:</span><span class="path">${esc(pathStr(cwd))}</span><span class="sym">$</span> `;
}
function renderPrompt() {
    promptEl.innerHTML = promptHtml().replace(/ $/, '&nbsp;');
    updateCliDisplay();
}

function formatCommandLine(rawStr) {
    if (!rawStr) return '';
    const match = rawStr.match(/^(\s*)(\S+)([\s\S]*)$/);
    if (!match) return esc(rawStr);

    const leading = esc(match[1]);
    const cmd = match[2];
    const rest = esc(match[3]);

    const isCmdValid = Boolean(commands[cmd.toLowerCase()]);
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

// ---- Sistema de arquivos ----
function resolve(arg) {
    let parts = [];
    if (arg.startsWith('~')) arg = arg.slice(1);
    else parts = [...cwd];
    for (const seg of arg.split('/')) {
        if (!seg || seg === '.') continue;
        if (seg === '..') parts.pop(); else parts.push(seg);
    }
    let node = fs;
    for (const seg of parts) {
        if (node.type !== 'dir' || !node.children[seg]) return null;
        node = node.children[seg];
    }
    return { node, parts };
}

const icon = (n, c) => c.type === 'dir' ? '▸' : (n.endsWith('.md') ? '◆' : '·');
const nameHtml = (n, c) => c.type === 'dir'
    ? `<span class="dir">${icon(n, c)} ${esc(n)}/</span>`
    : `<span class="file">${icon(n, c)} ${esc(n)}</span>`;

function tree(node, prefix = '') {
    const names = Object.keys(node.children).sort();
    names.forEach((n, i) => {
        const last = i === names.length - 1, c = node.children[n];
        print(`<span class="dim">${esc(prefix + (last ? '└── ' : '├── '))}</span>` + nameHtml(n, c));
        if (c.type === 'dir') tree(c, prefix + (last ? '    ' : '│   '));
    });
}

// ---- Comandos ----
const commands = {
    help() {
        print('<span class="bright">comandos disponíveis:</span>');
        [
            ['ls [-l] [dir]', 'lista o conteúdo de um diretório'],
            ['cd <dir>', 'muda de diretório'],
            ['pwd', 'mostra o diretório atual'],
            ['cat <arquivo>', 'exibe o conteúdo de um arquivo'],
            ['tree [dir]', 'mostra a estrutura de diretórios'],
            ['open <alvo>', 'abre um projeto ou URL (ex: open astrix)'],
            ['whoami', 'mostra o usuário atual'],
            ['echo <texto>', 'imprime texto'],
            ['history [-c]', 'histórico de comandos (-c limpa)'],
            ['clear', 'limpa a tela (ctrl+l)'],
            ['help', 'mostra esta ajuda']
        ].forEach(([c, d]) => print(`  <span class="bright">${esc(c.padEnd(16))}</span> ${esc(d)}`));
        print('');
        print('arquivos: <span class="file">projetos.yml</span>  <span class="file">sobre.txt</span>  <span class="file">contato.txt</span>');
        print('<span class="dim">atalhos: seta cima/baixo histórico · tab completar · ctrl+l limpar · ctrl+c cancelar</span>');
    },
    ls(args) {
        const long = args.includes('-l');
        const target = args.find(a => !a.startsWith('-')) || '.';
        const r = resolve(target);
        if (!r) return fail(`ls: não foi possível acessar '${esc(target)}': Arquivo ou diretório inexistente`);
        if (r.node.type === 'file') return print(esc(target));
        const names = Object.keys(r.node.children).sort();
        if (!names.length) return;
        if (long) {
            print(`<span class="dim">total ${names.length}</span>`);
            names.forEach(n => {
                const c = r.node.children[n], d = c.type === 'dir';
                const size = d ? 4096 : c.content.length;
                print(`<span class="dim">${d ? 'drwxr-xr-x' : '-rw-r--r--'} ${pad(size, 5)} out  3 12:00</span> ` + nameHtml(n, c));
            });
        } else {
            print(names.map(n => nameHtml(n, r.node.children[n])).join('  '));
        }
    },
    cd(args) {
        if (!args[0] || args[0] === '~') { cwd = []; return; }
        const r = resolve(args[0]);
        if (!r) return fail(`cd: ${esc(args[0])}: Arquivo ou diretório inexistente`);
        if (r.node.type !== 'dir') return fail(`cd: ${esc(args[0])}: Não é um diretório`);
        cwd = r.parts;
    },
    pwd() { print('/home/' + USER + (cwd.length ? '/' + cwd.join('/') : '')); },
    cat(args) {
        if (!args[0]) return fail('cat: informe um arquivo');
        const r = resolve(args[0]);
        if (!r) return fail(`cat: ${esc(args[0])}: Arquivo ou diretório inexistente`);
        if (r.node.type === 'dir') return fail(`cat: ${esc(args[0])}: É um diretório`);
        printText(r.node.content);
    },
    tree(args) {
        const r = resolve(args[0] || '.');
        if (!r || r.node.type !== 'dir') return fail(`tree: '${esc(args[0] || '')}' não é um diretório válido`);
        print(`<span class="dir">${esc(args[0] || '.')}</span>`);
        tree(r.node);
    },
    open(args) {
        if (!args[0]) return fail('open: informe um projeto ou URL');
        const t = args[0].replace(/\/$/, '');
        const proj = parseProjects(fs.children['projetos.yml'].content).find(p => (p.name || p.title) === t);
        const url = /^https?:\/\//.test(t) ? t
                  : proj ? proj.repository
                  : t === 'github' ? 'https://github.com/prentece' : null;
        if (!url) return fail(`open: '${esc(t)}': alvo desconhecido`);
        window.open(url, '_blank', 'noopener,noreferrer');
        print(`abrindo ${linkify(url)}`);
    },
    whoami() { print(USER); },
    echo(args) { print(esc(args.join(' '))); },
    history(args) {
        if (args[0] === '-c') { hist.length = 0; hi = 0; return ok('histórico limpo'); }
        hist.forEach((h, i) => print(`<span class="dim">${pad(i + 1, 4)}</span>  ${esc(h)}`));
    },
    clear() { out.innerHTML = ''; }
};
commands.dir = commands.ls;
commands.type = commands.cat;
commands.cls = commands.clear;

function run(line, echo = true) {
    if (echo) echoCommand(line);
    const t = line.trim();
    if (!t) return;
    const [cmd, ...args] = t.split(/\s+/);
    if (commands[cmd]) commands[cmd](args);
    else fail(`${esc(cmd)}: comando não encontrado. Digite 'help' para ver os comandos.`);
}

// ---- Autocompletar ----
function complete() {
    const v = cli.value;
    const parts = v.split(/\s+/);
    const last = parts[parts.length - 1];
    const showOptions = m => { echoCommand(v); print(m.map(esc).join('  ')); };

    if (parts.length === 1) {
        const m = Object.keys(commands).filter(c => c.startsWith(last));
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

// ---- Teclado ----
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
        e.preventDefault(); commands.clear();
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
(function boot() {
    renderPrompt();
    print(`<span class="dim">Last login: ${new Date().toLocaleString('pt-BR')} em tty1</span>`);
    print(`<span class="dim">Bem-vindo a ${HOST}. Digite 'help' para ver os comandos disponíveis.</span>`);
    print('');

    // Comandos iniciais executados de verdade: aparecem no `history` da sessão.
    // Sem linhas extras: a saída e o espaçamento são exatamente iguais aos de um comando digitado.
    ['ls -l', 'cat projetos.yml'].forEach(c => {
        hist.push(c);
        run(c);
    });
    hi = hist.length;

    renderPrompt();
    cli.focus();
})();

