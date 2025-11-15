const DB = 'factupro_gastos';
const $ = s => document.querySelector(s);
let state = { expenses: [], edit: null };
let currentPhoto = null;

// -------- LOAD & SAVE ----------
const load = () => {
  state.expenses = JSON.parse(localStorage.getItem(DB)) || [];
  render();
};
const save = () => localStorage.setItem(DB, JSON.stringify(state.expenses));

// -------- FORMAT ----------
const fmt = n => (n || 0).toFixed(2);
const calcTotal = () => state.expenses.reduce((s, e) => s + e.amount, 0);

// -------- FOTO ----------
$('#fotoBtn').onclick = () => $('#photoInput').click();

$('#photoInput').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    currentPhoto = ev.target.result;
    $('#previewImg').src = currentPhoto;
    $('#preview').style.display = 'block';
  };
  reader.readAsDataURL(file);
};

// -------- GUARDAR / EDITAR GASTO ----------
$('#form').onsubmit = e => {
  e.preventDefault();

  const desc = $('#desc').value.trim();
  const date = $('#date').value;
  const amount = parseFloat($('#amount').value.replace(',', '.')) || 0;

  if (!desc || !date || amount <= 0) return alert('Faltan datos');

  // FOTO SEGURA (no se borra al editar)
  const photo = currentPhoto !== null
    ? currentPhoto
    : (state.edit !== null ? state.expenses[state.edit].photo : null);

  const exp = {
    id: state.edit !== null ? state.expenses[state.edit].id : Date.now(),
    desc,
    date,
    amount,
    photo
  };

  if (state.edit !== null) {
    state.expenses[state.edit] = exp;
  } else {
    state.expenses.push(exp);
  }

  save();
  resetForm();
  render();
};

// -------- RESETEAR FORMULARIO ----------
const resetForm = () => {
  $('#form').reset();
  $('#date').valueAsDate = new Date();
  $('#preview').style.display = 'none';
  currentPhoto = null;
  state.edit = null;
};

$('#cancelBtn').onclick = () => {
  if (confirm('¿Cancelar?')) resetForm();
};

// -------- RENDER ----------
const render = () => {
  const list = $('#list');
  const search = $('#search').value.toLowerCase();

  const filtered = state.expenses.filter(e =>
    e.desc.toLowerCase().includes(search)
  );

  list.innerHTML = filtered.map(exp => {
    const idx = state.expenses.indexOf(exp);
    const isLast = idx === state.expenses.length - 1;

    return `
      <div class="invoice" style="padding:12px; background:#f8f9fa; border-radius:12px; margin:8px 0;">
        <div style="flex:1;">
          <b>${exp.desc}</b>
          <small>${exp.date} • ${fmt(exp.amount)} €</small>
          ${exp.photo ? `<div style="margin-top:8px;"><img src="${exp.photo}" style="width:80px; height:80px; object-fit:cover; border-radius:6px;" /></div>` : ''}
        </div>
        <div class="invoice-actions">
          <button onclick="editExpense(${idx})">Editar</button>
          ${isLast ? `<button onclick="deleteExpense(${idx})" style="background:#dc3545; color:white;">Borrar</button>` : ''}
        </div>
      </div>
    `;
  }).join('') || `<p style="text-align:center; color:#999;">Sin gastos</p>`;

  $('#total').textContent = fmt(calcTotal());
  $('#count').textContent = state.expenses.length;
};

// -------- EDITAR ----------
window.editExpense = i => {
  const exp = state.expenses[i];

  $('#desc').value = exp.desc;
  $('#date').value = exp.date;
  $('#amount').value = exp.amount.toFixed(2);

  if (exp.photo) {
    currentPhoto = exp.photo;
    $('#previewImg').src = currentPhoto;
    $('#preview').style.display = 'block';
  } else {
    currentPhoto = null;
    $('#preview').style.display = 'none';
  }

  state.edit = i;
};

// -------- BORRAR ----------
window.deleteExpense = i => {
  if (i !== state.expenses.length - 1)
    return alert('Solo se puede borrar el último');

  if (confirm('¿Borrar este gasto?')) {
    state.expenses.splice(i, 1);
    save();
    render();
  }
};

// -------- MENU / SEARCH ----------
$('#menuBtn').onclick = () => {
  const menu = $('#menu');
  menu.style.right = menu.style.right === '0px' ? '-250px' : '0px';
};
$('#search').oninput = render;

// Click fuera cierra menú
document.addEventListener('click', e => {
  const menu = $('#menu');
  const btn = $('#menuBtn');
  if (menu.style.right === '0px' && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.style.right = '-250px';
  }
});

// Fecha por defecto
$('#date').valueAsDate = new Date();

// -------- SW --------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

load();
