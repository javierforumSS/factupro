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
    console.log('Foto cargada correctamente'); // Debug
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

  // FIX: Guardar la foto actual correctamente
  let photo = null;
  
  if (state.edit !== null) {
    // Si estamos editando, mantener la foto existente o usar la nueva
    photo = currentPhoto !== null ? currentPhoto : state.expenses[state.edit].photo;
  } else {
    // Si es nuevo, usar la foto actual
    photo = currentPhoto;
  }

  const exp = {
    id: state.edit !== null ? state.expenses[state.edit].id : Date.now(),
    desc,
    date,
    amount,
    photo // Aquí se guarda la foto
  };

  if (state.edit !== null) {
    state.expenses[state.edit] = exp;
  } else {
    state.expenses.push(exp);
  }

  console.log('Guardando gasto con foto:', photo ? 'SÍ' : 'NO'); // Debug
  save();
  resetForm();
  render();
};

// -------- RESETEAR FORMULARIO ----------
const resetForm = () => {
  $('#form').reset();
  $('#date').valueAsDate = new Date();
  $('#preview').style.display = 'none';
  $('#previewImg').src = '';
  currentPhoto = null; // Limpiar la foto temporal
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
          <b>${exp.desc}</b><br>
          <small style="color:#666;">${exp.date} • ${fmt(exp.amount)} €</small>
          ${exp.photo ? `<div style="margin-top:8px;"><img src="${exp.photo}" style="width:100px; height:100px; object-fit:cover; border-radius:6px; border:2px solid #ddd;" onclick="viewPhoto('${exp.photo}')" /></div>` : '<small style="color:#999;">Sin foto</small>'}
        </div>
        <div class="invoice-actions">
          <button onclick="editExpense(${idx})" style="background:#ffc107; color:#000; padding:8px 12px; border:none; border-radius:6px; font-weight:600;">Editar</button>
          ${isLast ? `<button onclick="deleteExpense(${idx})" style="background:#dc3545; color:white; padding:8px 12px; border:none; border-radius:6px; font-weight:600;">Borrar</button>` : ''}
        </div>
      </div>
    `;
  }).join('') || `<p style="text-align:center; color:#999; padding:20px;">Sin gastos registrados</p>`;

  $('#total').textContent = fmt(calcTotal()) + ' €';
  $('#count').textContent = state.expenses.length;
};

// -------- VER FOTO GRANDE ----------
window.viewPhoto = (photo) => {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:9999;';
  modal.innerHTML = `<img src="${photo}" style="max-width:90%; max-height:90%; border-radius:8px;" onclick="this.parentElement.remove()" />`;
  modal.onclick = () => modal.remove();
  document.body.appendChild(modal);
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
  window.scrollTo(0, 0); // Scroll arriba para ver el formulario
};

// -------- BORRAR ----------
window.deleteExpense = i => {
  if (i !== state.expenses.length - 1)
    return alert('Solo se puede borrar el último gasto');

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

// -------- CONFIG (Placeholder) ----------
window.Config = {
  open: () => alert('Función de configuración de empresa - Por implementar')
};

// -------- EXPORT (Placeholder) ----------
window.Export = {
  backup: () => {
    const data = JSON.stringify(state.expenses, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastos_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  import: () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (confirm(`¿Importar ${imported.length} gastos? Esto reemplazará los datos actuales.`)) {
            state.expenses = imported;
            save();
            render();
            alert('Gastos importados correctamente');
          }
        } catch (err) {
          alert('Error al importar: archivo no válido');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
};

// Fecha por defecto
$('#date').valueAsDate = new Date();

// -------- SW --------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// -------- INIT --------
load();