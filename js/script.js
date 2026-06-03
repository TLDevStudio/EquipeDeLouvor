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
const storage = firebase.storage();

// =============================================
// ESTADO LOCAL
// =============================================
let musicas = [];
let letras = [];
let festas = { varoes: { secoes: [] }, irmas: { secoes: [] }, jovens: { secoes: [] } };
let fotosData = { varoes: [], irmas: [], jovens: [] };

// =============================================
// LOADING / TOAST
// =============================================
function showLoading(msg = 'Carregando...') {
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('loading-text').textContent = msg;
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showToast(msg, tipo = 'ok') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast-show toast-' + tipo;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = ''; }, 3000);
}

// =============================================
// INICIALIZAÇÃO — carrega tudo do Firebase
// =============================================
async function init() {
    showLoading('Carregando ministério...');
    try {
        await Promise.all([
            carregarHeroFoto(),
            carregarMusicas(),
            carregarLetras(),
            carregarFestas(),
            carregarFotos()
        ]);
    } catch (e) {
        showToast('Erro ao carregar dados. Verifique a conexão.', 'erro');
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
// HERO FOTO
// =============================================
async function carregarHeroFoto() {
    try {
        const doc = await db.collection('config').doc('hero').get();
        if (doc.exists && doc.data().fotoUrl) {
            const img = document.getElementById('hero-img');
            img.src = doc.data().fotoUrl;
            img.style.display = 'block';
            document.getElementById('hero-placeholder').style.display = 'none';
        }
    } catch (e) { /* sem foto salva ainda */ }
}

async function setHeroPhoto(e) {
    const f = e.target.files[0];
    if (!f) return;

    // Mostra preview local imediatamente
    const localUrl = URL.createObjectURL(f);
    const img = document.getElementById('hero-img');
    img.src = localUrl;
    img.style.display = 'block';
    document.getElementById('hero-placeholder').style.display = 'none';

    // Envia para o Storage
    const badge = document.getElementById('hero-uploading');
    badge.style.display = 'block';
    try {
        const ref = storage.ref('hero/foto-ministerio');
        await ref.put(f);
        const url = await ref.getDownloadURL();
        await db.collection('config').doc('hero').set({ fotoUrl: url });
        showToast('Foto do ministério salva!');
    } catch (err) {
        showToast('Erro ao salvar a foto.', 'erro');
        console.error(err);
    } finally {
        badge.style.display = 'none';
    }
}

// =============================================
// MÚSICAS DE ENSAIO
// =============================================
async function carregarMusicas() {
    const snap = await db.collection('musicas').orderBy('criadoEm', 'asc').get();
    musicas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMusicas();
}

async function addMusica() {
    const nome = document.getElementById('ens-nome').value.trim();
    if (!nome) { showToast('Digite o nome da música.', 'aviso'); return; }

    const audioFile = document.getElementById('ens-audio').files[0];
    const btn = document.querySelector('#page-ensaio .btn-gold');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
        let audioUrl = null;
        let audioNome = null;

        if (audioFile) {
            showToast('Enviando áudio... aguarde.');
            const audioRef = storage.ref('audios/' + Date.now() + '_' + audioFile.name);
            await audioRef.put(audioFile);
            audioUrl = await audioRef.getDownloadURL();
            audioNome = audioFile.name;
        }

        const dados = {
            nome,
            artista: document.getElementById('ens-artista').value.trim() || '',
            tom: document.getElementById('ens-tom').value.trim() || '',
            tipo: document.getElementById('ens-tipo').value,
            letra: document.getElementById('ens-letra').value.trim() || '',
            audioUrl: audioUrl,
            audioNome: audioNome,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('musicas').add(dados);
        musicas.push({ id: docRef.id, ...dados });
        renderMusicas();

        // Limpa os campos
        ['ens-nome', 'ens-artista', 'ens-tom', 'ens-letra'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('ens-audio').value = '';
        document.getElementById('ens-audio-label').textContent = '🎵 Selecionar arquivo de áudio (.mp3, .m4a, .wav)';
        showToast('Música adicionada com sucesso!');
    } catch (err) {
        showToast('Erro ao salvar a música.', 'erro');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = '+ Adicionar ao Repertório';
    }
}

async function removeMusica(id) {
    if (!confirm('Remover esta música?')) return;
    try {
        await db.collection('musicas').doc(id).delete();
        musicas = musicas.filter(m => m.id !== id);
        renderMusicas();
        showToast('Música removida.');
    } catch (err) {
        showToast('Erro ao remover.', 'erro');
    }
}

function renderMusicas() {
    const el = document.getElementById('music-list');
    if (!musicas.length) {
        el.innerHTML = '<p class="empty-msg">Nenhuma música adicionada ainda.</p>';
        return;
    }
    el.innerHTML = musicas.map(m => `
    <div class="music-card">
      <div class="music-info">
        <h4>${m.nome}</h4>
        <p>${m.artista ? m.artista + ' · ' : ''}${m.tom ? 'Tom: ' + m.tom : ''}</p>
        ${m.audioUrl ? `
          <div class="audio-player-wrap">
            <span class="audio-nome">🎵 ${m.audioNome || 'Áudio'}</span>
            <audio controls src="${m.audioUrl}" preload="none"></audio>
          </div>` : ''}
        ${m.letra ? `
          <div class="letra-toggle-wrap">
            <button class="btn-letra-toggle" onclick="toggleLetraMusica(this)">📖 Ver letra</button>
            <pre class="letra-musica-inline" style="display:none;">${escapeHtml(m.letra)}</pre>
          </div>` : ''}
      </div>
      <div class="music-actions">
        <span class="music-tag">${m.tipo}</span>
        <button class="btn-icon danger" onclick="removeMusica('${m.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

function toggleLetraMusica(btn) {
    const pre = btn.nextElementSibling;
    const visivel = pre.style.display !== 'none';
    pre.style.display = visivel ? 'none' : 'block';
    btn.textContent = visivel ? '📖 Ver letra' : '📖 Ocultar letra';
}

// =============================================
// LETRAS DOS HINOS
// =============================================
async function carregarLetras() {
    const snap = await db.collection('letras').orderBy('criadoEm', 'asc').get();
    letras = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLetras();
}

async function addLetra() {
    const titulo = document.getElementById('let-titulo').value.trim();
    const letra = document.getElementById('let-letra').value.trim();
    if (!titulo || !letra) { showToast('Preencha o título e a letra.', 'aviso'); return; }

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
        showToast('Hino salvo!');
    } catch (err) {
        showToast('Erro ao salvar hino.', 'erro');
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
        el.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Nenhum hino salvo ainda.</p>';
        return;
    }
    el.innerHTML = letras.map(l => `
    <div class="letter-card" onclick="openModal('${l.id}')">
      <button class="del-btn" onclick="event.stopPropagation();removeLetra('${l.id}')">✕</button>
      <h4>${l.titulo}${l.autor ? ' — ' + l.autor : ''}</h4>
      <p class="preview">${l.letra}</p>
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
// FESTAS (Varões, Irmãs, Jovens)
// =============================================
async function carregarFestas() {
    for (const festa of ['varoes', 'irmas', 'jovens']) {
        const snap = await db.collection('festas').doc(festa).get();
        if (snap.exists) {
            festas[festa] = snap.data();
        }
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
    if (s) { s.musicas.push({ nome, id: Date.now() }); }
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
    const data = festas[festa].secoes || [];
    if (!data.length) {
        el.innerHTML = '<p class="empty-msg">Nenhuma seção criada. Clique em "+ Nova Seção" para começar.</p>';
        return;
    }
    el.innerHTML = data.map(s => `
    <div class="festa-section">
      <div class="festa-section-title">${s.nome}</div>
      <div class="festa-add">
        <input type="text" id="finput-${s.id}" placeholder="Adicionar música a esta seção..." onkeydown="if(event.key==='Enter')addMusicaFesta('${festa}',${s.id})">
        <button class="btn-sm" onclick="addMusicaFesta('${festa}',${s.id})">+ Adicionar</button>
      </div>
      <ul class="festa-music-list">
        ${s.musicas.length
            ? s.musicas.map((m, i) => `<li><span class="song-num">${String(i + 1).padStart(2, '0')}</span>${m.nome}<button class="del-s" onclick="removeMusicaFesta('${festa}',${s.id},${m.id})">✕</button></li>`).join('')
            : '<li style="color:var(--text-muted);font-style:italic;">Nenhuma música nesta seção ainda.</li>'
        }
      </ul>
    </div>
  `).join('');
}

// =============================================
// GALERIA DE FOTOS
// =============================================
async function carregarFotos() {
    for (const grupo of ['varoes', 'irmas', 'jovens']) {
        try {
            const snap = await db.collection('fotos').where('grupo', '==', grupo).orderBy('criadoEm', 'asc').get();
            fotosData[grupo] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderFotos(grupo);
        } catch (e) { /* índice pode não estar criado ainda */ }
    }
}

async function addFotos(e, grupo) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    showToast('Enviando ' + files.length + ' foto(s)... aguarde.');

    for (const f of files) {
        try {
            const ref = storage.ref(`fotos/${grupo}/${Date.now()}_${f.name}`);
            await ref.put(f);
            const url = await ref.getDownloadURL();
            const dados = {
                url,
                grupo,
                nome: f.name,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await db.collection('fotos').add(dados);
            fotosData[grupo].push({ id: docRef.id, ...dados });
            renderFotos(grupo);
        } catch (err) {
            showToast('Erro ao enviar: ' + f.name, 'erro');
            console.error(err);
        }
    }
    showToast('Fotos salvas com sucesso!');
}

async function removeFoto(grupo, id) {
    if (!confirm('Remover esta foto?')) return;
    try {
        await db.collection('fotos').doc(id).delete();
        fotosData[grupo] = fotosData[grupo].filter(f => f.id !== id);
        renderFotos(grupo);
        showToast('Foto removida.');
    } catch (err) {
        showToast('Erro ao remover foto.', 'erro');
    }
}

function renderFotos(grupo) {
    const el = document.getElementById('grid-fotos-' + grupo);
    if (!fotosData[grupo].length) {
        el.innerHTML = '<div class="photo-item"><div class="photo-placeholder"><span style="font-size:28px;opacity:0.3">📷</span><span>Sem fotos ainda</span></div></div>';
        return;
    }
    el.innerHTML = fotosData[grupo].map(f => `
    <div class="photo-item">
      <img src="${f.url}" alt="Foto do ministério" loading="lazy">
      <button class="del-photo" onclick="removeFoto('${grupo}','${f.id}')">✕</button>
    </div>
  `).join('');
}

// =============================================
// UTILITÁRIOS
// =============================================
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Mostra nome do arquivo selecionado no label de áudio
document.addEventListener('DOMContentLoaded', () => {
    const audioInput = document.getElementById('ens-audio');
    if (audioInput) {
        audioInput.addEventListener('change', () => {
            const label = document.getElementById('ens-audio-label');
            label.textContent = audioInput.files[0]
                ? '🎵 ' + audioInput.files[0].name
                : '🎵 Selecionar arquivo de áudio (.mp3, .m4a, .wav)';
        });
    }
    init();
});
