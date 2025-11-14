const DB = 'factupro_gastos';
const $ = s => document.querySelector(s);
let state = { expenses: [], edit: null };
let currentPhoto = null;

const load = () => {
  state.expenses = JSON.parse(localStorage.getItem(DB)) || [];
  render();
};

const save = () => localStorage.setItem(DB, JSON.stringify(state.expenses));
const fmt = n => (n || 0).toFixed(2);
const calcTotal = () => state.expenses.reduce((s, e) => s + e.amount, 0);

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

$('#form').onsubmit = e => {
  e.preventDefault();
  const desc = $('#desc').value.trim();
  const date = $('#date').value;
  const amount = parseFloat($('#amount').value.replace(',', '.')) || 0;

  if (!desc || !date || amount <= 0) return alert('Faltan datos');

  const exp = {
    id: state.edit !== null ? state.expenses[state.edit].id : Date.now(),
    desc, date, amount, photo: currentPhoto
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

const render = () => {
  const list = $('#list');
  const search = $('#search').value.toLowerCase();
  const filtered = state.expenses.filter(e => e.desc.toLowerCase().includes(search));

  list.innerHTML = filtered.map((exp, idx) => {
    const realIndex = state.expenses.indexOf(exp);
    const isLast = realIndex === state.expenses.length - 1;
    return `
      <div class="invoice" style="padding:12px; background:#f8f9fa; border-radius:12px; margin:8px 0;">
        <div style="flex:1;">
          <b>${exp.desc}</b>
          <small>${exp.date} • ${fmt(exp.amount)} €</small>
          ${exp.photo ? `<div style="margin-top:8px;"><img src="${exp.photo}" style="width:80px; height:80px; object-fit:cover; border-radius:6px;" /></div>` : ''}
        </div>
        <div class="invoice-actions">
          <button onclick="editExpense(${realIndex})">Editar</button>
          ${isLast ? `<button onclick="deleteExpense(${realIndex})" style="background:#dc3545; color:white;">Borrar</button>` : ''}
        </div>
      </div>
    `;
  }).join('') || '<p style="text-align:center; color:#999;">Sin gastos</p>';

  $('#total').textContent = fmt(calcTotal());
  $('#count').textContent = state.expenses.length;
};

window.editExpense = i => {
  const exp = state.expenses[i];
  $('#desc').value = exp.desc;
  $('#date').value = exp.date;
  $('#amount').value = exp.amount;
  if (exp.photo) {
    currentPhoto = exp.photo;
    $('#previewImg').src = currentPhoto;
    $('#preview').style.display = 'block';
  }
  state.edit = i;
};

window.deleteExpense = i => {
  if (i !== state.expenses.length - 1) return alert('Solo se puede borrar el último');
  if (confirm('¿Borrar este gasto?')) {
    state.expenses.splice(i, 1);
    save();
    render();
  }
};

const Config = { open: () => location.href = 'facturas.html' };
const Export = {
  backup: () => {
    const data = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.expenses));
    const a = document.createElement('a'); a.href = data; a.download = 'gastos.json'; a.click();
  },
  import: () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          state.expenses = JSON.parse(ev.target.result);
          save();
          render();
          alert('Gastos importados');
        } catch { alert('Error'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }
};

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


if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}


load();