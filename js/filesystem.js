// Sistema de arquivos virtual: três arquivos na raiz (~).
// Os dados reais vivem nos arquivos js/projetos.js, js/sobre.js e js/contato.js
// para facilitar manutenção, modularidade e versionamento no git.

const fs = {
    type: 'dir',
    children: {
        'contato.txt':  { type: 'file', content: CONTATO_TXT },
        'projetos.yml': { type: 'file', content: PROJETOS_YML },
        'sobre.txt':    { type: 'file', content: SOBRE_TXT }
    }
};

// Lê projetos.yml (vários documentos separados por '---') e devolve
// uma lista de { title, description, tags, repository }.
function parseProjects(text) {
    return text.split(/^---$/m).map(doc => {
        const p = {};
        doc.split('\n').forEach(l => {
            const m = l.match(/^([\w-]+):\s*(.*)$/);
            if (m) p[m[1]] = m[2];
        });
        if (p.name && !p.title) p.title = p.name;
        return p;
    }).filter(p => p.name || p.title);
}
