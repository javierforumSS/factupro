const DB = 'factupro';
const $ = s => document.querySelector(s);
let state = { invoices: [], edit: null, config: {} };
let isPaid = false;
let invoiceCounter = parseInt(localStorage.getItem(DB + '_counter') || '0');

const getNextInvoiceNumber = () => {
  const year = new Date().getFullYear();
  invoiceCounter++;
  localStorage.setItem(DB + '_counter', invoiceCounter);
  return `${year}-${String(invoiceCounter).padStart(4, '0')}`;
};

const load = () => {
  state.invoices = JSON.parse(localStorage.getItem(DB)) || [];
  state.config = JSON.parse(localStorage.getItem(DB + '_cfg')) || {};
  if (!state.config.name || !state.config.nif) {
    showWelcomeConfig();
  } else {
    render();
  }
};

const save = () => localStorage.setItem(DB, JSON.stringify(state.invoices));
const saveCfg = () => localStorage.setItem(DB + '_cfg', JSON.stringify(state.config));
const fmt = n => (n || 0).toFixed(2);
const calcTotal = () => state.invoices.reduce((s, i) => s + i.total, 0);

// RENDER ÍTEMS
const renderItems = () => {
  const container = $('#items');
  const items = state.edit !== null ? state.invoices[state.edit].items : [];
  container.innerHTML = items.map((it, i) => `
    <div class="item-row">
      <input value="${it.desc}" data-i="${i}" class="idesc" 
             oninput="updateItem(${i}, 'desc', this.value)" 
             placeholder="Descripción" />
      <input value="${it.qty}" data-i="${i}" class="iqty" 
             oninput="updateItem(${i}, 'qty', this.value)" 
             inputmode="numeric" />
      <input value="${it.price}" data-i="${i}" class="iprice" 
             oninput="updateItem(${i}, 'price', this.value)" 
             inputmode="decimal" placeholder="0,00" />
      <button type="button" onclick="removeItem(${i})">X</button>
    </div>
  `).join('');
};

window.removeItem = i => {
  if (state.edit === null) return;
  state.invoices[state.edit].items.splice(i, 1);
  renderItems();
};

$('#addItem').onclick = () => {
  const desc = $('#itemDesc').value.trim();
  const qty = +$('#itemQty').value || 1;
  const rawPrice = $('#itemPrice').value.trim();
  const price = parseFloat(rawPrice.replace(',', '.')) || 0;
  if (!desc || price <= 0) return alert('Falta descripción o precio');
  if (state.edit === null) state.edit = state.invoices.length;
  if (!state.invoices[state.edit]) state.invoices[state.edit] = { items: [] };
  state.invoices[state.edit].items.push({ desc, qty, price, total: qty * price });
  $('#itemDesc').value = ''; $('#itemQty').value = 1; $('#itemPrice').value = '';
  renderItems();
};

$('#paidCheck').onchange = () => {
  isPaid = $('#paidCheck').checked;
};

