/* Preparador del examen de licenciatura — U. de Chile (Civil y Procesal).
 * Sitio estático: todo el progreso queda en el navegador (localStorage).
 * Datos en datos/uchile.js (generados desde fuente/ con scripts/generar-datos.mjs). */
(function () {
  'use strict';

  const D = window.DATOS;
  const F = window.FSRS;
  const CLAVE = 'examen-grado-uchile-v1';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const main = $('#main');

  // ---------- Normas (idNorma en Ley Chile, de src/fuentes/normas.mjs del original) ----------
  const NORMAS = {
    CC: ['172986', 'Código Civil'], CCOM: ['1974', 'Código de Comercio'], CPC: ['22740', 'Código de Procedimiento Civil'],
    COT: ['25563', 'Código Orgánico de Tribunales'], CPP: ['176595', 'Código Procesal Penal'], CPR: ['242302', 'Constitución'],
    LPC: ['61438', 'Ley 19.496'], L18010: ['29438', 'Ley 18.010'], L18101: ['29526', 'Ley 18.101'], L18120: ['29544', 'Ley 18.120'],
    L19968: ['229557', 'Ley 19.968'], L20830: ['1075210', 'Ley 20.830 (AUC)'], LMC: ['225128', 'Ley de Matrimonio Civil'],
    LERL: ['225521', 'Ley sobre efecto retroactivo'], DL2695: ['6982', 'DL 2.695'],
  };
  function enlaceNorma(ref) {
    const m = String(ref).match(/^([A-Z0-9]+)\s+(.+)$/);
    if (!m || !NORMAS[m[1]]) return esc(ref);
    const [id, nombre] = NORMAS[m[1]];
    return `<a href="https://www.bcn.cl/leychile/navegar?idNorma=${id}" target="_blank" rel="noopener" title="${esc(nombre)} en Ley Chile">${esc(ref)}</a>`;
  }

  // ---------- Fechas ----------
  const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fechaLarga = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  // ---------- Progreso ----------
  const vacio = () => ({ version: 1, config: { fechaExamen: '', minutos: 60 }, temas: {}, plazos: {}, cuadros: {}, calibracion: [], simulacros: [], historial: [] });
  let P = vacio();
  try { const g = JSON.parse(localStorage.getItem(CLAVE)); if (g && g.version === 1) P = Object.assign(vacio(), g); } catch (e) { /* sin almacenamiento */ }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(P)); } catch (e) { aviso('No se pudo guardar en este navegador. Descarga un respaldo en Ajustes.'); }
  }
  const opcionesFSRS = () => ({ fechaExamen: P.config.fechaExamen || null });

  function registrarTema(id, nota, { error = '', confianza = '', tipo = 'practica', ref = '' } = {}) {
    const previo = P.temas[id] || null;
    const nuevo = F.programar(previo ? stripFSRS(previo) : null, nota, hoy(), opcionesFSRS());
    nuevo.errores = (previo?.errores || []).slice(-9);
    if (error) nuevo.errores.push({ fecha: hoy(), texto: error });
    P.temas[id] = nuevo;
    P.historial.push({ fecha: hoy(), tipo, ref: ref || id, nota });
    if (confianza) P.calibracion.push({ fecha: hoy(), confianza, nota });
    if (P.historial.length > 3000) P.historial = P.historial.slice(-3000);
    if (P.calibracion.length > 2000) P.calibracion = P.calibracion.slice(-2000);
  }
  const stripFSRS = (e) => ({ estabilidad: e.estabilidad, dificultad: e.dificultad, ultimo_repaso: e.ultimo_repaso, proximo: e.proximo, repasos: e.repasos, lapsos: e.lapsos, ultima_calificacion: e.ultima_calificacion });

  const dominioTema = (id) => F.dominio(P.temas[id] ? stripFSRS(P.temas[id]) : null, hoy());
  const ORDEN = ['sin_ver', 'debil', 'aprendiendo', 'consolidando', 'dominado'];
  const NOMBRE_DOM = { sin_ver: 'sin ver', debil: 'débil', aprendiendo: 'aprendiendo', consolidando: 'consolidando', dominado: 'dominado' };
  const punto = (d) => `<span class="punto d-${d}" title="${NOMBRE_DOM[d]}"></span>`;

  // ---------- Cédulas ----------
  const RAMAS = { c: 'civil', p: 'procesal' };
  const NOMBRE_RAMA = { civil: 'Derecho Civil', procesal: 'Derecho Procesal' };
  const CEDULAS = [];
  for (const [k, rama] of Object.entries(RAMAS))
    for (const c of D.cedularios[rama]) CEDULAS.push({ ...c, rama, clave: `${k}-${c.numero}`, temas: (D.mapa[rama]?.[c.numero] || []).filter((t) => D.temas[t]) });
  const cedulaPorClave = (k) => CEDULAS.find((c) => c.clave === k);
  const cedulasDeTema = (id) => CEDULAS.filter((c) => c.temas.includes(id));

  function dominioCedula(c) {
    if (!c.temas.length) return 'sin_ver';
    const ds = c.temas.map(dominioTema);
    const vistos = ds.filter((d) => d !== 'sin_ver');
    if (!vistos.length) return 'sin_ver';
    let min = Math.min(...vistos.map((d) => ORDEN.indexOf(d)));
    if (vistos.length < ds.length) min = Math.min(min, ORDEN.indexOf('aprendiendo'));
    return ORDEN[min];
  }
  const vencidaCedula = (c) => c.temas.some((t) => P.temas[t] && P.temas[t].proximo <= hoy());
  const recCedula = (c) => Math.min(...c.temas.map((t) => (P.temas[t] ? F.recuperabilidadHoy(stripFSRS(P.temas[t]), hoy()) : 1)));

  // Puntos de la cédula: líneas sin sangría; las con sangría van como detalle del punto anterior.
  function puntosDe(c) {
    const lineas = String(c.contenido || '').split('\n').filter((l) => l.trim());
    const puntos = [];
    for (const l of lineas) {
      if (/^\s/.test(l) && puntos.length) puntos[puntos.length - 1].detalle.push(l.trim());
      else puntos.push({ texto: l.trim(), detalle: [] });
    }
    return puntos.length ? puntos : [{ texto: c.tema, detalle: [] }];
  }

  // ---------- Utilidades de interfaz ----------
  function aviso(txt) {
    $$('.toast').forEach((x) => x.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = txt; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); aviso('Copiado. Pégalo en una conversación con Claude.'); }
    catch (e) { mostrarTextoParaCopiar(txt); }
  }
  function mostrarTextoParaCopiar(txt) {
    const div = document.createElement('div'); div.className = 'tarjeta';
    div.innerHTML = `<p><b>No se pudo copiar automáticamente.</b> Selecciona y copia:</p><textarea rows="10">${esc(txt)}</textarea>`;
    main.prepend(div); $('textarea', div).select();
  }
  const diasAlExamen = () => (P.config.fechaExamen ? Math.round((new Date(P.config.fechaExamen + 'T12:00') - new Date(hoy() + 'T12:00')) / 86400000) : null);

  const RUBRICA = {
    1: ['Otra vez', 'No lo recordé o lo confundí en lo esencial.'],
    2: ['Difícil', 'Con pistas, errores relevantes o faltó algo central.'],
    3: ['Bien', 'Correcto en lo esencial, sin ayuda.'],
    4: ['Fácil', 'Preciso, ordenado y lo relacioné solo.'],
  };
  const botonesNota = (sugerida) => `<div class="notas">${[1, 2, 3, 4].map((n) => `<button class="btn ${n === sugerida ? 'sel' : ''}" data-nota="${n}"><b>${n} · ${RUBRICA[n][0]}</b><small>${RUBRICA[n][1]}</small></button>`).join('')}</div>`;
  const botonesConfianza = () => `<div class="fila" data-grupo="confianza"><span class="suave">¿Qué tan seguro estás?</span>${['alta', 'media', 'baja'].map((c) => `<button class="btn chico" data-conf="${c}">${c}</button>`).join('')}</div>`;
  function enlazarConfianza(raiz, alElegir) {
    $$('[data-conf]', raiz).forEach((b) => b.addEventListener('click', () => {
      $$('[data-conf]', raiz).forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); alElegir(b.dataset.conf);
    }));
  }

  // Cronómetro reutilizable
  function cronometro(el, { meta = 0 } = {}) {
    const inicio = Date.now();
    const pinta = () => {
      const s = Math.floor((Date.now() - inicio) / 1000);
      el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      el.style.color = meta && s >= meta * 60 ? 'var(--ok)' : '';
    };
    pinta(); const id = setInterval(() => { if (!document.body.contains(el)) clearInterval(id); else pinta(); }, 1000);
    return { segundos: () => Math.floor((Date.now() - inicio) / 1000), parar: () => clearInterval(id) };
  }

  // ---------- Prompt para Claude ----------
  function promptClase(c) {
    const temas = c.temas.map((t) => `- ${D.temas[t].titulo}${D.temas[t].articulos.length ? ` (normas de apoyo: ${D.temas[t].articulos.join(', ')})` : ''}`).join('\n');
    return `Eres mi preparador para el examen de licenciatura de la Facultad de Derecho de la Universidad de Chile (oral: exposición de cédula de no menos de 10 minutos y luego interrogación de Civil y Procesal; la comisión evalúa comprensión, análisis y síntesis de los principios fundamentales, no detalles reglamentarios — Reglamento, arts. 15–16).

Hazme una clase de la cédula ${c.numero} de ${NOMBRE_RAMA[c.rama]}: "${c.tema}".
Contenido oficial de la cédula (cúbrelo en este orden):
${c.contenido}
Temas que abarca:
${temas}

Método:
1. Parte con una pregunta de entrada antes de explicar; no la corrijas todavía.
2. Explica por bloques (concepto construido desde sus elementos → requisitos → clasificación → efectos → normas → relación con otras instituciones) y después de cada bloque hazme una pregunta de comprobación. Nunca "¿se entiende?". Máximo ~150 palabras sin preguntarme algo.
3. Un caso resuelto por ti y luego uno para mí con una variación.
4. Cierra pidiéndome que exponga el tema completo como ante la comisión; antes de corregir, pregúntame qué tan seguro estoy (alta/media/baja). Califica de 1 a 4 (1 otra vez, 2 difícil, 3 bien, 4 fácil) y nombra el error concreto.

Reglas: no cites el texto literal de un artículo sin traerlo de Ley Chile (bcn.cl/leychile); si no puedes verificarlo, dilo. No atribuyas doctrina a autores ni cites fallos de memoria. Español de Chile, de tú, cercano y exigente.`;
  }
  function promptSimulacro(c) {
    return `Simula la comisión del examen de licenciatura de la Universidad de Chile. Haz de presidente, profesor(a) de Derecho Civil y profesor(a) de Derecho Procesal; marca quién habla.

Formato (Reglamento, arts. 15–16): primero expongo la cédula sorteada — ${NOMBRE_RAMA[c.rama]}, cédula ${c.numero}: "${c.tema}" — sin interrupciones (no menos de 10 minutos; te la escribiré completa de una vez). Luego hasta 15 minutos de preguntas sobre esa asignatura y después la interrogación de Civil y Procesal (20 a 40 minutos en conjunto) sobre los principios fundamentales de las instituciones.

Contenido oficial de la cédula:
${c.contenido}

Estilo de la comisión:
${(D.perfil.estilo_comision || []).map((x) => '- ' + x).join('\n')}

Durante el examen no me corrijas ni me des pistas: si me equivoco, repregunta o pasa a otra cosa, como una comisión real. Salta entre Civil y Procesal. Cuando diga "terminamos", sal del personaje y evalúame de 1,0 a 7,0 por dimensión (exactitud, precisión terminológica, estructura, fundamento normativo, relación, aplicación, expresión), con nota final global, 2–3 fortalezas concretas y los 2–3 puntos que más subirían la nota. No cites texto literal de artículos sin verificarlo en Ley Chile.`;
  }
  function promptCuadro(conf, filas) {
    const [a, b] = conf.temas.map((t) => D.temas[t]?.titulo || t);
    return `Estoy preparando el examen de licenciatura (U. de Chile). Corrige mi cuadro comparativo de memoria: "${conf.nombre}".
Columnas: (A) ${a} · (B) ${b}

${filas.map((f) => `• ${f.eje}\n   A: ${f.a || '(en blanco)'}\n   B: ${f.b || '(en blanco)'}`).join('\n')}

Criterio decisivo que escribí: ${filas.criterio || '(en blanco)'}

Corrige casilla por casilla nombrando la confusión exacta, con la norma (verificada en Ley Chile; si no puedes verificarla, dilo). Después dame 3 casos breves de decisión (al menos uno engañoso) para que diga cuál institución aplica y por qué, y califícame de 1 a 4.`;
  }

  // ======================================================================
  // Vistas
  // ======================================================================
  const VISTAS = {};

  // ---------- Hoy ----------
  VISTAS.hoy = function () {
    const dias = diasAlExamen();
    const vencidas = CEDULAS.filter(vencidaCedula).sort((a, b) => recCedula(a) - recCedula(b));
    const minutos = Number(P.config.minutos) || 60;
    const repasos = vencidas.slice(0, Math.max(0, Math.floor(minutos / 7)));
    const restante = minutos - repasos.length * 7;
    const sinVer = (r) => CEDULAS.filter((c) => c.rama === r && dominioCedula(c) === 'sin_ver' && c.temas.length);
    const sc = sinVer('civil'), sp = sinVer('procesal');
    const nNuevas = Math.max(0, Math.floor(restante / 30));
    const nuevas = [];
    for (let i = 0; nuevas.length < nNuevas && (i < sc.length || i < sp.length); i++) {
      if (sc[i]) nuevas.push(sc[i]); if (nuevas.length < nNuevas && sp[i]) nuevas.push(sp[i]);
    }
    const plazosHoy = D.plazos.filter((p) => P.plazos[p.id] && P.plazos[p.id].proximo <= hoy()).length;
    const totalSinVer = sc.length + sp.length;

    let ritmo = '';
    if (dias != null && dias > 0 && totalSinVer) {
      const diasUtiles = Math.max(1, dias - 14);
      const porDia = Math.ceil(totalSinVer / diasUtiles);
      const capacidad = Math.max(1, Math.floor(minutos / 30));
      ritmo = porDia > capacidad
        ? `<div class="aviso"><b>El ritmo no alcanza.</b> Quedan ${totalSinVer} cédulas sin ver y ${dias} días; dejando las dos últimas semanas para repasar y simular, necesitas ${porDia} cédulas nuevas por día y con ${minutos} minutos te caben ${capacidad}. Opciones: subir los minutos diarios en Ajustes o priorizar las cédulas que te parecen más probables.</div>`
        : `<p class="suave">A este ritmo (${porDia} cédula${porDia > 1 ? 's' : ''} nueva${porDia > 1 ? 's' : ''} por día) terminas de ver todo el cedulario dos semanas antes del examen.</p>`;
    }

    main.innerHTML = `
      <h1>Hoy, ${esc(fechaLarga(hoy()))}</h1>
      ${!P.config.fechaExamen ? `<div class="aviso">Pon tu fecha de examen en <a href="#ajustes">Ajustes</a>: así ningún repaso queda agendado para después de rendir y puedo calcular si el ritmo alcanza.</div>` : ''}
      ${ritmo}
      <div class="rejilla">
        <div class="tarjeta"><div class="cifra">${vencidas.length}</div><div>cédulas con repaso vencido</div>
          ${vencidas.length ? `<p class="suave">Hoy caben ${repasos.length}, de la más olvidada a la menos.</p><a class="btn primario" href="#repaso">Empezar repaso</a>` : '<p class="suave">Nada vencido. Bien.</p>'}</div>
        <div class="tarjeta"><div class="cifra">${plazosHoy}</div><div>plazos por repasar</div>
          <p class="suave">${D.plazos.length} plazos verificados contra Ley Chile.</p><a class="btn" href="#plazos">Practicar plazos</a></div>
        <div class="tarjeta"><div class="cifra">${totalSinVer}</div><div>cédulas sin ver</div>
          <p class="suave">${CEDULAS.length - totalSinVer} de ${CEDULAS.length} ya practicadas.</p><a class="btn" href="#indice">Ver índice</a></div>
      </div>
      ${nuevas.length ? `<div class="tarjeta"><h2>Cédulas nuevas sugeridas</h2>
        <p class="suave">Intercalando Civil y Procesal, en el orden del cedulario. ~30 minutos cada una.</p>
        <ul class="lista">${nuevas.map(itemCedula).join('')}</ul></div>` : ''}
      ${repasos.length ? `<div class="tarjeta"><h2>Repasos de hoy</h2><ul class="lista">${repasos.map(itemCedula).join('')}</ul></div>` : ''}
      <div class="tarjeta"><h2>Cómo estudiar con esto</h2>
        <p>Cada cédula se practica <b>recuperando</b>: primero la explicas sin mirar (escribiéndola o en voz alta, con cronómetro), dices qué tan seguro estás, y recién entonces ves el contenido oficial y marcas qué puntos cubriste. Esa nota agenda el próximo repaso con FSRS, el algoritmo de Anki, justo antes de que se te olvide.</p>
        <p class="suave">Para la explicación de un tema que no conoces, cada cédula trae un botón que copia un prompt de clase listo para pegar en Claude.</p></div>`;
  };

  function itemCedula(c) {
    const venc = vencidaCedula(c) ? ' <span class="etiqueta roja">repasar</span>' : '';
    return `<li><a class="item" href="#cedula-${c.clave}">${punto(dominioCedula(c))}<span class="num">${c.rama === 'civil' ? 'C' : 'P'}${c.numero}</span><span class="tit">${esc(c.tema)}${venc}</span></a></li>`;
  }

  // ---------- Índice ----------
  let ramaIndice = 'civil';
  let filtroIndice = '';
  VISTAS.indice = function () {
    const lista = CEDULAS.filter((c) => c.rama === ramaIndice);
    const conteo = Object.fromEntries(ORDEN.map((d) => [d, 0]));
    lista.forEach((c) => conteo[dominioCedula(c)]++);
    main.innerHTML = `
      <div class="fila entre"><h1>Cedulario oficial</h1>
        <span class="suave">${esc(lista.length)} cédulas obligatorias de ${NOMBRE_RAMA[ramaIndice]}</span></div>
      <div class="pestanas">${Object.values(RAMAS).map((r) => `<button class="btn ${r === ramaIndice ? 'sel' : ''}" data-rama="${r}">${NOMBRE_RAMA[r]}</button>`).join('')}</div>
      <div class="fila" style="margin-bottom:.8rem"><input type="search" id="buscar" placeholder="Buscar en las cédulas (tema o contenido)…" value="${esc(filtroIndice)}"></div>
      <div class="leyenda">${ORDEN.map((d) => `<span>${punto(d)} ${NOMBRE_DOM[d]} (${conteo[d]})</span>`).join('')}</div>
      <div id="lista-indice"></div>`;
    $$('[data-rama]').forEach((b) => b.addEventListener('click', () => { ramaIndice = b.dataset.rama; VISTAS.indice(); }));
    const pintar = () => {
      const q = filtroIndice.toLowerCase();
      const fil = q ? lista.filter((c) => (c.tema + ' ' + c.contenido).toLowerCase().includes(q)) : lista;
      let html = '', sec = '', sub = '';
      for (const c of fil) {
        if (c.seccion !== sec) { if (sec) html += '</ul>'; sec = c.seccion; sub = ''; html += `<h2 class="seccion-indice">${esc(sec)}</h2><ul class="lista tarjeta" style="padding:.2rem .8rem">`; }
        if (c.subseccion && c.subseccion !== sub) { sub = c.subseccion; html += `<li class="subseccion-indice">${esc(sub)}</li>`; }
        html += itemCedula(c);
      }
      $('#lista-indice').innerHTML = (html ? html + '</ul>' : '<p class="suave" style="margin-top:1rem">Sin resultados.</p>');
    };
    $('#buscar').addEventListener('input', (e) => { filtroIndice = e.target.value; pintar(); });
    pintar();
  };

  // ---------- Cédula ----------
  VISTAS.cedula = function (clave) {
    const c = cedulaPorClave(clave);
    if (!c) { main.innerHTML = '<p>Cédula no encontrada. <a href="#indice">Volver al índice</a></p>'; return; }
    const mismas = CEDULAS.filter((x) => x.rama === c.rama);
    const i = mismas.indexOf(c);
    const plazosC = D.plazos.filter((p) => c.temas.includes(p.tema));
    const confC = D.confusiones.filter((x) => x.temas.some((t) => c.temas.includes(t)));
    main.innerHTML = `
      <div class="fila entre"><a href="#indice">← Índice</a>
        <span class="fila">${i > 0 ? `<a class="btn chico" href="#cedula-${mismas[i - 1].clave}">← ${mismas[i - 1].numero}</a>` : ''}${i < mismas.length - 1 ? `<a class="btn chico" href="#cedula-${mismas[i + 1].clave}">${mismas[i + 1].numero} →</a>` : ''}</span></div>
      <p class="suave" style="margin:.8rem 0 .2rem">${NOMBRE_RAMA[c.rama]} · ${esc(c.seccion)}${c.subseccion ? ' · ' + esc(c.subseccion) : ''}</p>
      <h1>${punto(dominioCedula(c))} Cédula ${c.numero}. ${esc(c.tema)}</h1>
      <div class="fila" style="margin:.8rem 0 1rem">
        <button class="btn primario" id="practicar">Practicar recuperación</button>
        <button class="btn" id="copiar-clase">Copiar prompt de clase para Claude</button>
        <button class="btn" id="ver-contenido">Mostrar contenido</button>
      </div>
      <div id="practica"></div>
      <div id="detalle" class="oculto">
        <div class="tarjeta"><h2>Contenido oficial</h2><pre class="contenido-cedula">${esc(c.contenido)}</pre>
          <small>Transcripción del cedulario de pregrado de la Facultad (cédulas obligatorias).</small></div>
      </div>
      <div class="tarjeta"><h2>Temas que abarca</h2>
        ${c.temas.length ? c.temas.map((t) => cajaTema(t)).join('') : '<p class="suave">Esta cédula no tiene temas enlazados.</p>'}</div>
      ${plazosC.length ? `<div class="tarjeta"><h2>Plazos de esta cédula</h2><ul>${plazosC.map((p) => `<li>${esc(p.pregunta)} <details><summary class="suave">respuesta</summary><b>${esc(p.respuesta)}</b> ${p.precision ? `<br><small>${esc(p.precision)}</small>` : ''} <br>${enlaceNorma(p.articulo)}</details></li>`).join('')}</ul></div>` : ''}
      ${confC.length ? `<div class="tarjeta"><h2>No confundir con…</h2><ul>${confC.map((x) => `<li><a href="#confusion-${esc(x.id)}">${esc(x.nombre)}</a></li>`).join('')}</ul></div>` : ''}`;
    $('#ver-contenido').addEventListener('click', (e) => { const d = $('#detalle'); d.classList.toggle('oculto'); e.target.textContent = d.classList.contains('oculto') ? 'Mostrar contenido' : 'Ocultar contenido'; });
    $('#copiar-clase').addEventListener('click', () => copiar(promptClase(c)));
    $('#practicar').addEventListener('click', () => {
      $('#detalle').classList.add('oculto'); $('#ver-contenido').textContent = 'Mostrar contenido';
      practicar(c, $('#practica'), { alTerminar: () => VISTAS.cedula(clave) });
    });
  };

  function cajaTema(t) {
    const T = D.temas[t]; const e = P.temas[t];
    const nombre = (id) => (D.temas[id] ? D.temas[id].titulo : id);
    const enlaceTema = (id) => { const cs = cedulasDeTema(id); return cs.length ? `<a href="#cedula-${cs[0].clave}">${esc(nombre(id))}</a>` : esc(nombre(id)); };
    return `<div class="tema-caja"><div class="fila entre"><b>${punto(dominioTema(t))} ${esc(T.titulo)}</b>
        <small>${e ? `próximo repaso: ${esc(e.proximo)}` : 'sin practicar'}</small></div>
      ${T.articulos.length ? `<div class="articulos"><small class="suave">Normas:</small> ${T.articulos.map(enlaceNorma).join(' ')}</div>` : ''}
      ${T.requiere.length ? `<div><small class="suave">Conviene dominar antes:</small> ${T.requiere.map(enlaceTema).join(' · ')}</div>` : ''}
      ${T.relacionados.length ? `<div><small class="suave">La comisión suele pedir relacionarlo con:</small> ${T.relacionados.map(enlaceTema).join(' · ')}</div>` : ''}
      ${e?.errores?.length ? `<div><small class="suave">Tus errores anteriores:</small><ul>${e.errores.slice(-3).map((x) => `<li><small>${esc(x.fecha)}: ${esc(x.texto)}</small></li>`).join('')}</ul></div>` : ''}
    </div>`;
  }

  // ---------- Práctica de recuperación de una cédula ----------
  function practicar(c, cont, { alTerminar, etiqueta = '' } = {}) {
    let confianza = '';
    cont.innerHTML = `<div class="tarjeta">
      ${etiqueta ? `<p class="suave">${esc(etiqueta)}</p>` : ''}
      <h2>Paso 1 · Explícala sin mirar</h2>
      <p>Expón la cédula ${c.numero} como ante la comisión: concepto, elementos, clasificación, efectos, normas y relaciones. Escríbela aquí o dila en voz alta.</p>
      <div class="fila entre"><div class="cronometro" id="crono">00:00</div><small class="suave">En la U. de Chile la exposición no baja de 10 minutos.</small></div>
      <textarea id="mi-respuesta" rows="8" placeholder="Tu exposición (opcional si la dices en voz alta)…"></textarea>
      <div style="margin:.8rem 0">${botonesConfianza()}</div>
      <button class="btn primario" id="corregir" disabled>Ver contenido y corregir</button>
    </div>`;
    const crono = cronometro($('#crono', cont), { meta: 10 });
    enlazarConfianza(cont, (v) => { confianza = v; $('#corregir', cont).disabled = false; });
    $('#corregir', cont).addEventListener('click', () => {
      crono.parar();
      const puntos = puntosDe(c);
      const texto = $('#mi-respuesta', cont).value;
      cont.innerHTML = `<div class="tarjeta">
        <h2>Paso 2 · Corrige contra el contenido oficial</h2>
        <p>Marca cada punto que cubriste <b>sin ayuda</b>. Sé estricto: si la nota es generosa, el tema vuelve tarde y se olvida.</p>
        ${texto.trim() ? `<details><summary>Tu exposición (${crono.segundos() >= 60 ? Math.round(crono.segundos() / 60) + ' min' : crono.segundos() + ' s'})</summary><pre class="contenido-cedula">${esc(texto)}</pre></details>` : ''}
        <div class="checklist">${puntos.map((p, i) => `<label><input type="checkbox" data-i="${i}"><span>${esc(p.texto)}${p.detalle.length ? `<br><small class="suave">${p.detalle.map(esc).join('<br>')}</small>` : ''}</span></label>`).join('')}</div>
        <div style="margin-top:.8rem"><label for="error">¿Qué te faltó o confundiste? (en una frase que sirva para reestudiar)</label>
          <input type="text" id="error" placeholder="p. ej.: confundí nulidad relativa con inoponibilidad"></div>
        <h3 style="margin-top:1rem">Tu nota</h3><p class="suave" id="sugerencia"></p>
        <div id="notas">${botonesNota(0)}</div>
      </div>`;
      const sugerir = () => {
        const n = $$('input[type=checkbox]', cont).length, m = $$('input[type=checkbox]:checked', cont).length;
        const r = n ? m / n : 0;
        const s = r < 0.4 ? 1 : r < 0.75 ? 2 : 3;
        $('#sugerencia', cont).textContent = `Cubriste ${m} de ${n} puntos. Sugerencia: ${s} (${RUBRICA[s][0]})${s === 3 ? '; pon 4 sólo si además lo relacionaste solo y con precisión' : ''}.`;
        $$('[data-nota]', cont).forEach((b) => b.classList.toggle('sel', Number(b.dataset.nota) === s));
      };
      $$('input[type=checkbox]', cont).forEach((x) => x.addEventListener('change', sugerir)); sugerir();
      $$('[data-nota]', cont).forEach((b) => b.addEventListener('click', () => {
        const nota = Number(b.dataset.nota); const error = $('#error', cont).value.trim();
        c.temas.forEach((t, i) => registrarTema(t, nota, { error, confianza: i === 0 ? confianza : '', tipo: 'cedula', ref: c.clave }));
        guardar();
        const prox = c.temas.length ? P.temas[c.temas[0]].proximo : '';
        let comentario = '';
        if (confianza === 'alta' && nota <= 2) comentario = 'Ojo: estabas seguro y no salió. Ese es el error más peligroso en el examen; vuelve a ver el contenido ahora y explícalo de nuevo en voz alta.';
        else if (confianza === 'baja' && nota >= 3) comentario = 'Sabías más de lo que creías.';
        aviso(`Registrado. Vuelve el ${prox ? fechaLarga(prox) : '—'}.`);
        if (comentario) { cont.innerHTML = `<div class="aviso">${esc(comentario)}</div><button class="btn primario" id="seguir">Seguir</button>`; $('#seguir', cont).addEventListener('click', () => alTerminar && alTerminar()); }
        else if (alTerminar) alTerminar();
      }));
    });
    cont.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Repaso ----------
  VISTAS.repaso = function () {
    const cola = CEDULAS.filter(vencidaCedula).sort((a, b) => recCedula(a) - recCedula(b));
    if (!cola.length) { main.innerHTML = `<h1>Repaso</h1><div class="tarjeta"><p>No hay repasos vencidos. Puedes practicar <a href="#plazos">plazos</a>, una <a href="#confusiones">confusión</a> o una cédula nueva desde el <a href="#indice">índice</a>.</p></div>`; return; }
    const c = cola[0];
    main.innerHTML = `<h1>Repaso</h1><p class="suave">${cola.length} cédula${cola.length > 1 ? 's' : ''} vencida${cola.length > 1 ? 's' : ''}, de la más olvidada a la menos. Califica el <b>primer intento</b>: lo que recordaste solo.</p>
      <h2>${punto(dominioCedula(c))} ${NOMBRE_RAMA[c.rama]}, cédula ${c.numero}: ${esc(c.tema)}</h2><div id="practica"></div>
      <p><a href="#cedula-${c.clave}">Ver la cédula completa</a></p>`;
    practicar(c, $('#practica'), { alTerminar: () => VISTAS.repaso() });
  };

  // ---------- Plazos ----------
  let modoPlazos = 'practica';
  VISTAS.plazos = function () {
    const vencidos = D.plazos.filter((p) => P.plazos[p.id] && P.plazos[p.id].proximo <= hoy());
    const nuevos = D.plazos.filter((p) => !P.plazos[p.id]);
    main.innerHTML = `<div class="fila entre"><h1>Plazos</h1>
      <div class="pestanas"><button class="btn ${modoPlazos === 'practica' ? 'sel' : ''}" data-m="practica">Practicar</button><button class="btn ${modoPlazos === 'tabla' ? 'sel' : ''}" data-m="tabla">Tabla de consulta</button></div></div>
      <p class="suave">Cada plazo está comprobado contra el texto vigente de Ley Chile en el proyecto original. Varios cambiaron con reformas: contestación 18 días (antes 15), excepciones en el ejecutivo 8 días (antes 4), nulidad penal 15 días (antes 10).</p>
      <div id="zona"></div>`;
    $$('[data-m]').forEach((b) => b.addEventListener('click', () => { modoPlazos = b.dataset.m; VISTAS.plazos(); }));
    const zona = $('#zona');
    if (modoPlazos === 'tabla') {
      zona.innerHTML = `<div class="tabla-scroll tarjeta"><table><tr><th>Pregunta</th><th>Respuesta</th><th>Norma</th></tr>${D.plazos.map((p) => `<tr><td>${esc(p.pregunta)}</td><td><b>${esc(p.respuesta)}</b>${p.precision ? `<br><small>${esc(p.precision)}</small>` : ''}</td><td>${enlaceNorma(p.articulo)}</td></tr>`).join('')}</table></div>`;
      return;
    }
    const cola = [...vencidos, ...nuevos.slice(0, 10)];
    if (!cola.length) { zona.innerHTML = '<div class="tarjeta"><p>Al día con los plazos. Vuelve mañana o revisa la tabla.</p></div>'; return; }
    const p = cola[0];
    let confianza = '';
    zona.innerHTML = `<div class="tarjeta"><div class="fila entre"><small class="suave">${vencidos.length} por repasar · ${nuevos.length} nuevos (10 por sesión)</small>${P.plazos[p.id] ? '<span class="etiqueta">repaso</span>' : '<span class="etiqueta">nuevo</span>'}</div>
      <p class="tarjeta-plazo" style="margin-top:.6rem">${esc(p.pregunta)}</p>
      <textarea id="resp" rows="2" placeholder="Tu respuesta…" style="min-height:3rem"></textarea>
      <div style="margin:.7rem 0">${botonesConfianza()}</div>
      <button class="btn primario" id="ver" disabled>Ver respuesta</button>
      <div id="sol" class="oculto" style="margin-top:1rem"><div class="respuesta"><b>${esc(p.respuesta)}</b>${p.precision ? `<p style="margin:.4rem 0 0"><small>${esc(p.precision)}</small></p>` : ''}<p style="margin:.4rem 0 0">${enlaceNorma(p.articulo)}</p></div>
        <h3 style="margin-top:1rem">¿Cómo te fue?</h3>${botonesNota(0)}</div></div>`;
    enlazarConfianza(zona, (v) => { confianza = v; $('#ver').disabled = false; });
    $('#ver').addEventListener('click', () => { $('#sol').classList.remove('oculto'); $('#ver').classList.add('oculto'); });
    $$('[data-nota]', zona).forEach((b) => b.addEventListener('click', () => {
      const nota = Number(b.dataset.nota);
      const previo = P.plazos[p.id];
      P.plazos[p.id] = F.programar(previo || null, nota, hoy(), opcionesFSRS());
      P.calibracion.push({ fecha: hoy(), confianza, nota });
      P.historial.push({ fecha: hoy(), tipo: 'plazo', ref: p.id, nota });
      guardar(); VISTAS.plazos();
    }));
  };

  // ---------- Confusiones ----------
  let filtroConf = '';
  VISTAS.confusiones = function () {
    main.innerHTML = `<h1>Instituciones que se confunden</h1>
      <p>Es donde más se pierde en el oral: la comisión repregunta justo en la frontera. Arma el cuadro <b>de memoria</b>, después revisa con las normas (o pégalo en Claude para que lo corrija) y termina escribiendo en una frase el criterio que las separa.</p>
      <input type="search" id="bc" placeholder="Buscar (nulidad, casación, prescripción…)" value="${esc(filtroConf)}" style="margin-bottom:.8rem"><div id="lc"></div>`;
    const pintar = () => {
      const q = filtroConf.toLowerCase();
      const lista = D.confusiones.filter((x) => !q || x.nombre.toLowerCase().includes(q));
      $('#lc').innerHTML = `<ul class="lista tarjeta" style="padding:.2rem .8rem">${lista.map((x) => {
        const vistos = x.temas.filter((t) => P.temas[t]).length;
        const hecho = P.cuadros[x.id]?.nota;
        return `<li><a class="item" href="#confusion-${esc(x.id)}"><span class="tit">${esc(x.nombre)}</span>${hecho ? `<span class="etiqueta">último: ${hecho}</span>` : ''}<small class="suave">${vistos}/${x.temas.length} temas vistos</small></a></li>`;
      }).join('')}</ul>`;
    };
    $('#bc').addEventListener('input', (e) => { filtroConf = e.target.value; pintar(); });
    pintar();
  };
  VISTAS.confusion = function (id) {
    const x = D.confusiones.find((y) => y.id === id);
    if (!x) { main.innerHTML = '<p>No encontrada. <a href="#confusiones">Volver</a></p>'; return; }
    const cols = x.temas.slice(0, 3);
    const guardado = P.cuadros[id] || {};
    const sinVer = x.temas.filter((t) => !P.temas[t]);
    main.innerHTML = `<a href="#confusiones">← Todas</a><h1 style="margin-top:.6rem">${esc(x.nombre)}</h1>
      ${sinVer.length ? `<div class="aviso">Comparar lo que todavía no se conoce sirve poco. Aún no practicas: ${sinVer.map((t) => esc(D.temas[t]?.titulo || t)).join(', ')}.</div>` : ''}
      <div class="tarjeta tabla-scroll"><table><tr><th>Eje</th>${cols.map((t) => `<th>${esc(D.temas[t]?.titulo || t)}</th>`).join('')}</tr>
        ${x.ejes.map((e, i) => `<tr><th>${esc(e)}</th>${cols.map((t, j) => `<td><textarea data-c="${i}-${j}">${esc(guardado.celdas?.[`${i}-${j}`] || '')}</textarea></td>`).join('')}</tr>`).join('')}
      </table>
      <div style="margin-top:.8rem"><label for="criterio">El criterio decisivo que las separa, en una frase</label><input type="text" id="criterio" value="${esc(guardado.criterio || '')}"></div>
      <div class="fila" style="margin-top:.8rem"><button class="btn primario" id="revisar">Revisar</button><button class="btn" id="copiar-cuadro">Copiar para que Claude lo corrija</button></div></div>
      <div id="revision" class="oculto"><div class="tarjeta"><h2>Revisa con la norma en la mano</h2>
        ${cols.map((t) => (D.temas[t] ? `<p><b>${esc(D.temas[t].titulo)}:</b> ${D.temas[t].articulos.map(enlaceNorma).join(' ') || '<span class="suave">sin normas listadas</span>'} ${cedulasDeTema(t).map((c) => `<a class="etiqueta" href="#cedula-${c.clave}">cédula ${c.numero}</a>`).join(' ')}</p>` : '')).join('')}
        <p class="suave">Corrige casilla por casilla. Luego califica qué tan bien las distinguiste.</p>${botonesNota(0)}</div></div>`;
    const recoger = () => {
      if (!$('#criterio')) return; // la vista ya cambió
      const celdas = {}; $$('[data-c]').forEach((t) => { if (t.value.trim()) celdas[t.dataset.c] = t.value; });
      P.cuadros[id] = { ...(P.cuadros[id] || {}), celdas, criterio: $('#criterio').value }; guardar();
    };
    let espera; $$('textarea, #criterio').forEach((el) => el.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(recoger, 600); }));
    $('#revisar').addEventListener('click', () => { recoger(); $('#revision').classList.remove('oculto'); $('#revision').scrollIntoView({ behavior: 'smooth' }); });
    $('#copiar-cuadro').addEventListener('click', () => {
      recoger();
      const filas = x.ejes.map((e, i) => ({ eje: e, a: $(`[data-c="${i}-0"]`).value.trim(), b: $(`[data-c="${i}-1"]`)?.value.trim() }));
      filas.criterio = $('#criterio').value.trim(); copiar(promptCuadro(x, filas));
    });
    $$('[data-nota]').forEach((b) => b.addEventListener('click', () => {
      const nota = Number(b.dataset.nota);
      x.temas.filter((t) => D.temas[t]).forEach((t) => registrarTema(t, nota, { tipo: 'confusion', ref: id, error: nota <= 2 ? `confunde: ${x.nombre}` : '' }));
      P.cuadros[id] = { ...(P.cuadros[id] || {}), nota, fecha: hoy() }; guardar(); aviso('Registrado.'); location.hash = 'confusiones';
    }));
  };

  // ---------- Simulacro ----------
  function preguntasInterrogacion(c) {
    const azar = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const mezclar = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const temasRama = (r) => Object.keys(D.temas).filter((t) => D.temas[t].rama === r);
    const hacer = (t) => {
      const T = D.temas[t]; const cs = cedulasDeTema(t);
      const opciones = [
        { q: `«${T.titulo}»: construya el concepto a partir de sus elementos.` },
        { q: `«${T.titulo}»: ¿qué problema resuelve y por qué el legislador lo regula así?` },
        { q: `«${T.titulo}»: dé un ejemplo concreto y explique sus efectos.` },
      ];
      if (T.relacionados.length) { const r = azar(T.relacionados.filter((x) => D.temas[x]) || []); if (r) opciones.push({ q: `Relacione «${T.titulo}» con «${D.temas[r].titulo}».` }); }
      if (T.articulos.length) opciones.push({ q: `«${T.titulo}»: ¿dónde está regulado y cuáles son sus normas centrales?`, a: T.articulos.join(', ') });
      const pl = D.plazos.filter((p) => p.tema === t);
      if (pl.length) { const p = azar(pl); opciones.push({ q: p.pregunta, a: p.respuesta }); }
      const o = azar(opciones);
      return { ...o, tema: t, cedula: cs[0] };
    };
    const propios = mezclar(c.temas.length > 0 ? temasRama(c.rama).filter((t) => !c.temas.includes(t)) : []).slice(0, 2);
    const civ = mezclar(temasRama('civil').filter((t) => !propios.includes(t))).slice(0, 3);
    const pro = mezclar(temasRama('procesal').filter((t) => !propios.includes(t))).slice(0, 3);
    const segunda = [];
    for (let i = 0; i < 3; i++) { if (civ[i]) segunda.push(civ[i]); if (pro[i]) segunda.push(pro[i]); }
    return { primera: propios.map(hacer), segunda: segunda.map(hacer) };
  }

  let sim = null;
  VISTAS.simulacro = function () {
    if (!sim) {
      main.innerHTML = `<h1>Simulacro</h1>
        <div class="tarjeta"><p>Formato de la U. de Chile: <b>exposición de la cédula sorteada</b> (no menos de 10 minutos), <b>preguntas sobre esa asignatura</b> (hasta 15 minutos) e <b>interrogación de Civil y Procesal</b> (20 a 40 minutos en conjunto) sobre los principios fundamentales (Reglamento, arts. 15–16). Responde en voz alta, como en el examen; aquí sólo llevas el tiempo y te calificas.</p>
        <div class="fila"><label style="margin:0">Sortear de</label>
          <select id="de" style="width:auto"><option value="ambos">Civil o Procesal</option><option value="civil">Civil</option><option value="procesal">Procesal</option></select>
          <select id="prio" style="width:auto"><option value="azar">Al azar (como el examen)</option><option value="debiles">Entre mis débiles y sin ver</option></select>
          <button class="btn primario" id="sortear">Sortear cédula</button></div></div>
        ${historialSimulacros()}`;
      $('#sortear').addEventListener('click', () => {
        const de = $('#de').value, prio = $('#prio').value;
        let pool = CEDULAS.filter((c) => c.temas.length && (de === 'ambos' || c.rama === de));
        if (prio === 'debiles') { const d = pool.filter((c) => ['sin_ver', 'debil', 'aprendiendo'].includes(dominioCedula(c))); if (d.length) pool = d; }
        const c = pool[Math.floor(Math.random() * pool.length)];
        sim = { cedula: c.clave, paso: 'preparar', preguntas: preguntasInterrogacion(c), notas: {}, idx: 0 };
        VISTAS.simulacro();
      });
      return;
    }
    const c = cedulaPorClave(sim.cedula);
    const cabecera = `<div class="fila entre"><h1>Simulacro</h1><button class="btn chico" id="abandonar">Abandonar</button></div>
      <p class="suave">${NOMBRE_RAMA[c.rama]} · cédula ${c.numero}</p><h2>${esc(c.tema)}</h2>`;
    const enlazarAbandonar = () => $('#abandonar')?.addEventListener('click', () => { sim = null; VISTAS.simulacro(); });

    if (sim.paso === 'preparar') {
      main.innerHTML = `${cabecera}<div class="tarjeta"><p>En la U. de Chile la cédula se sortea el día anterior. Revisa su contenido y, cuando estés listo, empieza la exposición: el contenido se oculta.</p>
        <pre class="contenido-cedula">${esc(c.contenido)}</pre>
        <div class="fila" style="margin-top:.8rem"><button class="btn primario" id="empezar">Empezar exposición</button><button class="btn" id="copiar-sim">Copiar prompt para simular la comisión con Claude</button></div></div>`;
      enlazarAbandonar();
      $('#copiar-sim').addEventListener('click', () => copiar(promptSimulacro(c)));
      $('#empezar').addEventListener('click', () => { sim.paso = 'exponer'; VISTAS.simulacro(); });
    } else if (sim.paso === 'exponer') {
      main.innerHTML = `${cabecera}<div class="tarjeta"><h3>Primera parte · Exposición</h3><p>Expón sin interrupciones. Mínimo 10 minutos (el reloj se pone verde).</p>
        <div class="cronometro" id="crono">00:00</div><button class="btn primario" id="fin-exp" style="margin-top:.6rem">Terminé la exposición</button></div>`;
      enlazarAbandonar();
      const cr = cronometro($('#crono'), { meta: 10 });
      $('#fin-exp').addEventListener('click', () => { sim.exposicion = cr.segundos(); cr.parar(); sim.paso = 'preguntas'; sim.idx = 0; VISTAS.simulacro(); });
    } else if (sim.paso === 'preguntas') {
      const todas = [...sim.preguntas.primera.map((p) => ({ ...p, parte: 'Preguntas sobre la asignatura de la cédula' })), ...sim.preguntas.segunda.map((p) => ({ ...p, parte: 'Segunda parte · Interrogación de Civil y Procesal' }))];
      if (!sim.inicioPreguntas) sim.inicioPreguntas = Date.now();
      const p = todas[sim.idx];
      if (!p) { sim.paso = 'evaluar'; VISTAS.simulacro(); return; }
      const T = D.temas[p.tema];
      main.innerHTML = `${cabecera}<div class="tarjeta"><div class="fila entre"><h3>${esc(p.parte)}</h3><small class="suave">Pregunta ${sim.idx + 1} de ${todas.length} · <span id="crono"></span> en interrogación</small></div>
        <p class="tarjeta-plazo">${esc(p.q)}</p><p class="suave">Respóndela en voz alta, completa, antes de ver la pauta.</p>
        <button class="btn" id="pauta">Ver pauta</button>
        <div id="sol" class="oculto" style="margin-top:.8rem"><div class="respuesta">
          ${p.a ? `<p><b>${esc(p.a)}</b></p>` : ''}
          <p><small>Tema: ${esc(T.titulo)}${T.articulos.length ? ' · ' + T.articulos.map(enlaceNorma).join(' ') : ''}</small></p>
          ${p.cedula ? `<details><summary>Contenido de la cédula ${p.cedula.numero} (${NOMBRE_RAMA[p.cedula.rama]})</summary><pre class="contenido-cedula">${esc(p.cedula.contenido)}</pre></details>` : ''}</div>
          <h3 style="margin-top:.8rem">¿Cómo respondiste?</h3>${botonesNota(0)}</div></div>`;
      enlazarAbandonar();
      const span = $('#crono'); const tick = () => { const s = Math.floor((Date.now() - sim.inicioPreguntas) / 1000); span.textContent = `${Math.floor(s / 60)} min`; };
      tick(); const iv = setInterval(() => { if (!document.body.contains(span)) clearInterval(iv); else tick(); }, 5000);
      $('#pauta').addEventListener('click', () => { $('#sol').classList.remove('oculto'); $('#pauta').classList.add('oculto'); });
      $$('[data-nota]').forEach((b) => b.addEventListener('click', () => { sim.notas[sim.idx] = { tema: p.tema, nota: Number(b.dataset.nota), q: p.q }; sim.idx++; VISTAS.simulacro(); }));
    } else if (sim.paso === 'evaluar') {
      const dims = ['Exactitud', 'Precisión terminológica', 'Estructura', 'Fundamento normativo', 'Relación', 'Aplicación', 'Expresión y aplomo'];
      const minExp = Math.round((sim.exposicion || 0) / 60);
      main.innerHTML = `${cabecera}<div class="tarjeta"><h3>Evaluación</h3>
        <p class="suave">Exposición: ${minExp} min${minExp < 10 ? ' (bajo los 10 minutos exigidos)' : ''} · ${Object.keys(sim.notas).length} preguntas respondidas.</p>
        <p>Califícate como lo haría la comisión, de 1,0 a 7,0 por dimensión (4,0 aprueba). La nota final es un juicio global, no un promedio mecánico: parte del promedio y ajústala.</p>
        <div class="tabla-scroll"><table>${dims.map((d, i) => `<tr><th>${d}</th><td><input type="number" min="1" max="7" step="0.5" value="4" data-dim="${i}" style="width:6rem"></td></tr>`).join('')}
          <tr><th>Nota final</th><td><input type="number" min="1" max="7" step="0.1" id="final" style="width:6rem"></td></tr></table></div>
        <div style="margin-top:.8rem"><label for="fort">Dos o tres fortalezas concretas</label><textarea id="fort" rows="2" style="min-height:3rem"></textarea></div>
        <div style="margin-top:.6rem"><label for="mej">Lo que más subiría la nota</label><textarea id="mej" rows="2" style="min-height:3rem"></textarea></div>
        <div class="fila" style="margin-top:.8rem"><button class="btn primario" id="guardar-sim">Guardar simulacro</button></div></div>`;
      enlazarAbandonar();
      const prom = () => { const v = $$('[data-dim]').map((x) => Number(x.value) || 0); $('#final').value = (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1); };
      $$('[data-dim]').forEach((x) => x.addEventListener('input', prom)); prom();
      $('#guardar-sim').addEventListener('click', () => {
        const dimsV = Object.fromEntries($$('[data-dim]').map((x) => [dims[x.dataset.dim], Number(x.value)]));
        for (const n of Object.values(sim.notas)) registrarTema(n.tema, n.nota, { tipo: 'simulacro', ref: c.clave, error: n.nota <= 2 ? `simulacro: ${n.q}` : '' });
        P.simulacros.push({ fecha: hoy(), cedula: c.clave, tema: c.tema, exposicionMin: minExp, nota: Number($('#final').value), dimensiones: dimsV, fortalezas: $('#fort').value, mejorar: $('#mej').value, preguntas: Object.values(sim.notas) });
        guardar(); sim = null; aviso('Simulacro guardado.'); VISTAS.simulacro();
      });
    }
  };
  function historialSimulacros() {
    if (!P.simulacros.length) return '';
    return `<div class="tarjeta"><h2>Simulacros anteriores</h2><div class="tabla-scroll"><table><tr><th>Fecha</th><th>Cédula</th><th>Exposición</th><th>Nota</th><th>Para mejorar</th></tr>
      ${P.simulacros.slice().reverse().map((s) => `<tr><td>${esc(s.fecha)}</td><td><a href="#cedula-${esc(s.cedula)}">${esc(s.cedula.toUpperCase())}</a> ${esc(s.tema)}</td><td>${esc(s.exposicionMin)} min</td><td><b>${esc(Number(s.nota).toFixed(1).replace('.', ','))}</b></td><td><small>${esc(s.mejorar)}</small></td></tr>`).join('')}</table></div></div>`;
  }

  // ---------- Progreso ----------
  VISTAS.progreso = function () {
    const porUnidad = {};
    for (const [id, T] of Object.entries(D.temas)) { const k = `${T.rama}|${T.unidad}`; (porUnidad[k] ||= []).push(dominioTema(id)); }
    const colores = { dominado: '#27ae60', consolidando: '#d4ac0d', aprendiendo: '#e67e22', debil: '#c0392b' };
    const barra = (ds) => `<div class="barra">${['dominado', 'consolidando', 'aprendiendo', 'debil'].map((d) => { const n = ds.filter((x) => x === d).length; return n ? `<i style="width:${(100 * n) / ds.length}%;background:${colores[d]}" title="${NOMBRE_DOM[d]}: ${n}"></i>` : ''; }).join('')}</div>`;
    const cal = ['alta', 'media', 'baja'].map((c) => { const r = P.calibracion.filter((x) => x.confianza === c); const ok = r.filter((x) => x.nota >= 3).length; return { c, n: r.length, pct: r.length ? Math.round((100 * ok) / r.length) : null }; });
    const errores = Object.entries(P.temas).flatMap(([id, e]) => (e.errores || []).map((x) => ({ ...x, id }))).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 15);
    const olvidados = Object.entries(P.temas).filter(([, e]) => e.lapsos > 0).sort((a, b) => b[1].lapsos - a[1].lapsos).slice(0, 8);
    const ultimos14 = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return { f, n: P.historial.filter((h) => h.fecha === f).length }; });
    const max = Math.max(1, ...ultimos14.map((x) => x.n));
    const cedC = Object.fromEntries(ORDEN.map((d) => [d, 0])); CEDULAS.forEach((c) => cedC[dominioCedula(c)]++);
    main.innerHTML = `<h1>Progreso</h1>
      <div class="rejilla">
        <div class="tarjeta"><div class="cifra">${CEDULAS.length - cedC.sin_ver}/${CEDULAS.length}</div><div>cédulas practicadas</div><small class="suave">${cedC.dominado} dominadas · ${cedC.debil} débiles</small></div>
        <div class="tarjeta"><div class="cifra">${P.historial.length}</div><div>recuperaciones registradas</div>
          <div style="display:flex;gap:3px;align-items:flex-end;height:40px;margin-top:.5rem">${ultimos14.map((x) => `<div title="${x.f}: ${x.n}" style="flex:1;background:var(--azul);opacity:${x.n ? 1 : .15};height:${Math.max(3, (40 * x.n) / max)}px;border-radius:2px"></div>`).join('')}</div><small class="suave">últimos 14 días</small></div>
        <div class="tarjeta"><div class="cifra">${P.simulacros.length ? Number(P.simulacros[P.simulacros.length - 1].nota).toFixed(1).replace('.', ',') : '—'}</div><div>último simulacro</div><small class="suave">${P.simulacros.length} en total</small></div>
      </div>
      <div class="tarjeta"><h2>Dominio por unidad</h2><div class="leyenda" style="margin-bottom:.6rem">${['dominado', 'consolidando', 'aprendiendo', 'debil'].map((d) => `<span>${punto(d)} ${NOMBRE_DOM[d]}</span>`).join('')}</div>
        ${Object.entries(porUnidad).map(([k, ds]) => { const [r, u] = k.split('|'); return `<div style="margin:.55rem 0"><div class="fila entre"><span>${esc(u)} <small class="suave">${r === 'civil' ? 'Civil' : 'Procesal'}</small></span><small class="suave">${ds.filter((d) => d !== 'sin_ver').length}/${ds.length}</small></div>${barra(ds)}</div>`; }).join('')}</div>
      <div class="tarjeta"><h2>Calibración</h2><p class="suave">Cuánto aciertas (nota 3 o 4) según la seguridad que declaraste antes de corregir. Si con confianza alta aciertas poco, estás sobreestimando lo que sabes.</p>
        <table><tr><th>Confianza</th><th>Respuestas</th><th>Aciertos</th></tr>${cal.map((x) => `<tr><td>${x.c}</td><td>${x.n}</td><td>${x.pct == null ? '—' : x.pct + ' %'}</td></tr>`).join('')}</table></div>
      ${olvidados.length ? `<div class="tarjeta"><h2>Lo que más se te olvida</h2><ul>${olvidados.map(([id, e]) => `<li>${esc(D.temas[id]?.titulo || id)} <small class="suave">(${e.lapsos} olvido${e.lapsos > 1 ? 's' : ''})</small></li>`).join('')}</ul></div>` : ''}
      ${errores.length ? `<div class="tarjeta"><h2>Errores recientes</h2><ul>${errores.map((x) => `<li><small class="suave">${esc(x.fecha)}</small> ${esc(D.temas[x.id]?.titulo || x.id)}: ${esc(x.texto)}</li>`).join('')}</ul></div>` : ''}
      ${historialSimulacros()}`;
  };

  // ---------- Examen ----------
  VISTAS.examen = function () {
    const p = D.perfil, e = p.examen;
    main.innerHTML = `<h1>${esc(e.nombre)} — ${esc(p.nombre)}</h1>
      <div class="tarjeta"><h2>Cómo es</h2>${(e.partes || []).map((x) => `<h3>${esc(x.titulo)}</h3><p>${esc(x.detalle)} <small class="suave">(${esc(x.fuente)})</small></p>`).join('')}</div>
      <div class="tarjeta"><h2>Comisión</h2><p>${esc(e.comision)}</p><p><small class="suave">${esc((e.fuentes_comision || []).join('; '))}</small></p>
        <h3>Sorteo</h3><p>${esc(e.sorteo)}</p><h3>Calificación</h3><p>${esc(e.calificacion)}</p><h3>Si se reprueba</h3><p>${esc(e.reprobacion)}</p><h3>Nota final de licenciatura</h3><p>${esc(e.nota_final)}</p></div>
      <div class="tarjeta"><h2>Estilo de la comisión</h2><p class="suave">Derivado del art. 16: se evalúa comprensión, análisis y síntesis de los principios, no memoria de detalles.</p><ul>${(p.estilo_comision || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="tarjeta"><h2>Por confirmar</h2><ul>${(p.por_confirmar || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="tarjeta"><h2>Fuentes</h2><ul>${(p.fuentes || []).map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)}</a></li>`).join('')}</ul><small class="suave">Revisado: ${esc(p.revisado)}. Confirma siempre con la Secretaría de Estudios.</small></div>`;
  };

  // ---------- Ajustes ----------
  VISTAS.ajustes = function () {
    main.innerHTML = `<h1>Ajustes</h1>
      <div class="tarjeta pila"><div><label for="fecha">Fecha del examen</label><input type="date" id="fecha" value="${esc(P.config.fechaExamen)}" style="max-width:14rem"></div>
        <div><label for="min">Minutos de estudio por día</label><input type="number" id="min" min="15" max="600" step="15" value="${esc(P.config.minutos)}" style="max-width:8rem"></div>
        <button class="btn primario" id="guardar-aj">Guardar</button></div>
      <div class="tarjeta"><h2>Respaldo</h2><p>Tu progreso vive sólo en este navegador. Descarga un respaldo de vez en cuando, y úsalo para pasar tu avance a otro computador o al celular.</p>
        <div class="fila"><button class="btn" id="descargar">Descargar respaldo</button><button class="btn" id="copiar-resp">Copiar respaldo</button>
          <label class="btn" style="margin:0;font-weight:400">Importar respaldo<input type="file" id="importar" accept="application/json,.json" class="oculto"></label></div></div>
      <div class="tarjeta"><h2>Borrar todo</h2><p class="suave">Elimina el progreso de este navegador. No se puede deshacer.</p><button class="btn" id="borrar">Borrar progreso</button></div>`;
    $('#guardar-aj').addEventListener('click', () => { P.config.fechaExamen = $('#fecha').value; P.config.minutos = Math.max(15, Number($('#min').value) || 60); guardar(); pintarCabecera(); aviso('Guardado.'); });
    $('#descargar').addEventListener('click', () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 1)], { type: 'application/json' }));
      a.download = `examen-grado-respaldo-${hoy()}.json`; document.body.appendChild(a); a.click(); a.remove();
    });
    $('#copiar-resp').addEventListener('click', async () => { try { await navigator.clipboard.writeText(JSON.stringify(P)); aviso('Respaldo copiado.'); } catch (e) { mostrarTextoParaCopiar(JSON.stringify(P)); } });
    $('#importar').addEventListener('change', async (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      try { const g = JSON.parse(await f.text()); if (g.version !== 1 || !g.temas) throw new Error(); P = Object.assign(vacio(), g); guardar(); pintarCabecera(); aviso('Respaldo importado.'); VISTAS.ajustes(); }
      catch (e) { aviso('Ese archivo no es un respaldo válido.'); }
    });
    let armado = false;
    $('#borrar').addEventListener('click', (ev) => {
      if (!armado) { armado = true; ev.target.textContent = 'Confirmar: borrar todo'; ev.target.classList.add('primario'); return; }
      P = vacio(); guardar(); pintarCabecera(); aviso('Progreso borrado.'); VISTAS.ajustes();
    });
  };

  // ---------- Router ----------
  function pintarCabecera() {
    const d = diasAlExamen();
    $('#cuenta').innerHTML = d == null ? '<a href="#ajustes">Fija tu fecha de examen</a>' : d >= 0 ? `<b>${d}</b> día${d === 1 ? '' : 's'} para el examen` : 'Examen rendido';
  }
  function ruta() {
    const h = (location.hash || '#hoy').slice(1);
    let vista = h, arg = null;
    if (h.startsWith('cedula-')) { vista = 'cedula'; arg = h.slice(7); }
    else if (h.startsWith('confusion-')) { vista = 'confusion'; arg = h.slice(10); }
    if (!VISTAS[vista]) vista = 'hoy';
    const nav = { cedula: 'indice', confusion: 'confusiones' }[vista] || vista;
    $$('nav a').forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === '#' + nav));
    VISTAS[vista](arg);
    pintarCabecera();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', ruta);
  ruta();
})();
