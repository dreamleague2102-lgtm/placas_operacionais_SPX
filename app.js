/* ============================================================
   SPX EXPRESS — GERADOR DE PLACAS
   app.js — Lógica principal, preview em tempo real e impressão
   ============================================================ */

// ===================== STATE =====================
let currentType = 'shopee';
let qrCache = {};  // cache de QR codes gerados
let shopeeLote = [];
let saidaLote = [];
let nomeLote = [];
let nomeDuploLote = [];
let nomeQuatroLote = [];
let loteImportado = [];
const lotesPorModelo = {};
let pendingPrintWindow = null;

// ===================== TYPE SELECTOR =====================
document.getElementById('typeGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.type-card');
  if (!card) return;
  const type = card.dataset.type;
  switchType(type);
});

function switchType(type) {
  currentType = type;
  document.querySelector('.main-panel').classList.toggle('gaiola-mode', type === 'gaiola');

  // Update card active state
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-type="${type}"]`)?.classList.add('active');

  // Update forms
  document.querySelectorAll('.plate-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`form-${type}`).classList.add('active');

  // Update form header
  const icons = { shopee: '🛒', saida: '📤', nome: '👤', 'nome-duplo': '🏷️', 'nome-quatro': '🞄', lote: '📋', gaiola: '📦', 'qr-simples': '🔲' };
  const titles = {
    shopee: 'Etiqueta Workstation SPX',
    saida: 'Placa de Identificação com QR Code',
    nome: 'Placa de Nome — Folha Inteira',
    'nome-duplo': 'Placas de Nome — 2 por Folha',
    'nome-quatro': 'Placas de Nome — 4 por Folha',
    lote: 'Gerador de Placas em Lote',
    gaiola: 'Placa Completa de Gaiola',
    'qr-simples': 'Etiqueta CG com QR Code'
  };
  const subs = {
    shopee: 'Preencha os campos abaixo',
    saida: 'Crie uma lista de placas com identificação e QR Code',
    nome: 'Nome grande em destaque com listras',
    'nome-duplo': 'Crie uma lista e escolha o tamanho de cada nome',
    'nome-quatro': 'Monte uma grade com quatro placas por folha',
    lote: 'Cole IDs e nomes para gerar todas de uma vez',
    gaiola: 'Defina o intervalo de gaiolas SPX',
    'qr-simples': 'Gere somente o número CG e o QR Code'
  };

  document.getElementById('formIcon').textContent = icons[type];
  document.getElementById('formTitle').textContent = titles[type];
  document.getElementById('formSub').textContent = subs[type];

  // Scroll to panel smoothly
  document.querySelector('.main-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });

  updatePreview();
}

// ===================== INPUT LISTENERS =====================
function addListener(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', fn);
}

// Shopee
addListener('shopee-codigo', updatePreview);
addListener('shopee-numero', updatePreview);
addListener('shopee-rodape', updatePreview);
addListener('shopee-qr', updatePreview);
addListener('shopee-qtd', updatePreview);

// Saida
addListener('saida-codigo', updatePreview);
addListener('saida-qr', updatePreview);
addListener('saida-qtd', updatePreview);

// Nome
addListener('nome-texto', updatePreview);
addListener('nome-qtd', updatePreview);
addListener('nome-fonte', updatePreview);
document.getElementById('nome-negrito').addEventListener('click', function() {
  const ativo = this.getAttribute('aria-pressed') !== 'true';
  this.setAttribute('aria-pressed', String(ativo)); this.classList.toggle('active', ativo); updatePreview();
});
addListener('nome-duplo-texto', updatePreview);
addListener('nome-duplo-tamanho', () => {
  document.getElementById('nome-duplo-tamanho-valor').textContent = `${document.getElementById('nome-duplo-tamanho').value} pt`;
  updatePreview();
});

document.getElementById('nome-duplo-tamanho-auto').addEventListener('change', function() {
  const controle = document.getElementById('nome-duplo-tamanho');
  controle.disabled = this.checked;
  document.getElementById('nome-duplo-tamanho-menor').disabled = this.checked;
  document.getElementById('nome-duplo-tamanho-maior').disabled = this.checked;
  document.getElementById('nome-duplo-tamanho-valor').textContent = this.checked ? 'Automático' : `${controle.value} pt`;
  updatePreview();
});

function alterarTamanhoNomeDuplo(delta) {
  const controle = document.getElementById('nome-duplo-tamanho');
  controle.value = Math.min(160, Math.max(6, (parseInt(controle.value) || 70) + delta));
  controle.dispatchEvent(new Event('input', { bubbles:true }));
}
document.getElementById('nome-duplo-tamanho-menor').addEventListener('click', () => alterarTamanhoNomeDuplo(-1));
document.getElementById('nome-duplo-tamanho-maior').addEventListener('click', () => alterarTamanhoNomeDuplo(1));
addListener('nome-duplo-fonte', updatePreview);
document.getElementById('nome-duplo-negrito').addEventListener('click', function() {
  const ativo = this.getAttribute('aria-pressed') !== 'true';
  this.setAttribute('aria-pressed', String(ativo));
  this.classList.toggle('active', ativo);
  updatePreview();
});

addListener('nome-quatro-texto', updatePreview);
addListener('nome-quatro-tamanho', () => {
  document.getElementById('nome-quatro-tamanho-valor').textContent = `${document.getElementById('nome-quatro-tamanho').value} pt`;
  updatePreview();
});
document.getElementById('nome-quatro-tamanho-auto').addEventListener('change', function() {
  const controle = document.getElementById('nome-quatro-tamanho');
  controle.disabled = this.checked;
  document.getElementById('nome-quatro-tamanho-menor').disabled = this.checked;
  document.getElementById('nome-quatro-tamanho-maior').disabled = this.checked;
  document.getElementById('nome-quatro-tamanho-valor').textContent = this.checked ? 'Automático' : `${controle.value} pt`;
  updatePreview();
});
function alterarTamanhoNomeQuatro(delta) {
  const controle = document.getElementById('nome-quatro-tamanho');
  controle.value = Math.min(160, Math.max(6, (parseInt(controle.value) || 60) + delta));
  controle.dispatchEvent(new Event('input', { bubbles:true }));
}
document.getElementById('nome-quatro-tamanho-menor').addEventListener('click', () => alterarTamanhoNomeQuatro(-1));
document.getElementById('nome-quatro-tamanho-maior').addEventListener('click', () => alterarTamanhoNomeQuatro(1));
addListener('nome-quatro-fonte', updatePreview);
document.getElementById('nome-quatro-negrito').addEventListener('click', function() {
  const ativo = this.getAttribute('aria-pressed') !== 'true';
  this.setAttribute('aria-pressed', String(ativo)); this.classList.toggle('active', ativo); updatePreview();
});
addListener('nome-tamanho', () => {
  document.getElementById('nome-tamanho-valor').textContent = `${document.getElementById('nome-tamanho').value} pt`;
  updatePreview();
});

document.getElementById('nome-tamanho-auto').addEventListener('change', function() {
  const controle = document.getElementById('nome-tamanho');
  controle.disabled = this.checked;
  document.getElementById('nome-tamanho-menor').disabled = this.checked;
  document.getElementById('nome-tamanho-maior').disabled = this.checked;
  document.getElementById('nome-tamanho-valor').textContent = this.checked ? 'Automático' : `${controle.value} pt`;
  updatePreview();
});

function alterarTamanhoNome(delta) {
  const controle = document.getElementById('nome-tamanho');
  controle.value = Math.min(160, Math.max(6, (parseInt(controle.value) || 70) + delta));
  controle.dispatchEvent(new Event('input', { bubbles:true }));
}
document.getElementById('nome-tamanho-menor').addEventListener('click', () => alterarTamanhoNome(-1));
document.getElementById('nome-tamanho-maior').addEventListener('click', () => alterarTamanhoNome(1));

// Gaiola
addListener('gaiola-inicio', () => { updateGaiolaTotal(); updatePreview(); });
addListener('gaiola-fim', () => { updateGaiolaTotal(); updatePreview(); });
addListener('qr-simples-inicio', () => { updateQrSimplesTotal(); updatePreview(); });
addListener('qr-simples-fim', () => { updateQrSimplesTotal(); updatePreview(); });
addListener('lote-modelo', updatePreview);

// Auto-fill QR content from code
document.getElementById('shopee-codigo').addEventListener('input', () => {
  const cod = document.getElementById('shopee-codigo').value;
  const num = document.getElementById('shopee-numero').value;
  const qrEl = document.getElementById('shopee-qr');
  if (!qrEl.dataset.manual) {
    qrEl.value = cod && num ? `${cod}-${num}` : cod || num || '';
    updatePreview();
  }
});
document.getElementById('shopee-numero').addEventListener('input', () => {
  const cod = document.getElementById('shopee-codigo').value;
  const num = document.getElementById('shopee-numero').value;
  const qrEl = document.getElementById('shopee-qr');
  if (!qrEl.dataset.manual) {
    qrEl.value = cod && num ? `${cod}-${num}` : cod || num || '';
    updatePreview();
  }
});
document.getElementById('shopee-qr').addEventListener('input', function() {
  this.dataset.manual = '1';
});

function renderLotes() {
  const shopeeLista = document.getElementById('shopee-lista');
  shopeeLista.innerHTML = shopeeLote.length ? shopeeLote.map((item, index) => `
    <div class="batch-item"><div><strong>${escHtml(item.codigo)}</strong><span>${escHtml(item.numero)} · ${escHtml(item.rodape)}</span></div>
    <button type="button" data-remove-shopee="${index}">Remover</button></div>`).join('')
    : '<div class="batch-empty">Adicione até 3 placas por página.</div>';

  const saidaLista = document.getElementById('saida-lista');
  saidaLista.innerHTML = saidaLote.length ? saidaLote.map((item, index) => `
    <div class="batch-item"><div><strong>${escHtml(item.nome)}</strong></div>
    <button type="button" data-remove-saida="${index}">Remover</button></div>`).join('')
    : '<div class="batch-empty">A lista ainda está vazia.</div>';

  const nomeLista = document.getElementById('nome-lista');
  nomeLista.innerHTML = nomeLote.length ? nomeLote.map((item, index) => `
    <div class="batch-item"><div><strong>${escHtml(item.nome)}</strong><span>${item.familia || 'Calibri'} · ${item.fonteAuto ? 'automática' : `${item.fonte} pt`} · ${item.negrito === false ? 'normal' : 'negrito'}</span></div>
    <button type="button" data-remove-nome="${index}">Remover</button></div>`).join('')
    : '<div class="batch-empty">A lista ainda está vazia.</div>';

  const nomeDuploLista = document.getElementById('nome-duplo-lista');
  nomeDuploLista.innerHTML = nomeDuploLote.length ? nomeDuploLote.map((item, index) => `
    <div class="batch-item nome-duplo-item">
      <div><strong>Placa ${index + 1} · ${index % 2 === 0 ? 'superior' : 'inferior'}</strong><span>${escHtml(item.nome)}</span></div>
      <div class="batch-font-controls">
        <label><input type="checkbox" data-nome-duplo-auto="${index}" ${item.fonteAuto ? 'checked' : ''}> Automático</label>
        <select data-nome-duplo-familia="${index}" aria-label="Fonte da placa ${index + 1}">${['Calibri','Arial','Verdana','Tahoma','Trebuchet MS','Georgia','Times New Roman','Arial Black','Impact'].map(f => `<option value="${f}" ${(item.familia || 'Calibri') === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
        <input type="number" min="6" max="160" value="${item.fonte}" data-nome-duplo-fonte="${index}" ${item.fonteAuto ? 'disabled' : ''} aria-label="Tamanho da fonte da placa ${index + 1}">
        <span>pt</span>
        <button type="button" class="batch-bold-button ${item.negrito === false ? '' : 'active'}" data-nome-duplo-negrito="${index}" title="Ativar ou remover negrito">B</button>
        <button type="button" data-remove-nome-duplo="${index}">Remover</button>
      </div>
    </div>`).join('')
    : '<div class="batch-empty">A lista ainda está vazia.</div>';

  const nomeQuatroLista = document.getElementById('nome-quatro-lista');
  nomeQuatroLista.innerHTML = nomeQuatroLote.length ? nomeQuatroLote.map((item, index) => `
    <div class="batch-item nome-duplo-item"><div><strong>Placa ${index + 1} · posição ${(index % 4) + 1}</strong><span>${escHtml(item.nome)}</span></div>
      <div class="batch-font-controls"><label><input type="checkbox" data-nome-quatro-auto="${index}" ${item.fonteAuto ? 'checked' : ''}> Automático</label>
      <select data-nome-quatro-familia="${index}">${['Calibri','Arial','Verdana','Tahoma','Trebuchet MS','Georgia','Times New Roman','Arial Black','Impact'].map(f => `<option value="${f}" ${(item.familia || 'Calibri') === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
      <input type="number" min="6" max="160" value="${item.fonte}" data-nome-quatro-fonte="${index}" ${item.fonteAuto ? 'disabled' : ''}><span>pt</span>
      <button type="button" class="batch-bold-button ${item.negrito === false ? '' : 'active'}" data-nome-quatro-negrito="${index}">B</button>
      <button type="button" data-remove-nome-quatro="${index}">Remover</button></div></div>`).join('')
    : '<div class="batch-empty">Adicione até quatro nomes por folha.</div>';
}

document.getElementById('add-shopee').addEventListener('click', () => {
  const codigo = document.getElementById('shopee-codigo').value.trim();
  const numero = document.getElementById('shopee-numero').value.trim();
  const rodape = document.getElementById('shopee-rodape').value.trim();
  const qrText = document.getElementById('shopee-qr').value.trim();
  if (!codigo) { alert('Preencha o nome da placa.'); return; }
  shopeeLote.push({ codigo, numero, rodape, qrText: qrText || `${codigo}-${numero}` });
  renderLotes(); updatePreview();
  ['shopee-codigo', 'shopee-numero', 'shopee-rodape', 'shopee-qr'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('shopee-qr').dataset.manual = '';
  document.getElementById('shopee-codigo').focus();
});

document.getElementById('add-saida').addEventListener('click', () => {
  const codigo = document.getElementById('saida-codigo').value.trim();
  const qrText = document.getElementById('saida-qr').value.trim();
  const qtd = Math.min(Math.max(parseInt(document.getElementById('saida-qtd').value) || 1, 1), 20);
  if (!codigo) { alert('Preencha o nome da placa.'); return; }
  if (!qrText) { alert('Preencha o conteúdo do QR Code.'); return; }
  saidaLote.push({ nome: codigo, qrText, qtd });
  renderLotes();
  updatePreview();
  document.getElementById('saida-codigo').value = '';
  document.getElementById('saida-qr').value = '';
  document.getElementById('saida-qtd').value = '1';
});

document.getElementById('add-nome').addEventListener('click', () => {
  const nome = document.getElementById('nome-texto').value.trim().toUpperCase();
  const qtd = Math.min(Math.max(parseInt(document.getElementById('nome-qtd').value) || 1, 1), 20);
  if (!nome) { alert('Preencha o nome da placa.'); return; }
  nomeLote.push({
    nome,
    qtd,
    fonteAuto: document.getElementById('nome-tamanho-auto').checked,
    fonte: parseInt(document.getElementById('nome-tamanho').value) || 70,
    familia: document.getElementById('nome-fonte').value,
    negrito: document.getElementById('nome-negrito').getAttribute('aria-pressed') === 'true'
  });
  renderLotes();
  updatePreview();
  document.getElementById('nome-texto').value = '';
  document.getElementById('nome-qtd').value = '1';
});

document.getElementById('add-nome-duplo').addEventListener('click', () => {
  const campo = document.getElementById('nome-duplo-texto');
  const nome = campo.value.trim().toUpperCase();
  if (!nome) { alert('Preencha o nome da placa.'); return; }
  nomeDuploLote.push({
    nome,
    fonteAuto: document.getElementById('nome-duplo-tamanho-auto').checked,
    fonte: parseInt(document.getElementById('nome-duplo-tamanho').value) || 70,
    familia: document.getElementById('nome-duplo-fonte').value,
    negrito: document.getElementById('nome-duplo-negrito').getAttribute('aria-pressed') === 'true'
  });
  campo.value = '';
  renderLotes(); updatePreview(); campo.focus();
});

document.getElementById('add-nome-quatro').addEventListener('click', () => {
  const campo = document.getElementById('nome-quatro-texto');
  const nome = campo.value.trim().toUpperCase();
  if (!nome) { alert('Preencha o nome da placa.'); return; }
  nomeQuatroLote.push({ nome, fonteAuto: document.getElementById('nome-quatro-tamanho-auto').checked, fonte: parseInt(document.getElementById('nome-quatro-tamanho').value) || 60, familia: document.getElementById('nome-quatro-fonte').value, negrito: document.getElementById('nome-quatro-negrito').getAttribute('aria-pressed') === 'true' });
  campo.value = ''; renderLotes(); updatePreview(); campo.focus();
});

document.getElementById('saida-lista').addEventListener('click', event => {
  const botao = event.target.closest('[data-remove-saida]');
  if (!botao) return;
  saidaLote.splice(Number(botao.dataset.removeSaida), 1);
  renderLotes(); updatePreview();
});

document.getElementById('shopee-lista').addEventListener('click', event => {
  const botao = event.target.closest('[data-remove-shopee]');
  if (!botao) return;
  shopeeLote.splice(Number(botao.dataset.removeShopee), 1);
  renderLotes(); updatePreview();
});

document.getElementById('nome-lista').addEventListener('click', event => {
  const botao = event.target.closest('[data-remove-nome]');
  if (!botao) return;
  nomeLote.splice(Number(botao.dataset.removeNome), 1);
  renderLotes(); updatePreview();
});

document.getElementById('nome-duplo-lista').addEventListener('click', event => {
  const botao = event.target.closest('[data-remove-nome-duplo]');
  const negrito = event.target.closest('[data-nome-duplo-negrito]');
  if (botao) nomeDuploLote.splice(Number(botao.dataset.removeNomeDuplo), 1);
  else if (negrito) {
    const item = nomeDuploLote[Number(negrito.dataset.nomeDuploNegrito)];
    item.negrito = item.negrito === false;
  }
  else return;
  renderLotes(); updatePreview();
});

document.getElementById('nome-duplo-lista').addEventListener('change', event => {
  const auto = event.target.closest('[data-nome-duplo-auto]');
  const fonte = event.target.closest('[data-nome-duplo-fonte]');
  const familia = event.target.closest('[data-nome-duplo-familia]');
  if (auto) {
    nomeDuploLote[Number(auto.dataset.nomeDuploAuto)].fonteAuto = auto.checked;
  } else if (fonte) {
    nomeDuploLote[Number(fonte.dataset.nomeDuploFonte)].fonte = parseInt(fonte.value) || 70;
  } else if (familia) {
    nomeDuploLote[Number(familia.dataset.nomeDuploFamilia)].familia = familia.value;
  } else return;
  renderLotes(); updatePreview();
});

document.getElementById('nome-quatro-lista').addEventListener('click', event => {
  const botao = event.target.closest('[data-remove-nome-quatro]');
  const negrito = event.target.closest('[data-nome-quatro-negrito]');
  if (botao) nomeQuatroLote.splice(Number(botao.dataset.removeNomeQuatro), 1);
  else if (negrito) {
    const item = nomeQuatroLote[Number(negrito.dataset.nomeQuatroNegrito)]; item.negrito = item.negrito === false;
  } else return;
  renderLotes(); updatePreview();
});
document.getElementById('nome-quatro-lista').addEventListener('change', event => {
  const auto = event.target.closest('[data-nome-quatro-auto]');
  const fonte = event.target.closest('[data-nome-quatro-fonte]');
  const familia = event.target.closest('[data-nome-quatro-familia]');
  if (auto) nomeQuatroLote[Number(auto.dataset.nomeQuatroAuto)].fonteAuto = auto.checked;
  else if (fonte) nomeQuatroLote[Number(fonte.dataset.nomeQuatroFonte)].fonte = parseInt(fonte.value) || 60;
  else if (familia) nomeQuatroLote[Number(familia.dataset.nomeQuatroFamilia)].familia = familia.value;
  else return;
  renderLotes(); updatePreview();
});

renderLotes();

// ===================== GERADOR EM LOTE =====================
document.querySelectorAll('[data-bulk-model]').forEach(botao => {
  botao.addEventListener('click', () => {
    const modelo = botao.dataset.bulkModel;
    let painel = botao.parentElement.querySelector(`.inline-bulk-panel[data-modelo="${modelo}"]`);
    if (!painel) {
      painel = document.createElement('div');
      painel.className = 'inline-bulk-panel';
      painel.dataset.modelo = modelo;
      painel.hidden = true;
      painel.innerHTML = `
        <div class="inline-bulk-title"><strong>📋 Importação em lote</strong><button type="button" data-fechar-lote>×</button></div>
        <p>Cole os IDs na primeira coluna e os nomes na segunda. As linhas serão combinadas automaticamente.</p>
        <div class="inline-bulk-columns">
          <label><span>IDs / QR Codes</span><textarea class="field-input bulk-textarea" data-inline-ids rows="7" placeholder="ID-001\nID-002\nID-003"></textarea></label>
          <label><span>Nomes das placas</span><textarea class="field-input bulk-textarea" data-inline-nomes rows="7" placeholder="NOME DA PLACA\nOUTRO NOME\nTERCEIRO NOME"></textarea></label>
        </div>
        <button class="btn-add-plate" type="button" data-inline-importar>Importar lista</button>
        <div class="bulk-actions" data-inline-acoes hidden><label><input type="checkbox" data-inline-todos checked> Selecionar todas</label><strong data-inline-contagem>0 placas</strong></div>
        <div class="plate-batch bulk-list" data-inline-lista><div class="batch-empty">Cole a lista acima para começar.</div></div>
        <button class="btn-print" type="button" data-inline-gerar disabled>📄 Gerar PDF das placas selecionadas</button>`;
      botao.insertAdjacentElement('afterend', painel);
      prepararLoteInline(painel, modelo);
    }
    painel.hidden = !painel.hidden;
    botao.hidden = !painel.hidden;
    botao.textContent = '📋 Importar lista em lote';
    botao.closest('.plate-form').classList.toggle('bulk-mode', !painel.hidden);
  });
});

function prepararLoteInline(painel, modelo) {
  lotesPorModelo[modelo] ||= [];
  const render = () => {
    const itens = lotesPorModelo[modelo];
    const selecionadas = itens.filter(item => item.selecionada).length;
    painel.querySelector('[data-inline-acoes]').hidden = !itens.length;
    painel.querySelector('[data-inline-contagem]').textContent = `${selecionadas} de ${itens.length} placas`;
    painel.querySelector('[data-inline-todos]').checked = Boolean(itens.length) && selecionadas === itens.length;
    painel.querySelector('[data-inline-gerar]').disabled = !selecionadas;
    painel.querySelector('[data-inline-lista]').innerHTML = itens.length ? itens.map((item, index) => `<label class="batch-item"><input type="checkbox" data-inline-item="${index}" ${item.selecionada ? 'checked' : ''}><div><strong>${escHtml(item.id)}</strong><span>${escHtml(item.nome)}</span></div></label>`).join('') : '<div class="batch-empty">Nenhuma linha importada.</div>';
  };
  painel.querySelector('[data-fechar-lote]').addEventListener('click', () => painel.previousElementSibling.click());
  painel.querySelector('[data-inline-importar]').addEventListener('click', () => {
    const ids = painel.querySelector('[data-inline-ids]').value;
    const nomes = painel.querySelector('[data-inline-nomes]').value;
    lotesPorModelo[modelo] = interpretarColunasLote(ids, nomes);
    render();
  });
  painel.querySelector('[data-inline-lista]').addEventListener('change', event => { const item = event.target.closest('[data-inline-item]'); if (!item) return; lotesPorModelo[modelo][Number(item.dataset.inlineItem)].selecionada = item.checked; render(); });
  painel.querySelector('[data-inline-todos]').addEventListener('change', event => { lotesPorModelo[modelo].forEach(item => { item.selecionada = event.target.checked; }); render(); });
  painel.querySelector('[data-inline-gerar]').addEventListener('click', () => {
    loteImportado = lotesPorModelo[modelo].filter(item => item.selecionada);
    document.getElementById('lote-modelo').value = modelo;
    pendingPrintWindow = window.open('', '_blank', 'width=900,height=700');
    if (pendingPrintWindow) {
      pendingPrintWindow.document.write('<!doctype html><html><head><title>Preparando PDF...</title></head><body style="margin:0;background:#111;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;height:100vh"><div style="text-align:center"><h2>Preparando suas placas...</h2><p>Aguarde enquanto os QR Codes são gerados.</p></div></body></html>');
    }
    const gerador = document.getElementById('gerar-lote');
    gerador.disabled = false;
    gerador.click();
  });
  render();
}

document.getElementById('voltar-do-lote').addEventListener('click', () => switchType('shopee'));

function interpretarLote(texto) {
  return String(texto || '').split(/\r?\n/).map(linha => linha.trim()).filter(Boolean).map((linha, index) => {
    const partes = linha.includes('\t') ? linha.split('\t') : linha.includes(';') ? linha.split(';') : linha.split(',');
    const id = String(partes.shift() || '').trim();
    const nome = partes.join(' ').trim();
    return { id, nome, selecionada:true, linha:index + 1 };
  }).filter(item => item.id && item.nome);
}

function interpretarColunasLote(textoIds, textoNomes) {
  if (!String(textoNomes || '').trim() && String(textoIds || '').includes('\t')) return interpretarLote(textoIds);
  const ids = String(textoIds || '').split(/\r?\n/).map(valor => valor.trim());
  const nomes = String(textoNomes || '').split(/\r?\n/).map(valor => valor.trim());
  const total = Math.max(ids.length, nomes.length);
  return Array.from({ length:total }, (_, index) => ({ id:ids[index] || '', nome:nomes[index] || '', selecionada:true, linha:index + 1 }))
    .filter(item => item.id && item.nome);
}

function renderListaLote() {
  const lista = document.getElementById('lote-lista');
  const acoes = document.getElementById('lote-acoes');
  const selecionadas = loteImportado.filter(item => item.selecionada).length;
  acoes.hidden = !loteImportado.length;
  document.getElementById('lote-contagem').textContent = `${selecionadas} de ${loteImportado.length} placas`;
  document.getElementById('lote-selecionar-todos').checked = Boolean(loteImportado.length) && selecionadas === loteImportado.length;
  document.getElementById('gerar-lote').disabled = selecionadas === 0;
  lista.innerHTML = loteImportado.length ? loteImportado.map((item, index) => `
    <label class="batch-item"><input type="checkbox" data-lote-item="${index}" ${item.selecionada ? 'checked' : ''} />
      <div><strong>${escHtml(item.id)}</strong><span>${escHtml(item.nome)}</span></div></label>`).join('')
    : '<div class="batch-empty">Nenhuma linha válida. Use o formato ID; NOME.</div>';
  if (currentType === 'lote') updatePreview();
}

document.getElementById('processar-lote').addEventListener('click', () => {
  loteImportado = interpretarLote(document.getElementById('lote-dados').value);
  renderListaLote();
  if (!loteImportado.length) alert('Nenhuma linha válida foi encontrada. Use uma linha por placa no formato ID; NOME.');
});

document.getElementById('lote-lista').addEventListener('change', event => {
  const controle = event.target.closest('[data-lote-item]');
  if (!controle) return;
  loteImportado[Number(controle.dataset.loteItem)].selecionada = controle.checked;
  renderListaLote();
});

document.getElementById('lote-selecionar-todos').addEventListener('change', function() {
  loteImportado.forEach(item => { item.selecionada = this.checked; });
  renderListaLote();
});

document.getElementById('gerar-lote').addEventListener('click', () => {
  const registros = loteImportado.filter(item => item.selecionada);
  const modelo = document.getElementById('lote-modelo').value;
  if (!registros.length) { alert('Selecione pelo menos uma placa.'); return; }
  const estiloNome = { qtd:1, fonteAuto:true, fonte:70, familia:'Calibri', negrito:true };
  if (modelo === 'shopee') {
    shopeeLote = registros.map(item => ({ codigo:item.nome, numero:item.id, rodape:item.nome, qrText:item.id }));
  } else if (modelo === 'saida') {
    saidaLote = registros.map(item => ({ nome:item.nome, qrText:item.id, qtd:1 }));
  } else if (modelo === 'nome') {
    nomeLote = registros.map(item => ({ nome:item.nome, ...estiloNome }));
  } else if (modelo === 'nome-duplo') {
    nomeDuploLote = registros.map(item => ({ nome:item.nome, ...estiloNome }));
  } else if (modelo === 'nome-quatro') {
    nomeQuatroLote = registros.map(item => ({ nome:item.nome, ...estiloNome }));
  }
  renderLotes();
  document.getElementById(`print-${modelo}`).click();
});

// Force uppercase for nome
document.getElementById('nome-texto').addEventListener('input', function() {
  const pos = this.selectionStart;
  this.value = this.value.toUpperCase();
  this.setSelectionRange(pos, pos);
});

// ===================== GAIOLA TOTAL =====================
function updateGaiolaTotal() {
  const ini = parseInt(document.getElementById('gaiola-inicio').value) || 0;
  const fim = parseInt(document.getElementById('gaiola-fim').value) || 0;
  const total = fim >= ini && ini > 0 ? fim - ini + 1 : 0;
  document.getElementById('gaiolaTotal').textContent = total;
  const intervalo = document.getElementById('gaiolaIntervalo');
  if (intervalo) intervalo.textContent = total ? `CG${ini} → CG${fim}` : 'Informe os IDs inicial e final';
}

function updateQrSimplesTotal() {
  const ini = parseInt(document.getElementById('qr-simples-inicio').value) || 0;
  const fim = parseInt(document.getElementById('qr-simples-fim').value) || 0;
  const total = fim >= ini && ini > 0 ? fim - ini + 1 : 0;
  document.getElementById('qrSimplesTotal').textContent = total;
  document.getElementById('qrSimplesIntervalo').textContent = total ? `CG${ini} → CG${fim}` : 'Informe os IDs inicial e final';
}

// ===================== QR CODE GENERATOR =====================
async function generateQR(text, size = 256) {
  const key = `${text}__${size}`;
  if (qrCache[key]) return qrCache[key];
  try {
    const host = document.createElement('div');
    new QRCode(host, { text: text || ' ', width: size, height: size,
      colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
    const canvas = host.querySelector('canvas');
    if (!canvas) throw new Error('QR Code não foi renderizado');
    qrCache[key] = canvas;
    return canvas;
  } catch (e) {
    console.warn('QR error:', e);
    return null;
  }
}

async function generateQRDataURL(text, size = 256) {
  try {
    const canvas = await generateQR(text, size);
    return canvas ? canvas.toDataURL('image/png') : '';
  } catch (e) {
    return '';
  }
}

// ===================== PREVIEW =====================
async function updatePreview() {
  const area = document.getElementById('previewArea');
  area.innerHTML = '<div style="color:#666;font-size:0.85rem;margin:auto;align-self:center;">⏳ Gerando pré-visualização...</div>';

  try {
    if (currentType === 'shopee') await renderShopeePreview(area);
    else if (currentType === 'saida') await renderSaidaPreview(area);
    else if (currentType === 'nome') renderNomePreview(area);
    else if (currentType === 'nome-duplo') renderNomeDuploPreview(area);
    else if (currentType === 'nome-quatro') renderNomeQuatroPreview(area);
    else if (currentType === 'lote') renderLotePreview(area);
    else if (currentType === 'gaiola') await renderGaiolaPreview(area);
    else if (currentType === 'qr-simples') await renderQrSimplesPreview(area);
  } catch (e) {
    area.innerHTML = `<div style="color:#e8001c;font-size:0.85rem;margin:auto;align-self:center;">⚠ Erro ao gerar preview: ${e.message}</div>`;
  }
}

// ---- SHOPEE / WS ----
async function renderShopeePreview(area) {
  const codigo = document.getElementById('shopee-codigo').value || 'NOME';
  const numero = document.getElementById('shopee-numero').value || 'NOME';
  const rodape = document.getElementById('shopee-rodape').value || 'NOME';
  const qrText = document.getElementById('shopee-qr').value || `${codigo}-${numero}`;
  const itens = shopeeLote.length ? shopeeLote : [{ codigo, numero, rodape, qrText }];

  area.innerHTML = '';
  const paginas = document.createElement('div');
  paginas.className = 'preview-pages';

  for (let inicio = 0; inicio < itens.length; inicio += 3) {
    const folha = document.createElement('div');
    folha.className = 'preview-ws-sheet';
    for (let coluna = 0; coluna < 3; coluna++) {
      const item = itens[inicio + coluna];
      const card = buildShopeeCard(item?.codigo || '', item?.numero || '', item?.rodape || '', Boolean(item));
      if (item) {
        const qrCanvas = await generateQR(item.qrText, 200);
      if (qrCanvas) {
        const img = new Image();
        img.src = qrCanvas.toDataURL();
        card.querySelector('.ws-qr').appendChild(img);
      }
      }
      folha.appendChild(card);
    }
    paginas.appendChild(folha);
  }
  area.appendChild(paginas);
}

function buildShopeeCard(codigo, numero, rodape, preenchida = true) {
  const div = document.createElement('div');
  div.className = 'preview-ws';
  div.innerHTML = `
    <div class="ws-stripe ws-stripe-top"></div>
    <div class="ws-body">
      <div class="ws-name">${escHtml(codigo)}</div>
      <div class="ws-num">${preenchida ? escHtml(numero) : ''}</div>
      <div class="ws-qr"></div>
      <div class="ws-posto">${preenchida ? escHtml(rodape) : ''}</div>
    </div>
    <div class="ws-stripe ws-stripe-bottom"></div>
  `;
  return div;
}

function buildWsPrintPages(itens) {
  const paginas = [];
  for (let inicio = 0; inicio < itens.length; inicio += 3) {
    const etiquetas = [0, 1, 2].map(coluna => {
      const item = itens[inicio + coluna];
      const preenchida = Boolean(item);
      return `<div style="height:5.2in;border:1.5px solid #111;display:flex;flex-direction:column;overflow:hidden;background:#fff;">
        <div style="width:60%;height:.32in;background:repeating-linear-gradient(135deg,#000 0 .18in,transparent .18in .36in);"></div>
        <div style="flex:1;position:relative;text-align:center;font-family:Calibri,Arial,sans-serif;">
          <div style="font-size:20pt;font-weight:700;padding-top:.15in;text-align:center;">${preenchida ? escHtml(item.codigo) : ''}</div>
          <div style="font-size:14pt;font-weight:700;margin-top:.22in;height:.25in;text-align:center;">${preenchida ? escHtml(item.numero) : ''}</div>
          <div style="height:2.35in;margin-top:.24in;display:flex;align-items:center;justify-content:center;">
            ${preenchida && item.qrDataURL ? `<img src="${item.qrDataURL}" style="width:2.25in;height:2.25in;display:block;" />` : ''}
          </div>
          <div style="width:100%;margin-top:.26in;font-size:14pt;font-weight:700;text-align:center;line-height:1;">${preenchida ? escHtml(item.rodape) : ''}</div>
        </div>
        <div style="width:60%;height:.32in;margin-left:40%;background:repeating-linear-gradient(135deg,#000 0 .18in,transparent .18in .36in);"></div>
      </div>`;
    }).join('');

    paginas.push(`<section class="ws-print-page" style="width:11in;height:8.5in;padding:.35in .45in;display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));gap:.22in;background:#fff;align-items:start;
      break-after:page;page-break-after:always;overflow:hidden;">${etiquetas}</section>`);
  }
  return paginas.join('');
}

// ---- SAIDA / PLACA GRANDE ----
async function renderSaidaPreview(area) {
  const codigo = document.getElementById('saida-codigo').value || 'NOME';
  const qrText = document.getElementById('saida-qr').value || 'QR-CODE';
  const qtd = Math.min(parseInt(document.getElementById('saida-qtd').value) || 1, 3);
  const itens = saidaLote.length
    ? saidaLote.flatMap(item => Array.from({ length: item.qtd }, () => item))
    : Array.from({ length: qtd }, () => ({ nome: codigo, qrText }));

  area.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;width:100%;';

  for (const item of itens) {
    const card = document.createElement('div');
    card.className = 'preview-grande';
    card.innerHTML = `
      <div class="grande-stripe-tl"></div>
      <div class="grande-stripe-br"></div>
      <div class="grande-nome">${escHtml(item.nome)}</div>
      <div class="grande-qr"></div>
    `;
    const qrCanvas = await generateQR(item.qrText, 260);
    if (qrCanvas) {
      const img = new Image();
      img.src = qrCanvas.toDataURL();
      img.style.cssText = 'width:130px;height:130px;';
      card.querySelector('.grande-qr').appendChild(img);
    }
    wrap.appendChild(card);
  }
  area.appendChild(wrap);
}

// ---- NOME / SIMPLES ----
function quebrarTextoPlaca(valor) {
  const palavras = String(valor || '').trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (palavras.length <= 2 || palavras.join(' ').length <= 11) return [palavras.join(' ')];
  if (palavras.length === 3) return [palavras.slice(0, 2).join(' '), palavras[2]];
  const meio = Math.ceil(palavras.length / 2);
  return [palavras.slice(0, meio).join(' '), palavras.slice(meio).join(' ')];
}

function tamanhoFonteNome(linhas) {
  const maiorLinha = Math.max(...linhas.map(linha => String(linha).length), 1);
  // 70 pt é o máximo. Textos longos diminuem até caber com segurança na placa.
  return Math.max(28, Math.min(70, Math.floor(1050 / maiorLinha)));
}

function tamanhoFonteNomeSelecionado(linhas, configuracao = null) {
  const automatico = configuracao ? configuracao.fonteAuto : (document.getElementById('nome-tamanho-auto')?.checked ?? true);
  if (automatico) return tamanhoFonteNome(linhas);
  const valor = configuracao ? configuracao.fonte : document.getElementById('nome-tamanho').value;
  return Math.min(160, Math.max(6, parseInt(valor) || 70));
}

function renderNomePreview(area) {
  const nome = document.getElementById('nome-texto').value || 'NOME';
  const qtd = Math.min(parseInt(document.getElementById('nome-qtd').value) || 1, 3);
  const itens = nomeLote.length
    ? nomeLote.flatMap(item => Array.from({ length: item.qtd }, () => item))
    : Array.from({ length: qtd }, () => ({ nome, fonteAuto: document.getElementById('nome-tamanho-auto').checked, fonte: parseInt(document.getElementById('nome-tamanho').value) || 70, familia: document.getElementById('nome-fonte').value, negrito: document.getElementById('nome-negrito').getAttribute('aria-pressed') === 'true' }));

  area.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;width:100%;';

  for (const item of itens) {
    const linhas = quebrarTextoPlaca(item.nome);
    const fontePreview = Math.round(tamanhoFonteNomeSelecionado(linhas, item.fonteAuto === undefined ? null : item) * .83);
    const card = document.createElement('div');
    card.className = 'preview-simples';
    card.innerHTML = `
      <div class="simples-stripe-tl"></div>
      <div class="simples-stripe-br"></div>
      <div class="simples-nome" style="--nome-font-size:${fontePreview}px;font-family:'${item.familia || 'Calibri'}',Arial,sans-serif;font-weight:${item.negrito === false ? 400 : 700}">${linhas.map(linha => `<span>${escHtml(linha)}</span>`).join('')}</div>
    `;
    wrap.appendChild(card);
  }
  area.appendChild(wrap);
}

function renderNomeDuploPreview(area) {
  const nomeAtual = document.getElementById('nome-duplo-texto').value.trim().toUpperCase() || 'NOME';
  const itens = nomeDuploLote.length ? nomeDuploLote : [{
    nome: nomeAtual,
    fonteAuto: document.getElementById('nome-duplo-tamanho-auto').checked,
    fonte: parseInt(document.getElementById('nome-duplo-tamanho').value) || 70,
    familia: document.getElementById('nome-duplo-fonte').value,
    negrito: document.getElementById('nome-duplo-negrito').getAttribute('aria-pressed') === 'true'
  }];
  const exibidos = itens.slice(0, 2);
  while (exibidos.length < 2) exibidos.push(null);
  area.innerHTML = '';
  const folha = document.createElement('div');
  folha.style.cssText = 'width:min(100%,760px);aspect-ratio:11/8.5;background:#fff;padding:28px;display:grid;grid-template-rows:1fr 1fr;gap:28px;';
  folha.innerHTML = exibidos.map(item => `<div style="position:relative;border:1.5px solid #777;overflow:hidden;color:#000;">
    <div style="position:absolute;left:0;top:0;width:42%;height:24px;background:repeating-linear-gradient(135deg,#000 0 22px,#fff 22px 35px);"></div>
    <div style="position:absolute;right:0;bottom:0;width:42%;height:24px;background:repeating-linear-gradient(135deg,#000 0 22px,#fff 22px 35px);"></div>
    <div style="position:absolute;inset:35px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:${item?.negrito === false ? 400 : 700};font-size:${item ? Math.min(tamanhoFonteNomeSelecionado(quebrarTextoPlaca(item.nome), item), 90) : 60}px;font-family:'${item?.familia || 'Calibri'}',Arial,sans-serif;">${item ? escHtml(item.nome) : ''}</div>
  </div>`).join('');
  area.appendChild(folha);
}

function renderNomeQuatroPreview(area) {
  const atual = document.getElementById('nome-quatro-texto').value.trim().toUpperCase() || 'NOME';
  const itens = nomeQuatroLote.length ? nomeQuatroLote.slice(0, 4) : [{ nome: atual, fonteAuto: document.getElementById('nome-quatro-tamanho-auto').checked, fonte: parseInt(document.getElementById('nome-quatro-tamanho').value) || 60, familia: document.getElementById('nome-quatro-fonte').value, negrito: document.getElementById('nome-quatro-negrito').getAttribute('aria-pressed') === 'true' }];
  while (itens.length < 4) itens.push(null);
  area.innerHTML = '';
  const folha = document.createElement('div');
  folha.style.cssText = 'width:min(100%,900px);aspect-ratio:11/8.5;background:#fff;padding:34px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:34px;';
  folha.innerHTML = itens.map(item => `<div style="position:relative;border:1.5px solid #777;overflow:hidden;color:#000;">
    <div style="position:absolute;left:0;top:0;width:42%;height:22px;background:repeating-linear-gradient(135deg,#000 0 22px,#fff 22px 35px);"></div>
    <div style="position:absolute;right:0;bottom:0;width:42%;height:22px;background:repeating-linear-gradient(135deg,#000 0 22px,#fff 22px 35px);"></div>
    <div style="position:absolute;inset:30px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:${item?.negrito === false ? 400 : 700};font-size:${item ? Math.min(tamanhoFonteNomeSelecionado(quebrarTextoPlaca(item.nome), item), 70) : 48}px;font-family:'${item?.familia || 'Calibri'}',Arial,sans-serif;">${item ? escHtml(item.nome) : ''}</div>
  </div>`).join('');
  area.appendChild(folha);
}

function renderLotePreview(area) {
  const selecionados = loteImportado.filter(item => item.selecionada);
  const modelo = document.getElementById('lote-modelo');
  area.innerHTML = `<div class="bulk-preview-panel">
    <div class="bulk-preview-icon">📋</div>
    <h3>${selecionados.length ? `${selecionados.length} placas prontas` : 'Gerador em lote'}</h3>
    <p>Modelo: <strong>${escHtml(modelo.options[modelo.selectedIndex].text)}</strong></p>
    <div class="bulk-preview-rows">${selecionados.slice(0, 6).map(item => `<div><span>${escHtml(item.id)}</span><strong>${escHtml(item.nome)}</strong></div>`).join('') || '<small>Cole a lista e clique em “Importar lista”.</small>'}</div>
    ${selecionados.length > 6 ? `<small>+ ${selecionados.length - 6} outras placas</small>` : ''}
  </div>`;
}

// ---- GAIOLA SPX ----
async function renderGaiolaPreview(area) {
  const ini = parseInt(document.getElementById('gaiola-inicio').value) || 0;
  const fim = parseInt(document.getElementById('gaiola-fim').value) || 0;
  const total = fim >= ini && ini > 0 ? fim - ini + 1 : 0;

  area.innerHTML = '';

  // Show first one as preview
  const previewCg = total ? `CG${ini}` : 'CG-ID';
  const qrCanvas = await generateQR(previewCg, 160);

  const card = document.createElement('div');
  card.className = 'preview-gaiola';
  card.innerHTML = `
    <div class="gaiola-header-bar">
      <div class="gaiola-spx-badge">SPX</div>
      <div class="gaiola-title">QR Code Shopee</div>
    </div>
    <div class="gaiola-warn">Favor não remover.</div>
    <div class="gaiola-body">
      <div class="gaiola-instrucoes">
        <h4>O que fazer se:</h4>
        <ul>
          <li>Essa gaiola estiver ocupada sistemicamente? <b>Informe o CG ao COP.</b></li>
          <li>Se você encontrar essa placa no chão? <b>Leve ao COP.</b></li>
          <li>Se o <b>QR code</b> estiver rasgado, manchado ou rasurado? <b>Informe o CG ou leve a gaiola ao COP.</b></li>
          <li>Se o <b>QR code</b> apresentar erro na leitura? <b>Informe o CG ao COP.</b></li>
        </ul>
        <h4>Orientações:</h4>
        <ul>
          <li>Não imprima essa etiqueta por conta própria, essa ação pode gerar duplicidade.</li>
          <li>Não cole nada sobre essa placa.</li>
          <li>Não arranque essa placa em nenhuma hipótese, ela está vinculada exclusivamente a essa gaiola.</li>
          <li>Cuidado ao transportar essa gaiola.</li>
        </ul>
      </div>
      <div class="gaiola-right">
        <div class="gaiola-qr-label">Não cole nada acima do QR code.</div>
        <div class="gaiola-qr-box">
          <div class="gaiola-cg">${escHtml(previewCg)}</div>
          <div class="gaiola-qr"></div>
        </div>
      </div>
    </div>
    <div class="gaiola-rodape">Lembre-se: Segurança em primeiro lugar.</div>
  `;

  if (qrCanvas) {
    const img = new Image();
    img.src = qrCanvas.toDataURL();
    img.style.cssText = 'width:80px;height:80px;';
    card.querySelector('.gaiola-qr').appendChild(img);
  }

  const note = document.createElement('div');
  note.style.cssText = 'color:#888;font-size:0.75rem;text-align:center;margin-top:4px;';
  note.textContent = total > 1 ? `Pré-visualização do CG${ini} · ${total} placas serão impressas (CG${ini}–CG${fim})` : total === 1 ? `Placa CG${ini}` : 'Exemplo: preencha o ID inicial e o ID final para gerar as placas.';

  area.appendChild(card);
  area.appendChild(note);
}

// ---- QR CODE + NUMERO ----
async function renderQrSimplesPreview(area) {
  const ini = parseInt(document.getElementById('qr-simples-inicio').value) || 0;
  const fim = parseInt(document.getElementById('qr-simples-fim').value) || 0;
  const total = fim >= ini && ini > 0 ? fim - ini + 1 : 0;
  const cg = total ? `CG${ini}` : 'CG-ID';
  const qrCanvas = await generateQR(cg, 260);

  area.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:min(100%,390px);margin:auto;color:#000;font-family:Arial,sans-serif;';
  wrap.innerHTML = `
    <div style="height:540px;border:1.5px solid #777;border-radius:5px;background:#fff;display:flex;
      flex-direction:column;align-items:center;padding-top:75px;gap:38px;">
      <div style="font-size:52px;font-weight:900;line-height:1;">${escHtml(cg)}</div>
      <div class="qr-simples-preview-code"></div>
    </div>`;
  if (qrCanvas) {
    const img = new Image();
    img.src = qrCanvas.toDataURL();
    img.style.cssText = 'width:270px;height:270px;display:block;';
    wrap.querySelector('.qr-simples-preview-code').appendChild(img);
  }
  area.appendChild(wrap);
}

// ===================== PRINT FUNCTIONS =====================

// PRINT SHOPEE (WS layout — 3 per row, portrait 8.5×11)
document.getElementById('print-shopee').addEventListener('click', async () => {
  const codigo = document.getElementById('shopee-codigo').value.trim();
  const numero = document.getElementById('shopee-numero').value.trim();
  const rodape = document.getElementById('shopee-rodape').value.trim();
  const qrText = document.getElementById('shopee-qr').value.trim();
  if (!shopeeLote.length && !codigo) { alert('Adicione uma placa ao painel ou preencha o nome da placa.'); return; }

  const base = shopeeLote.length ? shopeeLote : [{ codigo, numero, rodape, qrText: qrText || `${codigo}-${numero}` }];
  const itens = [];
  for (const item of base) {
    itens.push({ ...item, qrDataURL: await generateQRDataURL(item.qrText, 600) });
  }
  triggerPrint(buildWsPrintPages(itens), 'landscape');
  return;

  // Build print HTML - 3 plates per row, coordinates based on table:
  // Name X: 0.41, 3.74, 7.07 | Y: 1.62 (from sheet top), H: 0.30, 14pt
  // QR X: 0.37, 3.70, 7.03  | Y: 1.85, W: 2.57, H: 2.36
  // Posto X: 0.41, 3.74, 7.07 | Y: 4.25, H: 0.30, 12pt

  const COLS = [0, 1, 2];
  const COL_X_NAME = [0.41, 3.74, 7.07];   // in
  const COL_X_QR   = [0.37, 3.70, 7.03];   // in

  // Stripe positions (slightly above name, below posto)
  const STRIPE_TOP_Y = 0.35;
  const NAME_Y       = 0.78;
  const QR_Y         = 1.65;
  const POSTO_Y      = 4.65;
  const STRIPE_BOT_Y = 7.45;
  const SHOPEE_Y     = 0.40;

  const ROW_HEIGHT   = 5.2;    // in — vertical gap between rows

  let plates = '';
  const rows = Math.ceil(qtd / 3);
  let count = 0;

  for (let row = 0; row < rows; row++) {
    const offsetY = row * ROW_HEIGHT;
    for (let col = 0; col < 3; col++) {
      const xn = COL_X_NAME[col];
      const xq = COL_X_QR[col];
      const preenchida = count < qtd;
      if (preenchida) count++;

      plates += `
        <!-- Row ${row}, Col ${col} -->
        <div style="position:absolute;left:${xq - 0.12}in;top:${0.22 + offsetY}in;width:2.86in;height:7.85in;
          border:1.5px solid #111;box-sizing:border-box;"></div>
        <!-- Stripe top -->
        <div style="position:absolute;left:${xq}in;top:${STRIPE_TOP_Y + offsetY}in;width:2.57in;height:0.30in;
          background:repeating-linear-gradient(135deg,#000 0 0.18in,#fff 0.18in 0.36in);"></div>
        <!-- Name -->
        <div style="position:absolute;left:${xn}in;top:${NAME_Y + offsetY}in;width:2.42in;height:0.30in;
          font-size:14pt;font-weight:800;font-family:Inter,sans-serif;
          display:flex;align-items:center;justify-content:center;text-align:center;">
          ${escHtml(nomeFormatado)}
        </div>
        <!-- Numero -->
        <div style="position:absolute;left:${xn}in;top:${NAME_Y + 0.50 + offsetY}in;width:2.42in;height:0.25in;
          font-size:11pt;font-weight:600;font-family:Inter,sans-serif;
          display:flex;align-items:center;justify-content:center;text-align:center;">
          ${preenchida ? escHtml(numero) : ''}
        </div>
        <!-- QR -->
        <div style="position:absolute;left:${xq}in;top:${QR_Y + offsetY}in;width:2.57in;height:2.36in;
          display:flex;align-items:center;justify-content:center;">
          ${preenchida && qrDataURL ? `<img src="${qrDataURL}" style="width:2.3in;height:2.3in;" />` : ''}
        </div>
        <!-- Posto -->
        <div style="position:absolute;left:${xn}in;top:${POSTO_Y + offsetY}in;width:2.42in;height:0.30in;
          font-size:12pt;font-weight:700;font-family:Inter,sans-serif;
          display:flex;align-items:center;justify-content:center;text-align:center;">
          ${preenchida ? escHtml(rodape) : ''}
        </div>
        <!-- Stripe bottom -->
        <div style="position:absolute;left:${xq}in;top:${STRIPE_BOT_Y + offsetY}in;width:2.57in;height:0.30in;
          background:repeating-linear-gradient(135deg,#000 0 0.18in,#fff 0.18in 0.36in);"></div>
      `;
    }
  }

  const html = `
    <div style="width:11in;min-height:${Math.max(8.5, rows * ROW_HEIGHT)}in;position:relative;background:#fff;
      font-family:Inter,sans-serif;color:#000;">
      ${plates}
    </div>
  `;

  triggerPrint(html, 'landscape');
});

// PRINT SAIDA (Placa Grande — landscape)
document.getElementById('print-saida').addEventListener('click', async () => {
  const codigo = document.getElementById('saida-codigo').value.trim();
  const qrText = document.getElementById('saida-qr').value.trim();
  const qtd = Math.min(parseInt(document.getElementById('saida-qtd').value) || 1, 20);

  if (!saidaLote.length && !codigo) { alert('Adicione uma placa à lista ou preencha o nome da placa.'); return; }
  if (!saidaLote.length && !qrText) { alert('Preencha o conteúdo do QR Code.'); return; }
  const atual = codigo && qrText ? { nome: codigo, qrText, qtd } : null;
  const itens = (saidaLote.length ? saidaLote : [atual])
    .flatMap(item => Array.from({ length: item.qtd }, () => item));

  // Measurements from table (landscape letter: 11×8.5in):
  // Nome: X=0.73, Y=2.31, W=4.54, H=0.85, font 48pt
  // QR:   X=5.14, Y=1.01, W=4.05, H=3.60

  let pages = '';

  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    const qrDataURL = await generateQRDataURL(item.qrText, 600);
    pages += `<section class="out-print-page" style="width:10.98in;height:8.48in;position:relative;overflow:hidden;background:#fff;break-after:page;page-break-after:always;">
      <!-- Placa Grande ${i+1} -->
      <div style="position:absolute;left:0.22in;top:0.22in;width:10.54in;height:8.04in;
        border:1.5px solid #111;box-sizing:border-box;"></div>
      <!-- Stripe top-left -->
      <div style="position:absolute;left:0.30in;top:0.82in;width:4.45in;height:0.40in;
        background:repeating-linear-gradient(135deg,#000 0 .38in,#fff .38in .58in);"></div>
      <!-- Stripe bottom-right -->
      <div style="position:absolute;right:0.30in;bottom:0.82in;width:4.45in;height:0.40in;
        background:repeating-linear-gradient(135deg,#000 0 .38in,#fff .38in .58in);"></div>
      <!-- Nome OUT -->
      <div style="position:absolute;left:5%;top:50%;transform:translateY(-50%);width:44%;height:1.05in;
        font-size:48pt;font-weight:900;font-family:Inter,sans-serif;
        display:flex;align-items:center;justify-content:center;text-align:center;">
        ${escHtml(item.nome)}
      </div>
      <!-- QR -->
      <div style="position:absolute;right:8%;top:50%;transform:translateY(-50%);width:3.40in;height:3.40in;
        display:flex;align-items:center;justify-content:center;">
        ${qrDataURL ? `<img src="${qrDataURL}" style="width:3.40in;height:3.40in;object-fit:contain;display:block;" />` : ''}
      </div>
    </section>`;
  }

  triggerPrint(pages, 'landscape');
});

