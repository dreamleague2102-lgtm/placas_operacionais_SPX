/* ============================================================
   SPX EXPRESS — GERADOR DE PLACAS
   app.js — Lógica principal, preview em tempo real e impressão
   ============================================================ */

// ===================== STATE =====================
let currentType = 'shopee';
let qrCache = {};  // cache de QR codes gerados

// ===================== TYPE SELECTOR =====================
document.getElementById('typeGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.type-card');
  if (!card) return;
  const type = card.dataset.type;
  switchType(type);
});

function switchType(type) {
  currentType = type;

  // Update card active state
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-type="${type}"]`).classList.add('active');

  // Update forms
  document.querySelectorAll('.plate-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`form-${type}`).classList.add('active');

  // Update form header
  const icons = { shopee: '🛒', saida: '📤', nome: '👤', gaiola: '📦' };
  const titles = {
    shopee: 'Placa Shopee / Gaiola',
    saida: 'Placa de Saída (OUT)',
    nome: 'Placa de Nome',
    gaiola: 'QR Gaiola SPX'
  };
  const subs = {
    shopee: 'Preencha os campos abaixo',
    saida: 'Código OUT + QR code com listras',
    nome: 'Nome grande em destaque com listras',
    gaiola: 'Placas em série com instruções SPX'
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

// Gaiola
addListener('gaiola-inicio', () => { updateGaiolaTotal(); updatePreview(); });
addListener('gaiola-fim', () => { updateGaiolaTotal(); updatePreview(); });

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

document.getElementById('saida-codigo').addEventListener('input', () => {
  const cod = document.getElementById('saida-codigo').value;
  const qrEl = document.getElementById('saida-qr');
  if (!qrEl.dataset.manual) {
    qrEl.value = cod ? `OUT-${cod.padStart(3,'0')}` : '';
    updatePreview();
  }
});
document.getElementById('saida-qr').addEventListener('input', function() {
  this.dataset.manual = '1';
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
    else if (currentType === 'gaiola') await renderGaiolaPreview(area);
  } catch (e) {
    area.innerHTML = `<div style="color:#e8001c;font-size:0.85rem;margin:auto;align-self:center;">⚠ Erro ao gerar preview: ${e.message}</div>`;
  }
}

// ---- SHOPEE / WS ----
async function renderShopeePreview(area) {
  const codigo = document.getElementById('shopee-codigo').value || 'MG02';
  const numero = document.getElementById('shopee-numero').value || '444';
  const rodape = document.getElementById('shopee-rodape').value || '44';
  const qrText = document.getElementById('shopee-qr').value || `${codigo}-${numero}`;
  const qtd = Math.min(parseInt(document.getElementById('shopee-qtd').value) || 1, 6);

  area.innerHTML = '';
  const folha = document.createElement('div');
  folha.className = 'preview-ws-sheet';
  for (let i = 0; i < 3; i++) {
    const preenchida = i < qtd;
    const card = buildShopeeCard(codigo, numero, rodape, preenchida);
    if (preenchida) {
      const qrCanvas = await generateQR(qrText, 200);
      if (qrCanvas) {
        const img = new Image();
        img.src = qrCanvas.toDataURL();
        card.querySelector('.ws-qr').appendChild(img);
      }
    }
    folha.appendChild(card);
  }
  area.appendChild(folha);
}

function buildShopeeCard(codigo, numero, rodape, preenchida = true) {
  const div = document.createElement('div');
  div.className = 'preview-ws';
  div.innerHTML = `
    <div class="ws-stripe ws-stripe-top"></div>
    <div class="ws-body">
      <div class="ws-shopee">
        ${shopeeLogoMarkup()}
      </div>
      <div class="ws-name">${escHtml(codigo)}</div>
      <div class="ws-num">${preenchida ? escHtml(numero) : ''}</div>
      <div class="ws-qr"></div>
      <div class="ws-posto">${preenchida ? escHtml(rodape) : ''}</div>
    </div>
    <div class="ws-stripe ws-stripe-bottom"></div>
  `;
  return div;
}

function shopeeLogoMarkup() {
  return `<span class="shopee-logo" aria-label="Shopee">
    <svg class="shopee-bag" viewBox="0 0 40 46" aria-hidden="true">
      <path d="M10 14V11C10 5.5 14.5 1 20 1s10 4.5 10 10v3" fill="none" stroke="currentColor" stroke-width="3"/>
      <path d="M3 13h34v31H3z" fill="currentColor"/>
      <text x="20" y="36" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="25" font-weight="700">S</text>
    </svg>
    <span class="shopee-word">Shopee</span>
  </span>`;
}

function buildWsPrintPages(codigo, numero, rodape, qrDataURL, quantidade) {
  const paginas = [];
  for (let inicio = 0; inicio < quantidade; inicio += 3) {
    const etiquetas = [0, 1, 2].map(coluna => {
      const preenchida = inicio + coluna < quantidade;
      return `<div style="height:5.2in;border:1.5px solid #111;display:flex;flex-direction:column;overflow:hidden;background:#fff;">
        <div style="width:60%;height:.32in;background:repeating-linear-gradient(135deg,#000 0 .18in,transparent .18in .36in);"></div>
        <div style="flex:1;position:relative;text-align:center;font-family:Calibri,Arial,sans-serif;">
          <div style="position:absolute;right:.12in;top:.04in;">${shopeeLogoMarkup()}</div>
          <div style="font-size:20pt;font-weight:700;padding-top:.15in;">${escHtml(codigo)}</div>
          <div style="font-size:14pt;font-weight:700;margin-top:.30in;height:.25in;">${preenchida ? escHtml(numero) : ''}</div>
          <div style="height:2.35in;margin-top:.06in;display:flex;align-items:center;justify-content:center;">
            ${preenchida && qrDataURL ? `<img src="${qrDataURL}" style="width:2.25in;height:2.25in;display:block;" />` : ''}
          </div>
          <div style="position:absolute;left:0;right:0;bottom:.10in;font-size:14pt;font-weight:700;">${preenchida ? escHtml(rodape) : ''}</div>
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
  const codigo = document.getElementById('saida-codigo').value || '041';
  const qrText = document.getElementById('saida-qr').value || `OUT-${codigo}`;
  const qtd = Math.min(parseInt(document.getElementById('saida-qtd').value) || 1, 3);
  const nomeFormatado = `OUT-${codigo.padStart(3, '0')}`;

  area.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;width:100%;';

  for (let i = 0; i < qtd; i++) {
    const card = document.createElement('div');
    card.className = 'preview-grande';
    card.innerHTML = `
      <div class="grande-stripe-tl"></div>
      <div class="grande-stripe-br"></div>
      <div class="grande-nome">${escHtml(nomeFormatado)}</div>
      <div class="grande-qr"></div>
    `;
    const qrCanvas = await generateQR(qrText, 260);
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

function renderNomePreview(area) {
  const nome = document.getElementById('nome-texto').value || 'LETICIA';
  const linhas = quebrarTextoPlaca(nome);
  const qtd = Math.min(parseInt(document.getElementById('nome-qtd').value) || 1, 3);

  area.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;width:100%;';

  for (let i = 0; i < qtd; i++) {
    const card = document.createElement('div');
    card.className = 'preview-simples';
    card.innerHTML = `
      <div class="simples-stripe-tl"></div>
      <div class="simples-stripe-br"></div>
      <div class="simples-nome">${linhas.map(linha => `<span>${escHtml(linha)}</span>`).join('')}</div>
    `;
    wrap.appendChild(card);
  }
  area.appendChild(wrap);
}

// ---- GAIOLA SPX ----
async function renderGaiolaPreview(area) {
  const ini = parseInt(document.getElementById('gaiola-inicio').value) || 515;
  const fim = parseInt(document.getElementById('gaiola-fim').value) || 515;
  const total = fim >= ini && ini > 0 ? fim - ini + 1 : 0;

  area.innerHTML = '';

  if (total === 0) {
    area.innerHTML = '<div style="color:#888;font-size:0.85rem;margin:auto;align-self:center;">Preencha os números inicial e final</div>';
    return;
  }

  // Show first one as preview
  const previewCg = `CG${ini}`;
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
  note.textContent = total > 1 ? `Pré-visualização do CG${ini} · ${total} placas serão impressas (CG${ini}–CG${fim})` : `Placa CG${ini}`;

  area.appendChild(card);
  area.appendChild(note);
}

// ===================== PRINT FUNCTIONS =====================

// PRINT SHOPEE (WS layout — 3 per row, portrait 8.5×11)
document.getElementById('print-shopee').addEventListener('click', async () => {
  const codigo = document.getElementById('shopee-codigo').value.trim();
  const numero = document.getElementById('shopee-numero').value.trim();
  const rodape = document.getElementById('shopee-rodape').value.trim();
  const qrText = document.getElementById('shopee-qr').value.trim();
  const qtd = Math.min(parseInt(document.getElementById('shopee-qtd').value) || 1, 20);

  if (!codigo) { alert('Preencha o código da gaiola.'); return; }

  const nomeFormatado = codigo;
  const qrDataURL = await generateQRDataURL(qrText || `${codigo}-${numero}`, 600);
  triggerPrint(buildWsPrintPages(codigo, numero, rodape, qrDataURL, qtd), 'landscape');
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
        <!-- Shopee logo top-right -->
        <div style="position:absolute;left:${xn + 1.6}in;top:${SHOPEE_Y + offsetY}in;
          font-size:8pt;font-weight:700;font-family:Inter,sans-serif;display:flex;align-items:center;gap:3px;">
          <span style="width:18px;height:20px;background:#000;color:#fff;display:grid;place-items:center;font-size:10px;">S</span> Shopee
        </div>
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

  if (!codigo) { alert('Preencha o número de saída.'); return; }

  const nomeFormatado = `OUT-${codigo.padStart(3, '0')}`;
  const qrDataURL = await generateQRDataURL(qrText || nomeFormatado, 600);

  // Measurements from table (landscape letter: 11×8.5in):
  // Nome: X=0.73, Y=2.31, W=4.54, H=0.85, font 48pt
  // QR:   X=5.14, Y=1.01, W=4.05, H=3.60

  const PAGE_H = 8.5; // uma placa por página paisagem
  let pages = '';

  for (let i = 0; i < qtd; i++) {
    const offsetY = i * PAGE_H;
    pages += `
      <!-- Placa Grande ${i+1} -->
      <div style="position:absolute;left:0.22in;top:${0.22 + offsetY}in;width:10.56in;height:8.06in;
        border:1.5px solid #111;box-sizing:border-box;"></div>
      <!-- Stripe top-left -->
      <div style="position:absolute;left:0.45in;top:${0.45 + offsetY}in;width:4.0in;height:0.30in;
        background:repeating-linear-gradient(135deg,#000 0 0.34in,#fff 0.34in 0.68in);"></div>
      <!-- Stripe bottom-right -->
      <div style="position:absolute;right:0.25in;top:${7.65 + offsetY}in;width:4.0in;height:0.30in;
        background:repeating-linear-gradient(135deg,#000 0 0.34in,#fff 0.34in 0.68in);"></div>
      <!-- Nome OUT -->
      <div style="position:absolute;left:0.73in;top:${2.31 + offsetY}in;width:4.54in;height:0.85in;
        font-size:48pt;font-weight:900;font-family:Inter,sans-serif;
        display:flex;align-items:center;justify-content:center;text-align:center;">
        ${escHtml(nomeFormatado)}
      </div>
      <!-- QR -->
      <div style="position:absolute;left:5.14in;top:${1.01 + offsetY}in;width:4.05in;height:3.60in;
        display:flex;align-items:center;justify-content:center;">
        ${qrDataURL ? `<img src="${qrDataURL}" style="width:4.05in;height:3.60in;object-fit:contain;" />` : ''}
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

// PRINT NOME (Simples — landscape)
document.getElementById('print-nome').addEventListener('click', () => {
  const nome = document.getElementById('nome-texto').value.trim();
  const qtd = Math.min(parseInt(document.getElementById('nome-qtd').value) || 1, 20);

  if (!nome) { alert('Preencha o nome.'); return; }
  const linhas = quebrarTextoPlaca(nome);
  const placa = () => `<section class="simple-print-page" style="width:11in;height:8.5in;padding:.22in;page-break-after:always;break-after:page;background:#fff;">
    <div style="width:100%;height:100%;position:relative;border:1.5px solid #555;overflow:hidden;">
      <div style="position:absolute;left:0;top:0;width:43%;height:.72in;background:repeating-linear-gradient(135deg,#000 0 .34in,#fff .34in .68in);"></div>
      <div style="position:absolute;right:0;bottom:0;width:43%;height:.72in;background:repeating-linear-gradient(135deg,#000 0 .34in,#fff .34in .68in);"></div>
      <div style="position:absolute;inset:1.45in .9in;display:flex;flex-direction:column;align-items:center;justify-content:center;
        font:900 64pt/1.08 Calibri,Arial,sans-serif;text-align:center;color:#000;">
        ${linhas.map(linha => `<div>${escHtml(linha)}</div>`).join('')}
      </div>
    </div>
  </section>`;
  triggerPrint(Array.from({length:qtd}, placa).join(''), 'landscape');
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
        background:repeating-linear-gradient(135deg,#000 0,#000 0.34in,#fff 0.34in,#fff 0.68in);"></div>
      <!-- Stripe bottom-right -->
      <div style="position:absolute;right:0.28in;top:${7.56 + offsetY}in;width:4.25in;height:0.72in;
        background:repeating-linear-gradient(135deg,#000 0,#000 0.34in,#fff 0.34in,#fff 0.68in);"></div>
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
    <div style="width:8.5in;min-height:10.5in;position:relative;background:#fff;
      font-family:Inter,sans-serif;color:#000;padding:0.5in;
      page-break-after:always;box-sizing:border-box;">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;
        padding-bottom:8px;border-bottom:2px solid #eee;">
        <div style="background:#000;color:#fff;font-size:20pt;font-weight:900;
          padding:4px 10px;border-radius:4px;letter-spacing:-1px;">SPX</div>
        <div>
          <div style="font-size:18pt;font-weight:900;">QR Code de Gaiolas</div>
          <div style="font-size:9pt;color:#555;">Gestão de Gaiolas — SPX Express</div>
        </div>
      </div>

      <!-- Main body -->
      <div style="display:flex;gap:0.4in;">

        <!-- Instructions -->
        <div style="flex:1;">
          <div style="font-size:11pt;font-weight:700;background:#eee;padding:4px 8px;
            border-radius:3px;margin-bottom:8px;">O que fazer se:</div>
          <ul style="padding-left:16px;margin-bottom:16px;">
            <li style="font-size:9pt;line-height:1.7;margin-bottom:2px;">
              Essa gaiola estiver ocupada sistemicamente? <b>Informe o CG ao COP.</b>
            </li>
            <li style="font-size:9pt;line-height:1.7;margin-bottom:2px;">
              Se você encontrar essa placa no chão? <b>Leve ao COP.</b>
            </li>
            <li style="font-size:9pt;line-height:1.7;margin-bottom:2px;">
              Se o <b>QR code</b> estiver rasgado, manchado ou rasurado? 
              <b>Informe o CG ou leve a gaiola ao COP.</b>
            </li>
            <li style="font-size:9pt;line-height:1.7;margin-bottom:2px;">
              Se o <b>QR code</b> apresentar erro na leitura? <b>Informe o CG ao COP.</b>
            </li>
          </ul>

          <div style="font-size:11pt;font-weight:700;background:#eee;padding:4px 8px;
            border-radius:3px;margin-bottom:8px;">Orientações:</div>
          <ul style="padding-left:16px;">
            <li style="font-size:9pt;line-height:1.7;margin-bottom:2px;">
              Não imprima essa etiqueta por conta própria, essa ação pode gerar duplicidade.
            </li>
            <li style="font-size:9pt;line-height:1.7;margin-bottom:2px;">
              Não cole nada sobre essa placa.
            </li>
            <li style="font-size:9pt;line-height:1.7;margin-bottom:2px;">
              Não arranque essa placa em nenhuma hipótese, ela está vinculada exclusivamente a essa gaiola.
            </li>
            <li style="font-size:9pt;line-height:1.7;margin-bottom:2px;">
              Cuidado ao transportar essa gaiola.
            </li>
          </ul>
        </div>

        <!-- QR Section -->
        <div style="width:3.8in;display:flex;flex-direction:column;align-items:center;gap:8px;">
          <div style="font-size:9pt;color:#555;text-align:center;">
            Não cole nada acima do QR code.
          </div>
          <div style="border:2px solid #000;padding:12px;display:flex;flex-direction:column;
            align-items:center;gap:8px;width:3.5in;">
            <div style="font-size:28pt;font-weight:900;text-align:center;">${cg}</div>
            ${url ? `<img src="${url}" style="width:3.0in;height:3.0in;" />` : ''}
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div style="position:absolute;bottom:0.3in;left:0.5in;right:0.5in;
        text-align:center;background:#eee;font-size:11pt;font-weight:700;padding:8px;
        border-radius:3px;">
        Lembre-se: Segurança em primeiro lugar.
      </div>

    </div>
  `).join('');

  triggerPrint(pagesHtml, 'portrait');
});

// ===================== PRINT TRIGGER =====================
function triggerPrint(contentHtml, orientation = 'portrait') {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>SPX Express — Impressão de Placas</title>
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
    .ws-print-page:last-child, .simple-print-page:last-child {
      page-break-after:auto !important; break-after:auto !important;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ Imprimir agora</button>
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