$('#form').onsubmit = e => {
  e.preventDefault();
  
  console.log('=== GUARDANDO FACTURA ===');
  
  // NUEVOS CAMPOS DEL CLIENTE
  const client = $('#client').value.trim();
  const clientNIF = $('#NIF').value.trim();
  const clientAddress = $('#direccion').value.trim();
  const clientCP = $('#cp').value.trim();
  const clientCity = $('#ciudad').value.trim();
  
  console.log('Datos cliente:', { client, clientNIF, clientAddress, clientCP, clientCity });
  
  const date = $('#date').value;
  const concept = $('#concept').value.trim();
  const rawPrice = $('#price').value.trim();
  const price = rawPrice ? parseFloat(rawPrice.replace(',', '.')) : null;

  if (!client || !date) return alert('Cliente y fecha obligatorios');

  const items = state.invoices[state.edit]?.items || [];

  // Recalcular subtotal, iva y total
  const subtotal = (price || 0) + items.reduce((s, i) => s + i.total, 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const inv = {
    id: state.edit !== null ? state.invoices[state.edit].id : getNextInvoiceNumber(),
    client,
    clientNIF,
    clientAddress,
    clientCP,
    clientCity,
    date,
    concept,
    price,
    items,
    subtotal,
    iva,
    total,
    paid: isPaid,
    paymentMethod: isPaid ? 'FACTURA PAGADA' : ''
  };

  console.log('Factura a guardar:', inv);

  if (state.edit !== null) {
    state.invoices[state.edit] = inv;
  } else {
    state.invoices.push(inv);
  }
  save();
  resetForm();
  render();
  alert('✅ Factura guardada');
};

const resetForm = () => {
  $('#form').reset();
  $('#date').valueAsDate = new Date();
  $('#items').innerHTML = '';
  state.edit = null;
  isPaid = false;
  $('#paidCheck').checked = false;
};

/* =================== RENDER =================== */
const render = () => {
  const list = $('#list');
  const search = $('#search').value.toLowerCase();
  const filtered = state.invoices.filter(i => i.client.toLowerCase().includes(search));
  list.innerHTML = filtered.map((inv, idx) => {
    const realIndex = state.invoices.indexOf(inv);
    const isLast = realIndex === state.invoices.length - 1;
    return `
      <div class="invoice">
        <div>
          <b>${inv.client}</b>
          <small>${inv.id} • ${inv.date} • ${fmt(inv.total)} € ${inv.paid ? '• <span style="color:#1e7e34">PAGADO</span>' : ''}</small>
        </div>
        <div class="invoice-actions">
          <button onclick="editInvoice(${realIndex})">Editar</button>
          <button onclick="printInvoice(${realIndex})">PDF</button>
          <button onclick="shareInvoice(${realIndex})" style="background:#17a2b8; color:white;">📧 Enviar</button>
          ${isLast ? `<button onclick="deleteInvoice(${realIndex})" style="background:#dc3545;color:white;font-weight:bold;">Borrar</button>` : ''}
        </div>
      </div>
    `;
  }).join('') || '<p style="text-align:center;color:#999">Sin facturas</p>';
  $('#total').textContent = fmt(calcTotal());
  $('#count').textContent = state.invoices.length;
};

/* =================== BORRAR ÚLTIMA =================== */
window.deleteInvoice = i => {
  if (i !== state.invoices.length - 1) {
    alert('Solo se puede eliminar la última factura.');
    return;
  }
  if (confirm('¿Eliminar la última factura?')) {
    state.invoices.splice(i, 1);
    save();
    if (state.invoices.length > 0) {
      const lastId = state.invoices[state.invoices.length - 1].id;
      const lastNum = parseInt(lastId.split('-')[1]);
      invoiceCounter = lastNum;
    } else {
      invoiceCounter = 0;
    }
    localStorage.setItem(DB + '_counter', invoiceCounter);
    render();
  }
};

/* =================== EDITAR =================== */
window.editInvoice = i => {
  const inv = state.invoices[i];
  
  console.log('=== EDITANDO FACTURA ===');
  console.log('Datos de la factura:', inv);
  
  // CAMPOS DEL CLIENTE
  $('#client').value = inv.client;
  $('#NIF').value = inv.clientNIF || '';
  $('#direccion').value = inv.clientAddress || '';
  $('#cp').value = inv.clientCP || '';
  $('#ciudad').value = inv.clientCity || '';
  
  console.log('Campos rellenados:', {
    client: $('#client').value,
    nif: $('#NIF').value,
    direccion: $('#direccion').value,
    cp: $('#cp').value,
    ciudad: $('#ciudad').value
  });
  
  $('#date').value = inv.date;
  $('#concept').value = inv.concept || '';
  $('#price').value = inv.price || '';
  state.edit = i;
  isPaid = inv.paid;
  $('#paidCheck').checked = isPaid;
  renderItems();
  
  // Scroll al formulario
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* =================== IMPRIMIR PDF =================== */
const generateInvoiceHTML = (inv) => {
  const items = inv.items.map(it =>
    `<tr><td style="padding:8px; border-bottom:1px solid #eee; word-break:break-word;">${it.desc}</td><td style="text-align:center; border-bottom:1px solid #eee;">${it.qty}</td><td style="text-align:right; border-bottom:1px solid #eee;">${fmt(it.price)} €</td><td style="text-align:right; font-weight:600; border-bottom:1px solid #eee;">${fmt(it.total)} €</td></tr>`
  ).join('');
  
  const logo = state.config.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5MT0dPPC90ZXh0Pjwvc3ZnPg==';
  
  // CONSTRUIR DIRECCIÓN COMPLETA DEL CLIENTE
  const clientFullAddress = [
    inv.clientAddress,
    inv.clientCP && inv.clientCity ? `${inv.clientCP} ${inv.clientCity}` : (inv.clientCP || inv.clientCity)
  ].filter(Boolean).join('<br>');
  
  return `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Factura ${inv.id}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: Arial, sans-serif; 
        color: #333; 
        line-height: 1.4;
        font-size: 11pt;
      }
      .container { 
        width: 100%; 
        max-width: 100%;
        padding: 0;
      }
      .header { 
        display: table;
        width: 100%;
        margin-bottom: 20px; 
        border-bottom: 2px solid #007bff; 
        padding-bottom: 10px;
      }
      .header-left, .header-right {
        display: table-cell;
        vertical-align: top;
      }
      .header-left { width: 120px; }
      .header-right { text-align: right; }
      .logo { 
        width: 80px; 
        height: 80px; 
        object-fit: contain;
      }
      .company-name { 
        font-size: 16pt; 
        color: #007bff; 
        font-weight: bold;
        margin-bottom: 5px;
      }
      .company-info { font-size: 9pt; line-height: 1.3; }
      .invoice-title { 
        text-align: center; 
        margin: 15px 0;
      }
      .invoice-title h2 { 
        font-size: 20pt; 
        margin-bottom: 8px;
      }
      .invoice-title p { font-size: 10pt; }
      .info-grid { 
        display: table;
        width: 100%;
        margin: 15px 0;
      }
      .info-box { 
        display: table-cell;
        width: 48%;
        background: #f8f9fa; 
        padding: 10px; 
        border-radius: 5px;
        vertical-align: top;
        font-size: 9pt;
      }
      .info-box + .info-box { 
        margin-left: 4%;
      }
      .info-box strong { font-size: 10pt; }
      .concept-box {
        margin: 15px 0;
        padding: 10px;
        background: #f0f8ff;
        border-radius: 5px;
        font-size: 9pt;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 15px 0;
        font-size: 9pt;
      }
      th { 
        background: #007bff; 
        color: white; 
        padding: 8px;
        text-align: left;
      }
      td { padding: 6px 8px; }
      .totals-container {
        width: 100%;
        text-align: right;
        margin-top: 20px;
      }
      .totals { 
        display: inline-block;
        border: 1px solid #ddd; 
        border-radius: 5px;
        min-width: 250px;
      }
      .totals table { margin: 0; }
      .totals td { 
        padding: 8px 12px;
        font-size: 9pt;
      }
      .totals .label { 
        background: #f8f9fa; 
        font-weight: 600;
        text-align: left;
      }
      .totals .amount { 
        text-align: right; 
        font-weight: 600;
      }
      .totals .grand { 
        background: #007bff; 
        color: white; 
        font-size: 11pt;
      }
      .paid-stamp { 
        text-align: right;
        margin-top: 20px;
      }
      .paid-stamp span { 
        display: inline-block;
        background: #1e7e34; 
        color: white; 
        padding: 15px 30px; 
        border-radius: 30px; 
        font-size: 16pt; 
        font-weight: bold;
        transform: rotate(-15deg);
      }
    </style>
    </head><body>
    <div class="container">
      <div class="header">
        <div class="header-left">
          <img src="${logo}" class="logo" />
        </div>
        <div class="header-right">
          <div class="company-name">${state.config.name}</div>
          <div class="company-info">
            ${state.config.nif}<br>
            ${state.config.address ? state.config.address + '<br>' : ''}
            ${state.config.phone ? 'Tel: ' + state.config.phone : ''}
          </div>
        </div>
      </div>
      
      <div class="invoice-title">
        <h2>FACTURA</h2>
        <p>Nº Factura: ${inv.id}<br>Fecha: ${inv.date}</p>
      </div>
      
      <div class="info-grid">
        <div class="info-box">
          <strong>Cliente:</strong><br>
          ${inv.client}
          ${inv.clientNIF ? '<br><strong>NIF:</strong> ' + inv.clientNIF : ''}
          ${clientFullAddress ? '<br>' + clientFullAddress : ''}
        </div>
        <div class="info-box">
          <strong>Forma de pago:</strong><br>
          ${inv.paid ? '<strong style="color:#1e7e34">PAGADA</strong>' : 'Transferencia bancaria'}
          ${!inv.paid && state.config.iban ? '<br>IBAN: <strong>' + state.config.iban + '</strong>' : ''}
        </div>
      </div>
      
      ${inv.concept ? `<div class="concept-box"><strong>Concepto:</strong> ${inv.concept} ${inv.price ? '<span style="float:right">' + fmt(inv.price) + ' €</span>' : ''}</div>` : ''}
      
      ${inv.items.length ? `
      <table>
        <thead>
          <tr>
            <th style="width:50%;">Descripción</th>
            <th style="width:15%; text-align:center;">Uds</th>
            <th style="width:17.5%; text-align:right;">Precio</th>
            <th style="width:17.5%; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items}
          <tr style="background:#f0f8ff; font-weight:600;">
            <td colspan="3" style="text-align:right; padding:10px;">Subtotal</td>
            <td style="text-align:right; padding:10px;">${fmt(inv.subtotal)} €</td>
          </tr>
        </tbody>
      </table>` : ''}
      
      <div class="totals-container">
        <div class="totals">
          <table>
            <tr><td class="label">Base imponible</td><td class="amount">${fmt(inv.subtotal)} €</td></tr>
            <tr><td class="label">IVA 21%</td><td class="amount">${fmt(inv.iva)} €</td></tr>
            <tr class="grand"><td class="label">TOTAL</td><td class="amount">${fmt(inv.total)} €</td></tr>
          </table>
        </div>
      </div>
      
      ${inv.paid ? `<div class="paid-stamp"><span>PAGADO</span></div>` : ''}
    </div>
    </body></html>
  `;
};

window.printInvoice = i => {
  const inv = state.invoices[i];
  const html = generateInvoiceHTML(inv);
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.write(`<script>setTimeout(() => print(), 800);</script>`);
  win.document.close();
};

/* =================== COMPARTIR/ENVIAR FACTURA =================== */
window.shareInvoice = async (i) => {
  const inv = state.invoices[i];
  
  try {
    // Cargar html2pdf si no está cargado
    if (typeof html2pdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => script.onload = resolve);
    }
    
    // Crear elemento temporal con el HTML de la factura
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateInvoiceHTML(inv);
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    // Configuración del PDF
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `Factura_${inv.id}_${inv.client.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    // Generar PDF como blob
    const pdfBlob = await html2pdf().from(tempDiv.querySelector('.container')).set(opt).outputPdf('blob');
    
    // Limpiar elemento temporal
    document.body.removeChild(tempDiv);
    
    // Intentar compartir con Web Share API (móviles)
    if (navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], opt.filename)] })) {
      const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });
      
      await navigator.share({
        title: `Factura ${inv.id} - ${inv.client}`,
        text: `Factura ${inv.id} por ${fmt(inv.total)} €`,
        files: [file]
      });
      
      console.log('PDF compartido');
    } else {
      // Fallback: Descargar PDF y abrir email
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = opt.filename;
      a.click();
      URL.revokeObjectURL(url);
      
      // Abrir cliente de email con el mensaje
      const subject = encodeURIComponent(`Factura ${inv.id} - ${state.config.name}`);
      const body = encodeURIComponent(
        `Estimado/a ${inv.client},\n\n` +
        `Adjunto encontrará la factura ${inv.id} por un importe de ${fmt(inv.total)} €.\n\n` +
        `Detalles:\n` +
        `- Fecha: ${inv.date}\n` +
        `- Base imponible: ${fmt(inv.subtotal)} €\n` +
        `- IVA (21%): ${fmt(inv.iva)} €\n` +
        `- TOTAL: ${fmt(inv.total)} €\n\n` +
        `${inv.paid ? 'Esta factura ya ha sido pagada.\n\n' : ''}` +
        `Saludos,\n${state.config.name}`
      );
      
      setTimeout(() => {
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }, 500);
      
      alert('PDF descargado. Se abrirá tu cliente de email para adjuntarlo.');
    }
  } catch (error) {
    console.error('Error generando PDF:', error);
    alert('Error al generar el PDF. Intenta usar el botón "PDF" para imprimir.');
  }
};

/* =================== CONFIG Y MODALES =================== */
const showWelcomeConfig = () => {
  const modal = document.createElement('div');
  modal.id = 'welcomeModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#007bff;display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = `
    <div style="background:white;padding:24px;border-radius:16px;width:90%;max-width:400px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3)">
      <h2 style="margin:0 0 16px;color:#007bff">¡Bienvenido a FactuPro!</h2>
      <p style="margin-bottom:20px;color:#555;font-size:0.95rem">Alta de tu empresa</p>
      <input id="cfgName" placeholder="Nombre de la empresa" style="margin:8px 0;width:100%" required />
      <input id="cfgNif" placeholder="NIF / CIF" style="margin:8px 0;width:100%" required />
      <input id="cfgAddress" placeholder="Dirección" style="margin:8px 0;width:100%" />
      <input id="cfgPhone" placeholder="Teléfono" style="margin:8px 0;width:100%" />
      <input id="cfgIban" placeholder="IBAN" style="margin:8px 0;width:100%" />
      <input id="cfgLogo" type="file" accept="image/*" style="margin:8px 0;" onchange="uploadLogo(this)" />
      <button onclick="Config.saveAndStart()" style="margin-top:16px;width:100%;background:#28a745;padding:14px;font-size:1.1rem;border-radius:8px">
        Comenzar
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => $('#cfgName').focus(), 100);
};

const Config = {
  open: () => {
    const modal = document.createElement('div');
    modal.id = 'editModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;';
    modal.innerHTML = `
      <div style="background:white;padding:20px;border-radius:16px;width:90%;max-width:400px">
        <h2 style="margin:0 0 16px">Editar Empresa</h2>
        <input id="cfgName" placeholder="Nombre" value="${state.config.name}" style="margin:8px 0;width:100%" />
        <input id="cfgNif" placeholder="NIF" value="${state.config.nif}" style="margin:8px 0;width:100%" />
        <input id="cfgAddress" placeholder="Dirección" value="${state.config.address||''}" style="margin:8px 0;width:100%" />
        <input id="cfgPhone" placeholder="Teléfono" value="${state.config.phone||''}" style="margin:8px 0;width:100%" />
        <input id="cfgIban" placeholder="IBAN" value="${state.config.iban||''}" style="margin:8px 0;width:100%" />
        <input id="cfgLogo" type="file" accept="image/*" style="margin:8px 0;" onchange="uploadLogo(this)" />
        <div style="display:flex;gap:8px;margin-top:16px">
          <button onclick="Config.save()" style="flex:1;background:#28a745">Guardar</button>
          <button onclick="closeModal('editModal')" style="flex:1;background:#6c757d">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },
  save: () => {
    state.config = {
      name: $('#cfgName').value.trim() || 'Tu Empresa',
      nif: $('#cfgNif').value.trim() || 'B12345678',
      address: $('#cfgAddress').value.trim(),
      phone: $('#cfgPhone').value.trim(),
      iban: $('#cfgIban').value.trim(),
      logo: state.config.logo // Mantener el logo existente
    };
    saveCfg();
    closeModal('editModal');
    alert('Empresa actualizada');
  },
  saveAndStart: () => {
    const name = $('#cfgName').value.trim();
    const nif = $('#cfgNif').value.trim();
    if (!name || !nif) {
      alert('Nombre y NIF obligatorios');
      return;
    }
    state.config = { 
      name, 
      nif, 
      address: $('#cfgAddress').value.trim(), 
      phone: $('#cfgPhone').value.trim(), 
      iban: $('#cfgIban').value.trim() 
    };
    saveCfg();
    closeModal('welcomeModal');
    render();
  }
};

const closeModal = id => {
  const modal = $(`#${id}`);
  if (modal) modal.remove();
};

function uploadLogo(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    state.config.logo = e.target.result;
    saveCfg();
    alert('Logo guardado');
  };
  reader.readAsDataURL(file);
}

const Export = {
  backup: () => {
    const data = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.invoices));
    const a = document.createElement('a'); 
    a.href = data; 
    a.download = 'facturas.json'; 
    a.click();
  },
  import: () => {
    const input = document.createElement('input'); 
    input.type = 'file'; 
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          state.invoices = JSON.parse(ev.target.result);
          save();
          render();
          alert('Importado');
        } catch { alert('Error'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }
};