// PRINT NOME (Simples — landscape)
document.getElementById('print-nome').addEventListener('click', () => {
  const nome = document.getElementById('nome-texto').value.trim();
  const qtd = Math.min(parseInt(document.getElementById('nome-qtd').value) || 1, 20);

  if (!nomeLote.length && !nome) { alert('Adicione um nome à lista ou preencha o nome.'); return; }
  const itens = nomeLote.length
    ? nomeLote.flatMap(item => Array.from({ length: item.qtd }, () => item))
    : Array.from({ length: qtd }, () => ({ nome, fonteAuto: document.getElementById('nome-tamanho-auto').checked, fonte: parseInt(document.getElementById('nome-tamanho').value) || 70, familia: document.getElementById('nome-fonte').value, negrito: document.getElementById('nome-negrito').getAttribute('aria-pressed') === 'true' }));
  const placa = (item) => {
    const linhas = quebrarTextoPlaca(item.nome);
    const fonte = tamanhoFonteNomeSelecionado(linhas, item.fonteAuto === undefined ? null : item);
    return `<section class="simple-print-page" style="width:10.98in;height:8.48in;padding:.22in;overflow:hidden;page-break-after:always;break-after:page;background:#fff;">
    <div style="width:100%;height:100%;position:relative;border:1.5px solid #555;overflow:hidden;">
      <div style="position:absolute;left:.12in;top:.82in;width:45%;height:.82in;background:repeating-linear-gradient(135deg,#000 0 .38in,#fff .38in .58in);"></div>
      <div style="position:absolute;right:.12in;bottom:.82in;width:45%;height:.82in;background:repeating-linear-gradient(135deg,#000 0 .38in,#fff .38in .58in);"></div>
      <div style="position:absolute;inset:1.45in .9in;display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-weight:${item.negrito === false ? 400 : 700};font-size:${fonte}pt;line-height:1.08;font-family:'${item.familia || 'Calibri'}',Arial,sans-serif;text-align:center;color:#000;">
        ${linhas.map(linha => `<div>${escHtml(linha)}</div>`).join('')}
      </div>
    </div>
  </section>`;
  };
  triggerPrint(itens.map(placa).join(''), 'landscape');
  return;

  // Measurements: Nome X=1.32, Y=1.83, W=7.30, H=1.57, font 80pt
  // Landscape letter: 11×8.5in
  const PAGE_H = 8.5;
  let pages = '';

  for (let i = 0; i < qtd; i++) {
    const offsetY = i * PAGE_H;
    pages += `
      <!-- Placa Simples ${i+1} -->
      <!-- Border -->
      <div style="position:absolute;left:0.28in;top:${0.22 + offsetY}in;width:10.44in;height:8.06in;
        border:1.5px solid #555;box-sizing:border-box;"></div>
      <!-- Stripe top-left -->
      <div style="position:absolute;left:0.28in;top:${0.22 + offsetY}in;width:4.25in;height:0.72in;
        background:repeating-linear-gradient(135deg,#000 0 .34in,#fff .34in .52in);"></div>
      <!-- Stripe bottom-right -->
      <div style="position:absolute;right:0.28in;top:${7.56 + offsetY}in;width:4.25in;height:0.72in;
        background:repeating-linear-gradient(135deg,#000 0 .34in,#fff .34in .52in);"></div>
      <!-- Nome -->
      <div style="position:absolute;left:1.32in;top:${1.83 + offsetY}in;width:7.30in;height:1.57in;
        font-size:80pt;font-weight:900;font-family:Calibri,Arial,sans-serif;line-height:1;
        display:flex;align-items:center;justify-content:center;text-align:center;text-transform:uppercase;">
        ${escHtml(nome.toUpperCase())}
      </div>
    `;
  }

  const html = `
    <div style="width:11in;min-height:${qtd * PAGE_H}in;position:relative;background:#fff;
      font-family:Inter,sans-serif;color:#000;">
      ${pages}
    </div>
  `;

  triggerPrint(html, 'landscape');
});

