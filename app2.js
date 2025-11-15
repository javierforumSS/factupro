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
  
  // NUEVOS CAMPOS DEL CLIENTE
  const client = $('#client').value.trim();
  const clientNIF = $('#NIF').value.trim();
  const clientAddress = $('#direccion').value.trim();
  const clientCP = $('#cp').value.trim();
  const clientCity = $('#ciudad').value.trim();
  
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

  if (state.edit !== null) {
    state.invoices[state.edit] = inv;
  } else {
    state.invoices.push(inv);
  }
  save();
  resetForm();
  render();
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
  
  // CAMPOS DEL CLIENTE
  $('#client').value = inv.client;
  $('#NIF').value = inv.clientNIF || '';
  $('#direccion').value = inv.clientAddress || '';
  $('#cp').value = inv.clientCP || '';
  $('#ciudad').value = inv.clientCity || '';
  
  $('#date').value = inv.date;
  $('#concept').value = inv.concept || '';
  $('#price').value = inv.price || '';
  state.edit = i;
  isPaid = inv.paid;
  $('#paidCheck').checked = isPaid;
  renderItems();
};

/* =================== IMPRIMIR PDF =================== */
window.printInvoice = i => {
  const inv = state.invoices[i];
  const items = inv.items.map(it =>
    `<tr><td style="padding:8px; border-bottom:1px solid #eee; width:60%; word-break:break-word;">${it.desc}</td><td style="text-align:center; border-bottom:1px solid #eee; width:10%;">${it.qty}</td><td style="text-align:right; border-bottom:1px solid #eee; width:15%;">${fmt(it.price)} €</td><td style="text-align:right; font-weight:600; border-bottom:1px solid #eee; width:15%;">${fmt(it.total)} €</td></tr>`
  ).join('');
  
  const logo = state.config.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5MT0dPPC90ZXh0Pjwvc3ZnPg==';
  
  // CONSTRUIR DIRECCIÓN COMPLETA DEL CLIENTE
  const clientFullAddress = [
    inv.clientAddress,
    inv.clientCP && inv.clientCity ? `${inv.clientCP} ${inv.clientCity}` : (inv.clientCP || inv.clientCity)
  ].filter(Boolean).join('<br>');
  
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Factura ${inv.id}</title>
    <style>
      @page { margin: 15mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; margin:0; color:#333; }
      .container { max-width: 800px; margin: 0 auto; padding: 20px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 15px; }
      .logo { width: 100px; height: 100px; object-fit: contain; border-radius: 8px; }
      .company h1 { margin:0; font-size:1.4rem; color:#007bff; }
      .invoice-title h2 { text-align: center; margin: 20px 0; font-size:1.8rem; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0; }
      .info-box { background:#f8f9fa; padding:12px; border-radius:8px; }
      table { width:100%; border-collapse: collapse; margin:25px 0; }
      th { background:#007bff; color:white; padding:12px 8px; }
      .totals { float:right; width:300px; border:1px solid #ddd; border-radius:8px; margin-top:30px; }
      .totals td { padding:10px 15px; }
      .totals .label { background:#f8f9fa; font-weight:600; }
      .totals .amount { text-align:right; font-weight:600; }
      .totals .grand { background:#007bff; color:white; font-size:1.2rem; }
      .footer { margin-top:80px; font-size:0.8rem; color:#777; text-align:center; }
      .paid-stamp { position:absolute; top:100px; right:50px; transform:rotate(-20deg); opacity:0.9; }
      .paid-stamp div { background:#1e7e34; color:white; padding:20px 40px; border-radius:50px; font-size:2rem; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,.3); }
    </style>
    </head><body>
    <div class="container">
      <div class="header">
        <img src="${logo}" class="logo">
        <div class="company">
          <h1>${state.config.name}</h1>
          <div style="text-align:right;">
            <div>${state.config.nif}</div>
            ${state.config.address ? `<div>${state.config.address}</div>` : ''}
            ${state.config.phone ? `<div>Tel: ${state.config.phone}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="invoice-title"><h2>FACTURA</h2><p>Nº Factura: ${inv.id}<br>Fecha Factura: ${inv.date}</p></div>
      <div class="info-grid">
        <div class="info-box">
          <strong>CLIENTE:</strong><br>
          ${inv.client}
          ${inv.clientNIF ? `<br>NIF: ${inv.clientNIF}` : ''}
          ${clientFullAddress ? `<br>${clientFullAddress}` : ''}
        </div>
        <div class="info-box"><strong>FORMA DE PAGO:</strong><br>
          ${inv.paid ? '<strong style="color:#1e7e34">PAGADA</strong>' : 'Transferencia bancaria a:'}
          ${!inv.paid && state.config.iban ? `<div style="margin-top:5px;">IBAN: ${state.config.iban}</div>` : ''}
        </div>
      </div>
      ${inv.concept ? `<div style="margin:20px 0; padding:12px; background:#f0f8ff; border-radius:8px;"><strong>CONCEPTO:</strong><br> ${inv.concept} <span style="float:right">${inv.price ? fmt(inv.price)+' €' : ''}</span></div>` : ''}
      ${inv.items.length ? `<table style="width:100%; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="text-align:left; width:60%;">Descripción</th>
      <th style="text-align:center; width:10%;">Uds</th>
      <th style="text-align:right; width:15%;">Precio</th>
      <th style="text-align:right; width:15%;">Total</th>
    </tr>
  </thead>
  <tbody>
    ${items}
    <tr style="background:#f0f8ff">
      <td colspan="3" style="text-align:right; font-weight:600;font-size:1.1rem">Subtotal</td>
      <td style="text-align:right;font-weight:600;font-size:1.1rem">${fmt(inv.subtotal)} €</td>
    </tr>
  </tbody>
</table>` : ''}
      <div class="totals">
        <table style="width:100%">
          <tr><td class="label">Base</td><td class="amount">${fmt(inv.subtotal)} €</td></tr>
          <tr><td class="label">IVA 21%</td><td class="amount">${fmt(inv.iva)} €</td></tr>
          <tr class="grand"><td class="label">TOTAL</td><td class="amount">${fmt(inv.total)} €</td></tr>
        </table>
      </div>
      ${inv.paid ? `<div class="paid-stamp"><div>PAGADO</div></div>` : ''}
    </div>
    <script>setTimeout(() => print(), 800);</script>
    </body></html>
  `);
  win.document.close();
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