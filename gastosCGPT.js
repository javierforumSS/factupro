const DB = 'factupro_gastos';
const $ = s => document.querySelector(s);
let state = { expenses: [], edit: null };
let currentPhoto = null;

// -------- LOAD & SAVE ----------
const load = () => {
  try {
    state.expenses = JSON.parse(localStorage.getItem(DB)) || [];
    render();
  } catch (e) {
    console.error('Error cargando gastos:', e);
    state.expenses = [];
  }
};

const save = () => {
  try {
    localStorage.setItem(DB, JSON.stringify(state.expenses));
  } catch (e) {
    console.error('Error guardando:', e);
    alert('Error al guardar. Puede que no haya espacio.');
  }
};

// -------- FORMAT ----------
const fmt = n => (n || 0).toFixed(2);
const calcTotal = () => state.expenses.reduce((s, e) => s + e.amount, 0);

// -------- INIT (esperar a que cargue el DOM) ----------
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, inicializando...');
  
  // -------- FOTO ----------
  const fotoBtn = $('#fotoBtn');
  const photoInput = $('#photoInput');
  const previewImg = $('#previewImg');
  const preview = $('#preview');
  
  if (!fotoBtn || !photoInput) {
    console.error('❌ No se encontraron elementos de foto');
    return;
  }
  
  fotoBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Click en botón foto');
    photoInput.value = ''; // Resetear para que funcione en móvil
    photoInput.click();
  };

  photoInput.onchange = (e) => {
    console.log('Cambio en input foto');
    const file = e.target.files[0];
    
    if (!file) {
      console.log('No hay archivo seleccionado');
      return;
    }

    console.log('Archivo:', file.name, 'Tamaño:', file.size);
    
    // Limitar tamaño (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('La foto es muy grande (máx 5MB)');
      return;
    }

    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error('Error leyendo archivo');
      alert('Error al leer la foto');
    };
    
    reader.onload = (ev) => {
      currentPhoto = ev.target.result;
      previewImg.src = currentPhoto;
      preview.style.display = 'block';
      console.log('✅ Foto cargada, tamaño base64:', currentPhoto.length);
    };
    
    reader.readAsDataURL(file);
  };

  // -------- FORM ----------
  const form = $('#form');
  
  form.onsubmit = (e) => {
    e.preventDefault();

    console.log('=== GUARDANDO GASTO ===');
    console.log('currentPhoto:', currentPhoto ? 'SÍ' : 'NO');

    const desc = $('#desc').value.trim();
    const date = $('#date').value;
    const amount = parseFloat($('#amount').value.replace(',', '.')) || 0;

    if (!desc || !date || amount <= 0) {
      alert('Por favor completa todos los campos');
      return;
    }

    let photo = null;
    
    if (state.edit !== null) {
      // Editando: mantener foto vieja si no hay nueva
      photo = currentPhoto !== null ? currentPhoto : state.expenses[state.edit].photo;
    } else {
      // Nuevo: usar foto actual
      photo = currentPhoto;
    }

    const exp = {
      id: state.edit !== null ? state.expenses[state.edit].id : Date.now(),
      desc,
      date,
      amount,
      photo
    };

    console.log('Guardando:', { desc, amount, tienePhoto: !!photo });

    if (state.edit !== null) {
      state.expenses[state.edit] = exp;
    } else {
      state.expenses.push(exp);
    }

    save();
    resetForm();
    render();
  };

  // -------- CANCEL ----------
  $('#cancelBtn').onclick = () => {
    if (confirm('¿Cancelar cambios?')) resetForm();
  };

  // -------- SEARCH ----------
  $('#search').oninput = render;

  // -------- MENU ----------
  $('#menuBtn').onclick = () => {
    const menu = $('#menu');
    menu.style.right = menu.style.right === '0px' ? '-250px' : '0px';
  };

  // Click fuera cierra menú
  document.addEventListener('click', (e) => {
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
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Cargar datos
  load();
});

// -------- RESETEAR FORMULARIO ----------
const resetForm = () => {
  $('#form').reset();
  $('#date').valueAsDate = new Date();
  $('#preview').style.display = 'none';
  $('#previewImg').src = '';
  $('#photoInput').value = '';
  currentPhoto = null;
  state.edit = null;
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
      <div class="invoice" style="padding:12px; background:#f8f9fa; border-radius:12px; margin:8px 0; display:flex; gap:12px; align-items:center;">
        <div style="flex:1;">
          <b style="font-size:1.1rem;">${exp.desc}</b><br>
          <small style="color:#666;">${exp.date} • ${fmt(exp.amount)} €</small>
          ${exp.photo ? `<div style="margin-top:8px;"><img src="${exp.photo}" style="width:80px; height:80px; object-fit:cover; border-radius:6px; cursor:pointer;" onclick="viewPhoto('${exp.photo.replace(/'/g, "\\'")}')"/></div>` : '<div style="margin-top:4px;"><small style="color:#999;">📷 Sin foto</small></div>'}
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <button onclick="editExpense(${idx})" style="background:#ffc107; color:#000; padding:8px 12px; border:none; border-radius:6px; font-weight:600; white-space:nowrap;">Editar</button>
          ${isLast ? `<button onclick="deleteExpense(${idx})" style="background:#dc3545; color:white; padding:8px 12px; border:none; border-radius:6px; font-weight:600;">Borrar</button>` : ''}
        </div>
      </div>
    `;
  }).join('') || `<p style="text-align:center; color:#999; padding:20px;">📝 No hay gastos registrados</p>`;

  $('#total').textContent = fmt(calcTotal()) + ' €';
  $('#count').textContent = state.expenses.length;
};

// -------- VER FOTO GRANDE ----------
window.viewPhoto = (photo) => {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;';
  modal.innerHTML = `
    <img src="${photo}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px;" />
    <button onclick="this.parentElement.remove()" style="position:absolute; top:20px; right:20px; background:white; border:none; width:40px; height:40px; border-radius:50%; font-size:1.5rem; cursor:pointer;">×</button>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
};

// -------- EDITAR ----------
window.editExpense = (i) => {
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// -------- BORRAR ----------
window.deleteExpense = (i) => {
  if (i !== state.expenses.length - 1) {
    alert('⚠️ Solo se puede borrar el último gasto');
    return;
  }

  if (confirm('¿Borrar este gasto?')) {
    state.expenses.splice(i, 1);
    save();
    render();
  }
};

// -------- CONFIG ----------
window.Config = {
  open: () => alert('⚙️ Función de configuración de empresa - Por implementar')
};

// -------- EXPORT ----------
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
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!Array.isArray(imported)) {
            alert('❌ Archivo no válido');
            return;
          }
          if (confirm(`¿Importar ${imported.length} gastos? Esto reemplazará los datos actuales.`)) {
            state.expenses = imported;
            save();
            render();
            alert('✅ Gastos importados correctamente');
          }
        } catch (err) {
          alert('❌ Error al importar: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
};