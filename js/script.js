const firebaseConfig = {
    apiKey: "AIzaSyCdcWyC0EsuhcJSzdwcRxL2W8Cgc5O7-WM",
    authDomain: "equipedelouvor-94351.firebaseapp.com",
    projectId: "equipedelouvor-94351",
    storageBucket: "equipedelouvor-94351.firebasestorage.app",
    messagingSenderId: "636580734249",
    appId: "1:636580734249:web:5e233d6b049fcf052a0338"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let letras = [];
let festas = { varoes: { secoes: [] }, irmas: { secoes: [] }, jovens: { secoes: [] } };

function showLoading(msg) {
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('loading-text').textContent = msg || 'Carregando...';
}
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}
function showToast(msg, tipo) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast-show toast-' + (tipo || 'ok');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = ''; }, 3000);
}

async function init() {
    showLoading('Carregando ministério...');
    try {
        await Promise.all([
            carregarLetras().catch(e => console.warn('Letras:', e)),
            carregarFestas().catch(e => console.warn('Festas:', e)),
            carregarCifras().catch(e => console.warn('Cifras:', e))
        ]);
    } catch (e) {
        console.error(e);
    }
    hideLoading();
}

function showPage(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    btn.classList.add('active');
}

function showFesta(id, btn) {
    document.querySelectorAll('.festa-content').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.festa-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('festa-' + id).classList.add('active');
    btn.classList.add('active');
}

async function carregarLetras() {
    const snap = await db.collection('letras').orderBy('criadoEm', 'asc').get();
    letras = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLetras();
}