// PRINT NOME QUATRO (4 placas por folha)
document.getElementById('print-nome-quatro').addEventListener('click', () => {
  const atual = document.getElementById('nome-quatro-texto').value.trim().toUpperCase();
  const itens = nomeQuatroLote.length ? [...nomeQuatroLote] : atual ? [{ nome: atual, fonteAuto: document.getElementById('nome-quatro-tamanho-auto').checked, fonte: parseInt(document.getElementById('nome-quatro-tamanho').value) || 60, familia: document.getElementById('nome-quatro-fonte').value, negrito: document.getElementById('nome-quatro-negrito').getAttribute('aria-pressed') === 'true' }] : [];
  if (!itens.length) { alert('Adicione pelo menos um nome à lista.'); return; }
  const paginas = [];
  for (let i = 0; i < itens.length; i += 4) {
    const grupo = itens.slice(i, i + 4); while (grupo.length < 4) grupo.push(null);
    const placas = grupo.map(item => `<div style="position:relative;border:1.5px solid #777;overflow:hidden;background:#fff;">
      ${item ? `<div style="position:absolute;left:0;top:0;width:42%;height:.25in;background:repeating-linear-gradient(135deg,#000 0 .30in,#fff .30in .47in);"></div>
      <div style="position:absolute;right:0;bottom:0;width:42%;height:.25in;background:repeating-linear-gradient(135deg,#000 0 .30in,#fff .30in .47in);"></div>
      <div style="position:absolute;inset:.45in;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:${item.negrito === false ? 400 : 700};font-size:${tamanhoFonteNomeSelecionado(quebrarTextoPlaca(item.nome), item)}pt;line-height:1.05;font-family:'${item.familia || 'Calibri'}',Arial,sans-serif;color:#000;text-transform:uppercase;">${escHtml(item.nome)}</div>` : ''}
    </div>`).join('');
    paginas.push(`<section style="width:10.98in;height:8.48in;padding:.5in;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.35in;background:#fff;overflow:hidden;page-break-after:always;break-after:page;">${placas}</section>`);
  }
  triggerPrint(paginas.join(''), 'landscape', 'Placas de Nome — 4 por folha');
});

