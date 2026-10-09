// Módulo de efeitos visuais e extensões do terminal
const fx = (() => {
    let _stopFx = null;
    let _activeRootFolder = null;

    const _sec = [
        'OyA4Oy0nO1BOCUsZDhVWSFgF',
        'JTQoJmQsI0JPH01BEAFRT1ZDAgZXSVcWAE8HV19XF00aUVZRWUYLAklXAxQXG0FCV19XAk0aUR0WGQgADhkGUVlGDAJJVxUACgxUGhodVQwKTB8aJBoWA0RbXFMOOAEAU1VTFgsBUxwZFlsIAEdbKVE9AQNMHFlTIgsdTBdUL1dNVHwdCC8bOAFIFhkfGjMAUh8RW1xfM05RWVEBRlVbUVheFwNNGlFWQxNUDhASV19XSUJGFFdJV0cJQxJAEkBGQwJeWBccCU0aUVZKTFUNERFXX1dJQkIBHBQdEE0aUVYVEAcOQxJXX1dJQkIcBxcQFk0aUVZHQFQOEBJXX1dJQlMWGVFPRkwXFUQXRABNXQ4=',
        'MzklPSEnP0VfA0sVBgxLTlYF'
    ];

    function _d(b64, key) {
        try {
            const bin = atob(b64);
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            const keyBuf = new TextEncoder().encode(key);
            for (let i = 0; i < buf.length; i++) buf[i] ^= keyBuf[i % keyBuf.length];
            const str = new TextDecoder().decode(buf);
            if (str.startsWith('VALID_V1:')) return JSON.parse(str.slice(9));
        } catch (_) {}
        return null;
    }

    function startFx() {
        if (_stopFx) _stopFx();
        const cvs = document.createElement('canvas');
        cvs.style.position = 'fixed';
        cvs.style.top = '0';
        cvs.style.left = '0';
        cvs.style.width = '100vw';
        cvs.style.height = '100vh';
        cvs.style.zIndex = '99999';
        cvs.style.background = '#000';
        document.body.appendChild(cvs);

        const ctx = cvs.getContext('2d');
        let w = cvs.width = window.innerWidth;
        let h = cvs.height = window.innerHeight;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        const chars = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789ABCDEF$#@%*+-=/<>~';
        const sz = 16;
        let cols = Math.floor(w / sz);
        let drops = Array(cols).fill(1);
        let aid = null;

        function resize() {
            w = cvs.width = window.innerWidth;
            h = cvs.height = window.innerHeight;
            cols = Math.floor(w / sz);
            drops = Array(cols).fill(1);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
        }
        window.addEventListener('resize', resize);

        function frame() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, w, h);
            ctx.font = sz + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const ch = chars[Math.floor(Math.random() * chars.length)];
                const x = i * sz;
                const y = drops[i] * sz;

                ctx.fillStyle = Math.random() > 0.8 ? '#ffffff' : '#4ade80';
                ctx.fillText(ch, x, y);

                if (y > h && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            aid = requestAnimationFrame(frame);
        }
        aid = requestAnimationFrame(frame);

        let canExit = false;
        const exitTimer = setTimeout(() => { canExit = true; }, 250);

        function cleanup() {
            clearTimeout(exitTimer);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pointerdown', onClick);
            if (aid) cancelAnimationFrame(aid);
            if (cvs.parentNode) cvs.parentNode.removeChild(cvs);
            _stopFx = null;
            if (window.cli) window.cli.focus();
        }
        function onKey(e) {
            if (!canExit) return;
            e.preventDefault();
            cleanup();
        }
        function onClick(e) {
            if (!canExit) return;
            e.preventDefault();
            cleanup();
        }

        window.addEventListener('keydown', onKey);
        window.addEventListener('pointerdown', onClick);
        _stopFx = cleanup;
    }

    function applyRoot(data) {
        currentUser = data.u;
        currentSym = data.s;
        for (const [k, v] of Object.entries(data.t)) {
            document.documentElement.style.setProperty(k, v);
        }
        _activeRootFolder = data.d;
        fs.children[data.d] = {
            type: 'dir',
            children: {
                [data.f]: {
                    type: 'file',
                    content: data.c
                }
            }
        };
        if (typeof renderPrompt === 'function') renderPrompt();
    }

    function restoreRoot() {
        if (!_activeRootFolder && currentUser === 'guest') return;
        document.documentElement.removeAttribute('style');
        currentUser = 'guest';
        currentSym = '$';
        if (_activeRootFolder) {
            if (cwd[0] === _activeRootFolder) cwd = [];
            delete fs.children[_activeRootFolder];
            _activeRootFolder = null;
        }
        if (typeof renderPrompt === 'function') renderPrompt();
    }

    return {
        dispatch(input) {
            const normalized = input.toLowerCase().replace(/\s+/g, ' ');
            let hit = null;
            for (const p of _sec) {
                hit = _d(p, normalized);
                if (hit) break;
            }
            if (!hit) return false;

            if (hit.act === 1) startFx();
            else if (hit.act === 2) applyRoot(hit);
            else if (hit.act === 3) restoreRoot();
            return true;
        },
        reset() {
            if (_stopFx) _stopFx();
            restoreRoot();
        }
    };
})();

if (typeof window !== 'undefined') {
    window.fx = fx;
}
