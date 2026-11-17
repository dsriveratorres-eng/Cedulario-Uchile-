// Convierte los YAML de fuente/ en datos/uchile.js (lo que carga la página).
// Uso: npm install && npm run datos
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => yaml.load(fs.readFileSync(path.join(raiz, 'fuente', f), 'utf8'));

const temario = { civil: leer('temario/civil.yaml'), procesal: leer('temario/procesal.yaml') };
const perfil = leer('uchile/perfil.yaml');
const cedularios = { civil: leer('uchile/cedulario-civil.yaml').cedulas, procesal: leer('uchile/cedulario-procesal.yaml').cedulas };
const mapa = leer('uchile/mapa-temas.yaml');

// Sólo los temas del temario que el cedulario de la U. de Chile usa.
const usados = new Set();
for (const r of ['civil', 'procesal']) for (const ids of Object.values(mapa[r] || {})) ids.forEach((id) => usados.add(id));
const temas = {};
for (const r of ['civil', 'procesal'])
  for (const u of temario[r].unidades)
    for (const t of u.temas)
      if (usados.has(t.id)) temas[t.id] = { titulo: t.titulo, rama: r, unidad: u.titulo, articulos: t.articulos || [], requiere: t.requiere || [], relacionados: t.relacionados || [] };

const plazos = leer('plazos.yaml');
const confusiones = leer('confusiones.yaml');

const datos = { generado: new Date().toISOString().slice(0, 10), perfil, cedularios, mapa: { civil: mapa.civil, procesal: mapa.procesal }, temas, plazos, confusiones };
fs.writeFileSync(path.join(raiz, 'datos', 'uchile.js'), '// Generado por scripts/generar-datos.mjs. No editar a mano.\nwindow.DATOS = ' + JSON.stringify(datos) + ';\n');
console.log(`temas ${Object.keys(temas).length}, cédulas civil ${cedularios.civil.length}, procesal ${cedularios.procesal.length}, plazos ${plazos.length}, confusiones ${confusiones.length}`);