// PRINT NOME DUPLO (2 placas por folha)
document.getElementById('print-nome-duplo').addEventListener('click', () => {
  const campo = document.getElementById('nome-duplo-texto');
  const atual = campo.value.trim().toUpperCase();
  const itens = nomeDuploLote.length
    ? [...nomeDuploLote]
    : atual ? [{
        nome: atual,
        fonteAuto: document.getElementById('nome-duplo-tamanho-auto').checked,
        fonte: parseInt(document.getElementById('nome-duplo-tamanho').value) || 70,
        familia: document.getElementById('nome-duplo-fonte').value,
        negrito: document.getElementById('nome-duplo-negrito').getAttribute('aria-pressed') === 'true'
      }] : [];
  if (!itens.length) { alert('Adicione pelo menos um nome à lista.'); return; }

  const paginas = [];
  for (let i = 0; i < itens.length; i += 2) {
    const dupla = [itens[i], itens[i + 1]];
    const placas = dupla.map(item => `<div style="height:3.65in;position:relative;border:1.5px solid #777;overflow:hidden;background:#fff;">
      ${item ? `<div style="position:absolute;left:0;top:0;width:42%;height:.28in;background:repeating-linear-gradient(135deg,#000 0 .34in,#fff .34in .52in);"></div>
      <div style="position:absolute;right:0;bottom:0;width:42%;height:.28in;background:repeating-linear-gradient(135deg,#000 0 .34in,#fff .34in .52in);"></div>
      <div style="position:absolute;inset:.55in .65in;display:flex;align-items:center;justify-content:center;text-align:center;
        font-weight:${item?.negrito === false ? 400 : 700};font-size:${item ? tamanhoFonteNomeSelecionado(quebrarTextoPlaca(item.nome), item) : 70}pt;line-height:1.05;font-family:'${item?.familia || 'Calibri'}',Arial,sans-serif;color:#000;text-transform:uppercase;">${escHtml(item.nome)}</div>` : ''}
    </div>`).join('');
    paginas.push(`<section class="nome-duplo-print-page" style="width:10.98in;height:8.48in;padding:.38in .62in;display:grid;
      grid-template-rows:3.65in 3.65in;gap:.42in;background:#fff;overflow:hidden;page-break-after:always;break-after:page;">${placas}</section>`);
  }
  triggerPrint(paginas.join(''), 'landscape', 'Placas de Nome');
});

// PRINT GAIOLA SPX
document.getElementById('print-gaiola').addEventListener('click', async () => {
  const ini = parseInt(document.getElementById('gaiola-inicio').value);
  const fim = parseInt(document.getElementById('gaiola-fim').value);

  if (!ini || !fim || fim < ini) {
    alert('Preencha corretamente os números inicial e final.');
    return;
  }
  if (fim - ini + 1 > 50) {
    if (!confirm(`Você vai imprimir ${fim - ini + 1} placas. Continuar?`)) return;
  }

  // Generate all QR codes first
  const pages = [];
  for (let n = ini; n <= fim; n++) {
    const cg = `CG${n}`;
    const url = await generateQRDataURL(cg, 600);
    pages.push({ cg, url });
  }

  const pagesHtml = pages.map(({ cg, url }) => `
    <section class="gaiola-print-page" style="width:8.48in;height:10.98in;position:relative;overflow:hidden;background:#fff;
      font-family:Arial,Inter,sans-serif;color:#000;page-break-after:always;break-after:page;">
      <div style="height:1.48in;background:#d3d3d3;display:flex;align-items:center;padding:0 .48in;gap:.75in;position:relative;overflow:hidden;">
        <div style="font:italic 900 39pt/1 Arial,sans-serif;letter-spacing:-3px;position:relative;">SPX
          <span style="display:block;font:700 6pt Arial;letter-spacing:0;text-align:right;">EXPRESS</span>
        </div>
        <div style="font-size:30pt;font-weight:900;">QR Code Shopee</div>
        <div style="position:absolute;left:-5%;right:-5%;bottom:-.01in;height:.25in;background:#fff;border-radius:50% 50% 0 0/100% 100% 0 0;"></div>
      </div>

      <div style="margin:0 .28in;border-top:1px solid #aaa;border-bottom:1px solid #aaa;height:.90in;
        display:flex;align-items:center;justify-content:center;font-size:20pt;">Favor não remover.</div>

      <div style="height:7.72in;padding:0 .20in;display:grid;grid-template-columns:3.25in 1fr;gap:.30in;">
        <div>
          <div style="background:#d9d9d9;border-radius:4px;padding:.12in .14in;font-size:13pt;font-weight:700;margin-bottom:.16in;">O que fazer se:</div>
          <ul style="padding-left:.22in;margin:0 0 .55in;">
            <li style="font-size:10pt;line-height:1.55;margin-bottom:.15in;">Essa gaiola estiver ocupada sistemicamente? Informe o CG ao COP.</li>
            <li style="font-size:10pt;line-height:1.55;margin-bottom:.15in;">Se você encontrar essa placa no chão? Leve ao COP.</li>
            <li style="font-size:10pt;line-height:1.55;margin-bottom:.15in;">Se o <b>QR code</b> estiver rasgado, manchado ou rasurado? Informe o CG ou leve a gaiola ao COP.</li>
            <li style="font-size:10pt;line-height:1.55;">Se o <b>QR code</b> apresentar erro na leitura? Informe o CG ao COP.</li>
          </ul>
          <div style="background:#d9d9d9;border-radius:4px;padding:.12in .14in;font-size:13pt;font-weight:700;margin-bottom:.16in;">Orientações:</div>
          <ul style="padding-left:.22in;margin:0;">
            <li style="font-size:10pt;line-height:1.55;margin-bottom:.15in;">Não imprima essa etiqueta por conta própria, essa ação pode gerar duplicidade.</li>
            <li style="font-size:10pt;line-height:1.55;margin-bottom:.15in;">Não cole nada sobre essa placa.</li>
            <li style="font-size:10pt;line-height:1.55;margin-bottom:.15in;">Não arranque essa placa em nenhuma hipótese, ela está vinculada exclusivamente a essa gaiola.</li>
            <li style="font-size:10pt;line-height:1.55;">Cuidado ao transportar essa gaiola.</li>
          </ul>
        </div>

        <div style="padding-top:.82in;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:10pt;text-align:center;margin-bottom:.08in;">Não cole nada acima do QR code.</div>
          <div style="width:3.72in;height:5.05in;border:1.5px solid #777;border-radius:4px;display:flex;
            flex-direction:column;align-items:center;padding-top:.65in;gap:.38in;">
            <div style="font-size:36pt;font-weight:900;line-height:1;">${cg}</div>
            ${url ? `<img src="${url}" style="width:2.85in;height:2.85in;display:block;" />` : ''}
          </div>
        </div>
      </div>

      <div style="position:absolute;left:0;right:0;bottom:0;height:.55in;background:#d3d3d3;
        display:flex;align-items:center;justify-content:center;font-size:14pt;font-weight:700;">
        Lembre-se: Segurança em primeiro lugar.
      </div>
    </section>
  `).join('');

  triggerPrint(pagesHtml, 'portrait');
});
document.getElementById('nome-duplo-texto').addEventListener('input', function() {
  const pos = this.selectionStart;
  this.value = this.value.toUpperCase();
  this.setSelectionRange(pos, pos);
});
document.getElementById('nome-quatro-texto').addEventListener('input', function() {
  const pos = this.selectionStart; this.value = this.value.toUpperCase(); this.setSelectionRange(pos, pos);
});

// PRINT SOMENTE NUMERO + QR CODE
document.getElementById('print-gaiola-qr').addEventListener('click', async () => {
  const ini = parseInt(document.getElementById('qr-simples-inicio').value);
  const fim = parseInt(document.getElementById('qr-simples-fim').value);

  if (!ini || !fim || fim < ini) {
    alert('Preencha corretamente os números inicial e final.');
    return;
  }

  const total = fim - ini + 1;
  if (total > 50 && !confirm(`Você vai imprimir ${total} etiquetas. Continuar?`)) return;

  const etiquetas = [];
  for (let n = ini; n <= fim; n++) {
    const cg = `CG${n}`;
    etiquetas.push({ cg, url: await generateQRDataURL(cg, 600) });
  }

  const pagesHtml = etiquetas.map(({ cg, url }) => `
    <section class="gaiola-print-page" style="width:8.48in;height:10.98in;display:flex;align-items:center;
      justify-content:center;overflow:hidden;background:#fff;font-family:Arial,Inter,sans-serif;
      color:#000;page-break-after:always;break-after:page;">
      <div style="width:7.55in;">
        <div style="width:7.55in;height:10.25in;border:2px solid #555;border-radius:8px;display:flex;
          flex-direction:column;align-items:center;justify-content:center;gap:.55in;">
          <div style="font-size:64pt;font-weight:900;line-height:1;">${cg}</div>
          ${url ? `<img src="${url}" alt="QR Code ${cg}" style="width:5.75in;height:5.75in;display:block;" />` : ''}
        </div>
      </div>
    </section>
  `).join('');

  triggerPrint(pagesHtml, 'portrait', 'QR Codes CG');
});

// ===================== PRINT TRIGGER =====================
function triggerPrint(contentHtml, orientation = 'portrait', documentTitle = 'Impressão de Placas') {
  const win = pendingPrintWindow && !pendingPrintWindow.closed
    ? pendingPrintWindow
    : window.open('', '_blank', 'width=900,height=700');
  pendingPrintWindow = null;
  if (!win) {
    alert('O navegador bloqueou a janela do PDF. Permita pop-ups para este site e tente novamente.');
    return;
  }
  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>SPX Express — ${documentTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; font-family: Inter, Arial, sans-serif; }
    @page { size: ${orientation === 'landscape' ? '11in 8.5in' : '8.5in 11in'}; margin: 0; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; }
    }
    .no-print { text-align:center; padding:12px; background:#1a1a1a; color:#fff; }
    .no-print button {
      background:#e8001c; color:#fff; border:none; padding:10px 24px;
      font-size:14px; font-weight:700; cursor:pointer; border-radius:6px;
      font-family:Inter,sans-serif; margin-right:8px;
    }
    @media print { .no-print { display:none; } }
    .ws-print-page:last-child, .simple-print-page:last-child, .out-print-page:last-child, .gaiola-print-page:last-child {
      page-break-after:auto !important; break-after:auto !important;
    }
    .out-print-page, .simple-print-page, .gaiola-print-page { break-inside:avoid; page-break-inside:avoid; }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">📄 Salvar como PDF</button>
    <span style="margin-left:10px;color:#bbb;font-size:12px;">Na tela de impressão, selecione “Salvar como PDF”.</span>
    <button onclick="window.close()" style="background:#333;">✕ Fechar</button>
  </div>
  ${contentHtml}
  <script>
    window.onload = function() {
      setTimeout(() => window.print(), 800);
    };
  <\/script>
</body>
</html>`);
  win.document.close();
}

// ===================== UTILS =====================
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===================== INIT =====================
updatePreview();

// Auto-fill placeholders on type switch
document.querySelectorAll('.type-card').forEach(card => {
  card.addEventListener('click', () => {
    setTimeout(updatePreview, 50);
  });
});