async function addLetra() {
    const titulo = document.getElementById('let-titulo').value.trim();
    const letra = document.getElementById('let-letra').value.trim();
    const grupo = document.getElementById('let-grupo').value;

    if (!titulo || !letra) {
        showToast('Preencha o título e a letra.', 'aviso'); return;
    }
    if (!grupo) {
        showToast('Selecione o grupo (Louvor, Varões, Irmãs ou Jovens).', 'aviso'); return;
    }

    const btn = document.querySelector('#page-letras .btn-gold');
    btn.disabled = true; btn.textContent = 'Salvando...';

    try {
        const dados = {
            titulo,
            autor: document.getElementById('let-autor').value.trim(),
            letra,
            grupo,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('letras').add(dados);
        letras.push({ id: docRef.id, ...dados });
        renderLetras();
        ['let-titulo', 'let-autor', 'let-letra'].forEach(id => document.getElementById(id).value = '');
        // resetar dropdown
        document.getElementById('let-grupo').value = '';
        document.getElementById('grupoLabel').textContent = 'Selecionar grupo...';
        showToast('Hino salvo com sucesso!');
    } catch (err) {
        showToast('Erro ao salvar. Tente novamente.', 'erro');
        console.error(err);
    } finally {
        btn.disabled = false; btn.textContent = '+ Salvar Hino';
    }
}

async function removeLetra(id) {
    if (!confirm('Remover este hino?')) return;
    try {
        await db.collection('letras').doc(id).delete();
        letras = letras.filter(l => l.id !== id);
        renderLetras();
        showToast('Hino removido.');
    } catch (err) {
        showToast('Erro ao remover.', 'erro');
    }
}

function renderLetras() {
    const grupos = ['louvor', 'varoes', 'irmas', 'jovens'];

    grupos.forEach(grupo => {
        const el = document.getElementById('grid-' + grupo);
        const filtradas = letras.filter(l => (l.grupo || 'louvor') === grupo);

        if (!filtradas.length) {
            el.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Nenhum hino neste grupo ainda.</p>';
            return;
        }
        el.innerHTML = filtradas.map(l => `
            <div class="letter-card" onclick="openModal('${l.id}')">
              <button class="del-btn" onclick="event.stopPropagation();removeLetra('${l.id}')">✕</button>
              <h4>${escapeHtml(l.titulo)}${l.autor ? ' — ' + escapeHtml(l.autor) : ''}</h4>
              <p class="preview">${escapeHtml(l.letra)}</p>
            </div>
        `).join('');
    });
}

function openModal(id) {
    const l = letras.find(x => x.id === id);
    if (!l) return;
    document.getElementById('modal-title').textContent = l.titulo + (l.autor ? ' — ' + l.autor : '');
    document.getElementById('modal-body').textContent = l.letra;
    document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
    if (!e || e.target === document.getElementById('modal') || e.target.classList.contains('modal-close'))
        document.getElementById('modal').classList.remove('open');
}

async function carregarFestas() {
    for (const festa of ['varoes', 'irmas', 'jovens']) {
        const snap = await db.collection('festas').doc(festa).get();
        if (snap.exists) festas[festa] = snap.data();
        renderFestas(festa);
    }
}

async function salvarFesta(festa) {
    try {
        await db.collection('festas').doc(festa).set(festas[festa]);
    } catch (err) {
        showToast('Erro ao salvar repertório.', 'erro');
        console.error(err);
    }
}

async function addSecao(festa) {
    const nome = prompt('Nome da seção (ex: Abertura, Adoração, Encerramento):');
    if (!nome || !nome.trim()) return;
    if (!festas[festa].secoes) festas[festa].secoes = [];
    festas[festa].secoes.push({ nome: nome.trim(), musicas: [], id: Date.now() });
    renderFestas(festa);
    await salvarFesta(festa);
    showToast('Seção adicionada!');
}

async function addMusicaFesta(festa, secaoId) {
    const inp = document.getElementById('finput-' + secaoId);
    const nome = inp.value.trim();
    if (!nome) return;
    const s = festas[festa].secoes.find(x => x.id === secaoId);
    if (s) s.musicas.push({ nome, id: Date.now() });
    inp.value = '';
    renderFestas(festa);
    await salvarFesta(festa);
}

async function removeMusicaFesta(festa, secaoId, musId) {
    const s = festas[festa].secoes.find(x => x.id === secaoId);
    if (s) s.musicas = s.musicas.filter(m => m.id !== musId);
    renderFestas(festa);
    await salvarFesta(festa);
    showToast('Música removida.');
}

function renderFestas(festa) {
    const el = document.getElementById('sections-' + festa);
    const data = (festas[festa] && festas[festa].secoes) ? festas[festa].secoes : [];
    if (!data.length) {
        el.innerHTML = '<p class="empty-msg">Nenhuma seção criada. Clique em "+ Nova Seção" para começar.</p>';
        return;
    }
    el.innerHTML = data.map(s => `
    <div class="festa-section">
      <div class="festa-section-title">${escapeHtml(s.nome)}</div>
      <div class="festa-add">
        <input type="text" id="finput-${s.id}"
          placeholder="Adicionar música a esta seção..."
          onkeydown="if(event.key==='Enter')addMusicaFesta('${festa}',${s.id})">
        <button class="btn-sm" onclick="addMusicaFesta('${festa}',${s.id})">+ Adicionar</button>
      </div>
      <ul class="festa-music-list">
        ${s.musicas && s.musicas.length
            ? s.musicas.map((m, i) => `
              <li>
                <span class="song-num">${String(i + 1).padStart(2, '0')}</span>
                ${escapeHtml(m.nome)}
                <button class="del-s" onclick="removeMusicaFesta('${festa}',${s.id},${m.id})">✕</button>
              </li>`).join('')
            : '<li style="color:var(--text-muted);font-style:italic;">Nenhuma música nesta seção ainda.</li>'
        }
      </ul>
    </div>
  `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toggleGrupoDropdown() {
    const btn = document.getElementById('grupoBtn');
    const dd = document.getElementById('grupoDropdown');
    btn.classList.toggle('open');
    dd.classList.toggle('open');
}

function selecionarGrupo(valor, label) {
    document.getElementById('let-grupo').value = valor;
    document.getElementById('grupoLabel').textContent = label;
    document.getElementById('grupoBtn').classList.remove('open');
    document.getElementById('grupoDropdown').classList.remove('open');
}

function toggleGrupoBox(id) {
    document.getElementById(id).classList.toggle('aberto');
}

let cifras = [];
let cifraAtualId = null;
let transposicaoAtual = 0;

async function carregarCifras() {
    const snap = await db.collection('cifras').orderBy('criadoEm', 'asc').get();
    cifras = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCifras();
}

async function addCifra() {
    const titulo = document.getElementById('cif-titulo').value.trim();
    const cifra = document.getElementById('cif-cifra').value.trim();
    const grupo = document.getElementById('cif-grupo').value;

    if (!titulo || !cifra) {
        showToast('Preencha o título e a cifra.', 'aviso'); return;
    }
    if (!grupo) {
        showToast('Selecione o grupo.', 'aviso'); return;
    }

    const btn = document.querySelector('#page-cifras .btn-gold');
    btn.disabled = true; btn.textContent = 'Salvando...';

    try {
        const dados = {
            titulo,
            autor: document.getElementById('cif-autor').value.trim(),
            tom: document.getElementById('cif-tom').value.trim(),
            cifra,
            grupo,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('cifras').add(dados);
        cifras.push({ id: docRef.id, ...dados });
        renderCifras();

        ['cif-titulo', 'cif-autor', 'cif-tom', 'cif-cifra'].forEach(id =>
            document.getElementById(id).value = ''
        );
        document.getElementById('cif-grupo').value = '';
        document.getElementById('grupoLabel-cifra').textContent = 'Selecionar grupo...';
        document.getElementById('grupoBtn-cifra').classList.remove('open');
        document.getElementById('grupoDropdown-cifra').classList.remove('open');

        showToast('Cifra salva com sucesso!');
    } catch (err) {
        showToast('Erro ao salvar. Tente novamente.', 'erro');
        console.error(err);
    } finally {
        btn.disabled = false; btn.textContent = '🎸 Salvar Cifra';
    }
}

async function removeCifra(id) {
    if (!confirm('Remover esta cifra?')) return;
    try {
        await db.collection('cifras').doc(id).delete();
        cifras = cifras.filter(c => c.id !== id);
        renderCifras();
        showToast('Cifra removida.');
    } catch (err) {
        showToast('Erro ao remover.', 'erro');
    }
}

function renderCifras() {
    const grupos = ['louvor', 'varoes', 'irmas', 'jovens'];

    grupos.forEach(grupo => {
        const el = document.getElementById('cgrid-' + grupo);
        const filtradas = cifras.filter(c => (c.grupo || 'louvor') === grupo);

        if (!filtradas.length) {
            el.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Nenhuma cifra neste grupo ainda.</p>';
            return;
        }

        el.innerHTML = filtradas.map(c => `
            <div class="cifra-card" onclick="openModalCifra('${c.id}')">
                <button class="del-btn" onclick="event.stopPropagation();removeCifra('${c.id}')">✕</button>
                <div class="cifra-card-header">
                    <h4>${escapeHtml(c.titulo)}</h4>
                    ${c.tom ? `<span class="cifra-tom-badge">${escapeHtml(c.tom)}</span>` : ''}
                </div>
                ${c.autor ? `<p class="autor-small">${escapeHtml(c.autor)}</p>` : ''}
                <pre class="cifra-preview">${escapeHtml(c.cifra)}</pre>
            </div>
        `).join('');
    });
}

function openModalCifra(id) {
    const c = cifras.find(x => x.id === id);
    if (!c) return;

    cifraAtualId = id;
    transposicaoAtual = 0;

    document.getElementById('modal-cifra-title').textContent =
        c.titulo + (c.autor ? ' — ' + c.autor : '');
    document.getElementById('modal-cifra-meta').textContent =
        c.tom ? 'Tom original: ' + c.tom : '';
    document.getElementById('cifra-tom-atual').textContent =
        c.tom || '—';

    renderCifraModal(c.cifra, 0);
    document.getElementById('modal-cifra').classList.add('open');
}

function closeModalCifra(e) {
    if (!e || e.target === document.getElementById('modal-cifra') ||
        e.target.classList.contains('modal-close')) {
        document.getElementById('modal-cifra').classList.remove('open');
        cifraAtualId = null;
        transposicaoAtual = 0;
    }
}

function parseCifraEmTokens(linhaAcorde, linhaLetra) {
    const tokens = [];
    const regexAcorde = /\S+/g;
    let match;
    const acordes = [];

    while ((match = regexAcorde.exec(linhaAcorde)) !== null) {
        acordes.push({ acorde: match[0], pos: match.index });
    }

    if (!acordes.length) {
        return [{ acorde: '', texto: linhaLetra || '' }];
    }

    const posAjustadas = acordes.map((a) => {
        let pos = a.pos;
        if (pos >= linhaLetra.length) return linhaLetra.length;
        if (pos > 0 && linhaLetra[pos] !== ' ' && linhaLetra[pos - 1] !== ' ') {
            const espacoAntes = linhaLetra.lastIndexOf(' ', pos);
            pos = espacoAntes === -1 ? 0 : espacoAntes + 1;
        }
        return pos;
    });

    const posUnicas = [...new Set([0, ...posAjustadas])].sort((a, b) => a - b);

    for (let i = 0; i < posUnicas.length; i++) {
        const inicio = posUnicas[i];
        const fim = i + 1 < posUnicas.length ? posUnicas[i + 1] : linhaLetra.length;
        const textoLimpo = linhaLetra.slice(inicio, fim).trimStart();

        let acordeNaPos = '';
        for (let j = 0; j < acordes.length; j++) {
            if (posAjustadas[j] === inicio) {
                acordeNaPos = acordes[j].acorde;
                break;
            }
        }

        if (textoLimpo) tokens.push({ acorde: acordeNaPos, texto: textoLimpo });
    }

    acordes.forEach((a, j) => {
        if (posAjustadas[j] >= linhaLetra.length) {
            tokens.push({ acorde: a.acorde, texto: '' });
        }
    });

    return tokens.length ? tokens : [{ acorde: '', texto: linhaLetra }];
}

function renderCifraModal(cifraTexto, semitons) {
    const corpo = document.getElementById('modal-cifra-body');
    const linhas = cifraTexto.split('\n');
    let html = '';
    let i = 0;

    while (i < linhas.length) {
        const linha = linhas[i];
        const proxima = linhas[i + 1];

        if (isLinhaAcorde(linha)) {
            const linhaTransposta = transporLinha(linha, semitons);

            if (proxima !== undefined && proxima.trim() !== '' && !isLinhaAcorde(proxima)) {
    
                const tokens = parseCifraEmTokens(linhaTransposta, proxima);
                html += `<span class="cifra-bloco-inline">`;
                tokens.forEach(t => {
                    html += `<span class="cifra-token">` +
                        `<span class="cifra-token-acorde">${t.acorde ? escapeHtml(t.acorde) : '\u00A0'}</span>` +
                        `<span class="cifra-token-letra">${escapeHtml(t.texto)}</span>` +
                        `</span>`;
                });
                html += `</span>\n`;
                i += 2;
            } else {
        
                html += `<span class="cifra-linha-acorde">${escapeHtml(linhaTransposta)}\n</span>`;
                i++;
            }
        } else if (linha.trim() === '') {
            html += `<span class="cifra-linha-letra"> \n</span>`;
            i++;
        } else {
            html += `<span class="cifra-linha-letra">${escapeHtml(linha)}\n</span>`;
            i++;
        }
    }

    corpo.innerHTML = html;
}

const NOTAS_S = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTAS_B = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const MAPA_BR = {
    'Dó': 'C', 'Ré': 'D', 'Mi': 'E', 'Fá': 'F', 'Sol': 'G', 'Lá': 'A', 'Si': 'B',
    'do': 'C', 'ré': 'D', 'mi': 'E', 'fá': 'F', 'sol': 'G', 'lá': 'A', 'si': 'B',
    'DO': 'C', 'RE': 'D', 'MI': 'E', 'FA': 'F', 'SOL': 'G', 'LA': 'A', 'SI': 'B'
};

function indexNota(nota) {
    const n = nota.replace(/([A-G])b/, '$1b');
    let idx = NOTAS_S.indexOf(nota);
    if (idx === -1) idx = NOTAS_B.indexOf(nota);
    return idx;
}

function transporNota(nota, semitons) {
    let idx = indexNota(nota);
    if (idx === -1) return nota;
    const novo = ((idx + semitons) % 12 + 12) % 12;
    return (nota.includes('b') && !nota.includes('#'))
        ? NOTAS_B[novo]
        : NOTAS_S[novo];
}

const REGEX_ACORDE = /\b([A-G][b#]?)(m|maj|dim|aug|sus|add)?(\d*)([/]([A-G][b#]?))?\b/g;

function transporLinha(linha, semitons) {
    if (semitons === 0) return linha;
    return linha.replace(REGEX_ACORDE, (match, raiz, qualidade, ext, _, baixo) => {
        const novaRaiz = transporNota(raiz, semitons);
        const novoBaixo = baixo ? '/' + transporNota(baixo, semitons) : '';
        return novaRaiz + (qualidade || '') + (ext || '') + novoBaixo;
    });
}

function isLinhaAcorde(linha) {
    const tokens = linha.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return false;
    const acordes = tokens.filter(t => /^[A-G][b#]?(m|maj|dim|aug|sus|add)?(\d*)([/][A-G][b#]?)?$/.test(t));
    return acordes.length / tokens.length >= 0.5;
}

function transporCifra(direcao) {
    const c = cifras.find(x => x.id === cifraAtualId);
    if (!c) return;

    transposicaoAtual += direcao;

    const tomOriginalIdx = c.tom ? indexNota(c.tom.replace(/m$/, '').trim()) : -1;
    if (tomOriginalIdx !== -1) {
        const novoIdx = ((tomOriginalIdx + transposicaoAtual) % 12 + 12) % 12;
        const novoTom = NOTAS_S[novoIdx] + (c.tom && c.tom.trim().endsWith('m') ? 'm' : '');
        document.getElementById('cifra-tom-atual').textContent = novoTom;
    } else {
        document.getElementById('cifra-tom-atual').textContent =
            (transposicaoAtual >= 0 ? '+' : '') + transposicaoAtual;
    }

    renderCifraModal(c.cifra, transposicaoAtual);
}

function resetTransposicao() {
    const c = cifras.find(x => x.id === cifraAtualId);
    if (!c) return;
    transposicaoAtual = 0;
    document.getElementById('cifra-tom-atual').textContent = c.tom || '—';
    renderCifraModal(c.cifra, 0);
}

function toggleGrupoDropdownCifra() {
    const btn = document.getElementById('grupoBtn-cifra');
    const dd = document.getElementById('grupoDropdown-cifra');
    btn.classList.toggle('open');
    dd.classList.toggle('open');
}

function selecionarGrupoCifra(valor, label) {
    document.getElementById('cif-grupo').value = valor;
    document.getElementById('grupoLabel-cifra').textContent = label;
    document.getElementById('grupoBtn-cifra').classList.remove('open');
    document.getElementById('grupoDropdown-cifra').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
    init();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.grupo-select-wrap')) {
            document.getElementById('grupoBtn')?.classList.remove('open');
            document.getElementById('grupoDropdown')?.classList.remove('open');

            document.getElementById('grupoBtn-cifra')?.classList.remove('open');
            document.getElementById('grupoDropdown-cifra')?.classList.remove('open');
        }
    });
});