/* =================== MENÚ =================== */
$('#menuBtn').onclick = () => {
  const menu = $('#menu');
  menu.style.right = menu.style.right === '0px' ? '-250px' : '0px';
};

$('#search').oninput = render;
$('#date').valueAsDate = new Date();

document.addEventListener('click', e => {
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');
  if (menu.style.right === '0px' && !menu.contains(e.target) && !menuBtn.contains(e.target)) {
    menu.style.right = '-250px';
  }
});

window.updateItem = (index, field, value) => {
  if (state.edit === null) return;

  const item = state.invoices[state.edit].items[index];

  if (field === 'desc') {
    item.desc = value;
  } else if (field === 'qty') {
    const qty = parseFloat(value) || 0;
    item.qty = qty > 0 ? qty : 1;
  } else if (field === 'price') {
    const raw = value.trim();
    const price = parseFloat(raw.replace(',', '.')) || 0;
    item.price = price;
  }

  // Recalcular total del ítem
  item.total = item.qty * item.price;

  // Re-renderizar solo los ítems
  renderItems();
};

const cancelEdit = () => {
  if (state.edit === null) return;
  if (confirm('¿Descartar cambios y cancelar edición?')) {
    resetForm();
    render();
  }
};

// Asignar evento
$('#cancelBtn').onclick = cancelEdit;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
load();