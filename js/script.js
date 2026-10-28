// Busca elementos por su id y lee números de los campos.
const porId = id => document.getElementById(id);
const numero = id => Math.max(0, Number(porId(id).value) || 0);

// Acá se guardan los indicadores que agrega el usuario.
const indicadoresPersonalizados = [];
let siguienteIdIndicador = 1;

// Gráfico del avance del sprint.
const graficoSprint = new Chart(porId('grafico-sprint'), {
  type: 'line',
  data: {
    labels: ['Día 1', 'Día 3', 'Día 5', 'Día 7', 'Día 9', 'Día 11', 'Día 14'],
    datasets: [
      { label: 'Ideal', data: [100, 85, 70, 55, 40, 20, 0], borderColor: '#292626', borderDash: [5, 5] },
      { label: 'Real', data: [100, 90, 75, 58, 38, 22, 22], borderColor: '#4f46e5', backgroundColor: '#4f46e533', fill: true }
    ]
  },
  options: { maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
});

// Gráfico con la cantidad de bugs resueltos y abiertos.
const graficoBugs = new Chart(porId('grafico-bugs'), {
  type: 'doughnut',
  data: {
    labels: ['Resueltos', 'Abiertos'],
    datasets: [{ data: [85, 15], backgroundColor: ['#22c55e', '#f97316'] }]
  },
  options: { maintainAspectRatio: false }
});

// Actualiza el número, la barra y el detalle de una tarjeta.
function actualizarTarjeta(nombre, valor, detalle) {
  porId(`valor-${nombre}`).textContent = `${valor}%`;
  porId(`barra-${nombre}`).style.width = `${valor}%`;
  porId(`detalle-${nombre}`).textContent = detalle;

  // El valor bajo el primer límite es crítico; hasta 10 puntos más es advertencia.
  return valor < numero(`limite-${nombre}`) ? 'critico' : valor < numero(`limite-${nombre}`) + 10 ? 'aviso' : 'bien';
}

// Recalcula los indicadores y pone al día las tarjetas y los gráficos.
function actualizar() {
  // El porcentaje del sprint sale de las tareas hechas sobre el total.
  const tareasTotal = Math.max(1, numero('tareas-total'));
  const tareasHechas = Math.min(tareasTotal, numero('tareas-hechas'));
  const sprint = Math.round(tareasHechas / tareasTotal * 100);
  porId('tareas-total').value = tareasTotal;
  porId('tareas-hechas').value = tareasHechas;
  porId('sprint').value = sprint;

  // El porcentaje de pruebas sale de las que fueron aprobadas.
  const pruebasTotal = Math.max(1, numero('pruebas-total'));
  const pruebasAprobadas = Math.min(pruebasTotal, numero('pruebas-aprobadas'));
  const qa = Math.round(pruebasAprobadas / pruebasTotal * 100);
  porId('pruebas-total').value = pruebasTotal;
  porId('pruebas-aprobadas').value = pruebasAprobadas;
  porId('qa').value = qa;

  const tiempo = Number(porId('tiempo').value);
  const bugsTotal = numero('bugs-resueltos') + numero('bugs-abiertos');
  const bugs = bugsTotal ? Math.round(numero('bugs-resueltos') / bugsTotal * 100) : 100;
  porId('bugs').value = bugs;

  // Actualiza las cuatro tarjetas que ya vienen en el dashboard.
  const estados = [
    actualizarTarjeta('sprint', sprint, `${tareasHechas} de ${tareasTotal} tareas`),
    actualizarTarjeta('qa', qa, `${pruebasAprobadas} de ${pruebasTotal} pruebas`),
    actualizarTarjeta('tiempo', tiempo, `${Number(porId('diferencia-dias').value) || 0} días de diferencia`),
    actualizarTarjeta('bugs', bugs, `${numero('bugs-abiertos')} bugs abiertos`)
  ];

  // Revisa los indicadores que se agregaron desde el formulario.
  indicadoresPersonalizados.forEach(indicador => {
    const estaEnRiesgo = indicador.sentido === 'mayor'
      ? indicador.valor >= indicador.limite
      : indicador.valor < indicador.limite;
    estados.push(estaEnRiesgo ? 'critico' : 'bien');
    const tarjeta = porId(`kpi-${indicador.id}`);
    tarjeta.querySelector('.valor').textContent = `${indicador.valor}${indicador.unidad ? ` ${indicador.unidad}` : ''}`;
    const estado = tarjeta.querySelector('.estado-kpi');
    estado.textContent = estaEnRiesgo ? 'En riesgo' : 'En rango';
    estado.className = `estado-kpi ${estaEnRiesgo ? 'en-riesgo' : 'en-rango'}`;
  });

  // Resume los estados individuales en un solo estado general.
  const rojos = estados.filter(estado => estado === 'critico').length;
  const amarillos = estados.filter(estado => estado === 'aviso').length;
  const general = porId('estado-general');
  general.className = 'estado';
  if (rojos >= 2 || (rojos && amarillos >= 2)) {
    general.textContent = 'Estado: crítico';
    general.classList.add('critico');
  } else if (rojos || amarillos >= 2) {
    general.textContent = 'Estado: en riesgo';
    general.classList.add('aviso');
  } else {
    general.textContent = 'Estado: bien';
  }

  // Mantiene los gráficos sincronizados con los valores actuales.
  graficoSprint.data.datasets[1].data[6] = 100 - sprint;
  graficoSprint.update();
  graficoBugs.data.datasets[0].data = [numero('bugs-resueltos'), numero('bugs-abiertos')];
  graficoBugs.update();
}

// Al enviar el formulario, crea una tarjeta nueva con los datos ingresados.
porId('form-indicador').addEventListener('submit', evento => {
  evento.preventDefault();

  const nuevo = {
    id: siguienteIdIndicador++,
    nombre: porId('nombre-indicador').value.trim(),
    valor: Number(porId('valor-indicador').value),
    unidad: porId('unidad-indicador').value.trim(),
    limite: Number(porId('limite-indicador').value),
    sentido: porId('sentido-indicador').value
  };

  // No agrega el indicador si falta el nombre o algún valor numérico.
  if (!nuevo.nombre || !Number.isFinite(nuevo.valor) || !Number.isFinite(nuevo.limite)) return;

  indicadoresPersonalizados.push(nuevo);

  // Arma la tarjeta y agrega sus textos sin insertar HTML escrito por el usuario.
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta kpi-personalizado';
  tarjeta.id = `kpi-${nuevo.id}`;

  const titulo = document.createElement('h2');
  titulo.textContent = nuevo.nombre;
  const valor = document.createElement('div');
  valor.className = 'valor';
  const estado = document.createElement('p');
  estado.className = 'estado-kpi';
  const detalle = document.createElement('p');
  detalle.className = 'detalle';
  detalle.textContent = `Límite: ${nuevo.sentido === 'mayor' ? '≥' : '<'} ${nuevo.limite}${nuevo.unidad ? ` ${nuevo.unidad}` : ''}`;
  const quitar = document.createElement('button');
  quitar.type = 'button';
  quitar.className = 'quitar-indicador';
  quitar.textContent = 'Quitar';
  quitar.addEventListener('click', () => {
    // Al quitar la tarjeta, también se borra de la lista usada para calcular el estado.
    indicadoresPersonalizados.splice(indicadoresPersonalizados.findIndex(item => item.id === nuevo.id), 1);
    tarjeta.remove();
    actualizar();
  });

  tarjeta.append(titulo, valor, estado, detalle, quitar);
  porId('indicadores-personalizados').append(tarjeta);
  evento.currentTarget.reset();
  actualizar();
});

// Si se mueve el control del sprint, calcula cuántas tareas están hechas.
porId('sprint').addEventListener('input', () => {
  porId('tareas-hechas').value = Math.round(Number(porId('sprint').value) * numero('tareas-total') / 100);
  actualizar();
});
porId('tareas-hechas').addEventListener('input', actualizar);
porId('tareas-total').addEventListener('input', actualizar);

// Si se mueve el control de pruebas, calcula cuántas fueron aprobadas.
porId('qa').addEventListener('input', () => {
  porId('pruebas-aprobadas').value = Math.round(Number(porId('qa').value) * numero('pruebas-total') / 100);
  actualizar();
});
porId('pruebas-aprobadas').addEventListener('input', actualizar);
porId('pruebas-total').addEventListener('input', actualizar);

// Convierte la eficiencia en una diferencia estimada de días.
porId('tiempo').addEventListener('input', () => {
  const plan = Math.max(1, numero('dias-planificados'));
  const porcentaje = Number(porId('tiempo').value);
  const diferencia = porcentaje === 0 ? plan : Math.round(plan * 100 / porcentaje) - plan;
  porId('diferencia-dias').value = diferencia;
  actualizar();
});

// Si cambia la diferencia de días, vuelve a calcular la eficiencia.
porId('diferencia-dias').addEventListener('input', () => {
  const plan = Math.max(1, numero('dias-planificados'));
  porId('tiempo').value = Math.max(0, Math.min(100, Math.round(plan / (plan + Number(porId('diferencia-dias').value || 0)) * 100)));
  actualizar();
});
porId('dias-planificados').addEventListener('input', actualizar);

// Estima los bugs resueltos a partir del porcentaje y los bugs abiertos.
porId('bugs').addEventListener('input', () => {
  const abiertos = numero('bugs-abiertos');
  const porcentaje = Number(porId('bugs').value);
  porId('bugs-resueltos').value = porcentaje === 100 ? abiertos * 4 : Math.round(porcentaje * abiertos / (100 - porcentaje));
  actualizar();
});
porId('bugs-resueltos').addEventListener('input', actualizar);
porId('bugs-abiertos').addEventListener('input', actualizar);

['sprint', 'qa', 'tiempo', 'bugs'].forEach(nombre => {
  porId(`limite-${nombre}`).addEventListener('input', actualizar);
});

// Los botones cargan valores de ejemplo para probar distintos estados.
document.querySelectorAll('[data-escenario]').forEach(boton => {
  boton.addEventListener('click', () => {
    const escenarios = {
      bien: [85, 35, 41, 82, 164, 200, 96, 14, 1, 92, 85, 8],
      riesgo: [65, 26, 41, 72, 144, 200, 88, 14, -2, 75, 45, 15],
      critico: [40, 16, 41, 55, 110, 200, 70, 14, -5, 50, 25, 30]
    };
    const valores = escenarios[boton.dataset.escenario];
    [
      'sprint', 'tareas-hechas', 'tareas-total', 'qa', 'pruebas-aprobadas',
      'pruebas-total', 'tiempo', 'dias-planificados', 'diferencia-dias',
      'bugs', 'bugs-resueltos', 'bugs-abiertos'
    ].forEach((id, indice) => { porId(id).value = valores[indice]; });
    actualizar();
  });
});

// Cambia entre el tema claro y el oscuro.
porId('cambiar-tema').addEventListener('click', () => {
  document.body.classList.toggle('oscuro');
});

// Muestra los datos iniciales apenas carga la página.
actualizar();
