// =============================================
// FIREBASE CONFIG
// =============================================
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

// =============================================
// ESTADO LOCAL
// =============================================
let letras = [];
let festas = { varoes: { secoes: [] }, irmas: { secoes: [] }, jovens: { secoes: [] } };

// =============================================
// LOADING / TOAST
// =============================================
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

// =============================================
// INICIALIZAÇÃO
// =============================================
async function init() {
    showLoading('Carregando ministério...');
    try {
        await Promise.all([carregarLetras(), carregarFestas()]);
    } catch (e) {
        showToast('Erro ao conectar. Verifique a internet.', 'erro');
        console.error(e);
    }
    hideLoading();
}

// =============================================
// NAVEGAÇÃO
// =============================================
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

// =============================================
// LETRAS DOS HINOS — Firestore
// =============================================
async function carregarLetras() {
    const snap = await db.collection('letras').orderBy('criadoEm', 'asc').get();
    letras = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLetras();
}

async function addLetra() {
    const titulo = document.getElementById('let-titulo').value.trim();
    const letra = document.getElementById('let-letra').value.trim();
    if (!titulo || !letra) {
        showToast('Preencha o título e a letra.', 'aviso');
        return;
    }

    const btn = document.querySelector('#page-letras .btn-gold');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
        const dados = {
            titulo,
            autor: document.getElementById('let-autor').value.trim(),
            letra,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('letras').add(dados);
        letras.push({ id: docRef.id, ...dados });
        renderLetras();
        ['let-titulo', 'let-autor', 'let-letra'].forEach(id => document.getElementById(id).value = '');
        showToast('Hino salvo com sucesso!');
    } catch (err) {
        showToast('Erro ao salvar. Tente novamente.', 'erro');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = '+ Salvar Hino';
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
    const el = document.getElementById('letters-grid');
    if (!letras.length) {
        el.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Nenhum hino salvo ainda. Adicione o primeiro acima!</p>';
        return;
    }
    el.innerHTML = letras.map(l => `
    <div class="letter-card" onclick="openModal('${l.id}')">
      <button class="del-btn" onclick="event.stopPropagation();removeLetra('${l.id}')">✕</button>
      <h4>${escapeHtml(l.titulo)}${l.autor ? ' — ' + escapeHtml(l.autor) : ''}</h4>
      <p class="preview">${escapeHtml(l.letra)}</p>
    </div>
  `).join('');
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

// =============================================
// REPERTÓRIO DAS FESTAS — Firestore
// =============================================
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

// =============================================
// UTILITÁRIO
// =============================================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// =============================================
// START
// =============================================
document.addEventListener('DOMContentLoaded', init);