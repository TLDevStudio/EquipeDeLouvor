let musicas = [];
let letras = [];
let festas = { varoes: { secoes: [] }, irmas: { secoes: [] }, jovens: { secoes: [] } };
let fotosData = { varoes: [], irmas: [], jovens: [] };

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

function setHeroPhoto(e) {
    const f = e.target.files[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    const img = document.getElementById('hero-img');
    img.src = url; img.style.display = 'block';
    document.getElementById('hero-placeholder').style.display = 'none';
}

function addMusica() {
    const nome = document.getElementById('ens-nome').value.trim();
    if (!nome) return;
    const m = {
        nome,
        artista: document.getElementById('ens-artista').value.trim() || '',
        tom: document.getElementById('ens-tom').value.trim() || '',
        link: document.getElementById('ens-link').value.trim() || '',
        tipo: document.getElementById('ens-tipo').value,
        id: Date.now()
    };
    musicas.push(m);
    renderMusicas();
    ['ens-nome', 'ens-artista', 'ens-tom', 'ens-link'].forEach(id => document.getElementById(id).value = '');
}

function removeMusica(id) {
    musicas = musicas.filter(m => m.id !== id);
    renderMusicas();
}

function renderMusicas() {
    const el = document.getElementById('music-list');
    if (!musicas.length) { el.innerHTML = '<p class="empty-msg">Nenhuma música adicionada ainda.</p>'; return; }
    el.innerHTML = musicas.map(m => `
    <div class="music-card">
      <div class="music-info">
        <h4>${m.nome}</h4>
        <p>${m.artista ? m.artista + ' · ' : ''}${m.tom ? 'Tom: ' + m.tom : ''}</p>
      </div>
      <div class="music-actions">
        <span class="music-tag">${m.tipo}</span>
        ${m.link ? `<button class="btn-icon" onclick="window.open('${m.link}','_blank')">▶ Ouvir</button>` : ''}
        <button class="btn-icon danger" onclick="removeMusica(${m.id})">✕</button>
      </div>
    </div>
  `).join('');
}

function addLetra() {
    const titulo = document.getElementById('let-titulo').value.trim();
    const letra = document.getElementById('let-letra').value.trim();
    if (!titulo || !letra) return;
    letras.push({ titulo, autor: document.getElementById('let-autor').value.trim(), letra, id: Date.now() });
    renderLetras();
    ['let-titulo', 'let-autor', 'let-letra'].forEach(id => document.getElementById(id).value = '');
}

function removeLetra(id) {
    letras = letras.filter(l => l.id !== id);
    renderLetras();
}

function renderLetras() {
    const el = document.getElementById('letters-grid');
    if (!letras.length) { el.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Nenhum hino salvo ainda.</p>'; return; }
    el.innerHTML = letras.map(l => `
    <div class="letter-card" onclick="openModal(${l.id})">
      <button class="del-btn" onclick="event.stopPropagation();removeLetra(${l.id})">✕</button>
      <h4>${l.titulo}${l.autor ? ' — ' + l.autor : ''}</h4>
      <p class="preview">${l.letra}</p>
    </div>
  `).join('');
}

function openModal(id) {
    const l = letras.find(x => x.id === id); if (!l) return;
    document.getElementById('modal-title').textContent = l.titulo + (l.autor ? ' — ' + l.autor : '');
    document.getElementById('modal-body').textContent = l.letra;
    document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
    if (!e || e.target === document.getElementById('modal') || e.target.classList.contains('modal-close'))
        document.getElementById('modal').classList.remove('open');
}

function addSecao(festa) {
    const nome = prompt('Nome da seção (ex: Abertura, Adoração, Encerramento):');
    if (!nome) return;
    festas[festa].secoes.push({ nome, musicas: [], id: Date.now() });
    renderFestas(festa);
}

function addMusicaFesta(festa, secaoId) {
    const inp = document.getElementById('finput-' + secaoId);
    const nome = inp.value.trim(); if (!nome) return;
    const s = festas[festa].secoes.find(x => x.id === secaoId);
    if (s) { s.musicas.push({ nome, id: Date.now() }); }
    inp.value = '';
    renderFestas(festa);
}

function removeMusicaFesta(festa, secaoId, musId) {
    const s = festas[festa].secoes.find(x => x.id === secaoId);
    if (s) s.musicas = s.musicas.filter(m => m.id !== musId);
    renderFestas(festa);
}

function renderFestas(festa) {
    const el = document.getElementById('sections-' + festa);
    const data = festas[festa].secoes;
    if (!data.length) { el.innerHTML = '<p class="empty-msg">Nenhuma seção criada. Clique em "+ Nova Seção" para começar.</p>'; return; }
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

function addFotos(e, grupo) {
    const files = Array.from(e.target.files);
    files.forEach(f => {
        const url = URL.createObjectURL(f);
        fotosData[grupo].push({ url, id: Date.now() + Math.random() });
    });
    renderFotos(grupo);
}

function removeFoto(grupo, id) {
    fotosData[grupo] = fotosData[grupo].filter(f => f.id !== id);
    renderFotos(grupo);
}

function renderFotos(grupo) {
    const el = document.getElementById('grid-fotos-' + grupo);
    if (!fotosData[grupo].length) {
        el.innerHTML = '<div class="photo-item"><div class="photo-placeholder"><span style="font-size:28px;opacity:0.3">📷</span><span>Sem fotos ainda</span></div></div>';
        return;
    }
    el.innerHTML = fotosData[grupo].map(f => `
    <div class="photo-item">
      <img src="${f.url}" alt="Foto do ministério">
      <button class="del-photo" onclick="removeFoto('${grupo}',${f.id})">✕</button>
    </div>
  `).join('');
}

renderMusicas(); renderLetras();
['varoes', 'irmas', 'jovens'].forEach(renderFestas);