// Definição e execução dos comandos do terminal.
// Depende do sistema de arquivos virtual (fs) e dos utilitários de I/O.

// ---- Resolução de caminhos no filesystem ----
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

// ---- Comandos do terminal ----
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
            ['reset', 'reinicia o terminal para o estado inicial'],
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
    pwd() { print('/home/' + currentUser + (cwd.length ? '/' + cwd.join('/') : '')); },
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
    whoami() { print(currentUser); },
    echo(args) { print(esc(args.join(' '))); },
    history(args) {
        if (args[0] === '-c') { hist.length = 0; hi = 0; return ok('histórico limpo'); }
        hist.forEach((h, i) => print(`<span class="dim">${pad(i + 1, 4)}</span>  ${esc(h)}`));
    },
    clear() { out.innerHTML = ''; },
    reset() {
        if (window.fx) window.fx.reset();
        out.innerHTML = '';
        cwd = [];
        hist.length = 0;
        hi = 0;
        boot();
    }
};

commands.dir = commands.ls;
commands.type = commands.cat;
commands.cls = commands.clear;

if (typeof window !== 'undefined') {
    window.commands = commands;
}
