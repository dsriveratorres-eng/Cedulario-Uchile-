# Examen de Licenciatura · U. de Chile

Página web para preparar el examen de licenciatura de la Facultad de Derecho de la Universidad de Chile, en **Derecho Civil y Derecho Procesal**. Es un sitio estático: no necesita servidor ni base de datos, y se publica gratis con GitHub Pages.

Adaptación del proyecto [examen-grado](https://github.com/djlarrix/examen-grado) de Joaquín Larraín Guimoye (licencia MIT), reducida a la U. de Chile y convertida de servidor MCP a página web.

## Qué trae

- **Índice**: las 168 cédulas obligatorias de Civil y las 69 de Procesal del cedulario oficial, con buscador y el estado de cada una (sin ver, débil, aprendiendo, consolidando, dominado).
- **Práctica por recuperación**: explicas la cédula sin mirar y con cronómetro (la exposición no baja de 10 minutos), dices qué tan seguro estás y recién después ves el contenido oficial y marcas qué puntos cubriste.
- **Repetición espaciada (FSRS-4.5, el algoritmo de Anki)**: cada nota agenda el próximo repaso justo antes de que se te olvide; ningún repaso queda después de la fecha del examen.
- **Hoy**: repasos vencidos, cédulas nuevas intercalando Civil y Procesal, y un aviso con números si el ritmo no alcanza.
- **Plazos**: 49 plazos verificados contra Ley Chile, como tarjetas con repetición espaciada, más una tabla de consulta.
- **Confusiones**: 50 pares de instituciones que se confunden, para armar el cuadro comparativo de memoria.
- **Simulacro**: sorteo de cédula, exposición cronometrada, preguntas sobre la asignatura e interrogación de Civil y Procesal, con autoevaluación según la rúbrica de la comisión (nota de 1,0 a 7,0).
- **Progreso**: dominio por unidad, calibración (aciertos según la confianza declarada), errores y simulacros.
- **Prompts para Claude**: cada cédula y cada simulacro tienen un botón que copia un prompt listo para pegar en Claude y tener una clase o simular la comisión.

Las normas enlazan a Ley Chile. El progreso se guarda **sólo en el navegador** (localStorage): en Ajustes se descarga e importa un respaldo, que sirve también para pasar el avance a otro equipo.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `examen-grado-uchile`).
2. Sube el contenido de esta carpeta (no la carpeta misma: `index.html` tiene que quedar en la raíz del repositorio). Desde la terminal:
   ```bash
   cd examen-grado-uchile
   git init
   git add .
   git commit -m "Primera versión"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/examen-grado-uchile.git
   git push -u origin main
   ```
   O, sin terminal: en el repositorio vacío, **Add file → Upload files** y arrastra todos los archivos y carpetas.
3. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)` → **Save**.
4. En uno o dos minutos la página queda en `https://TU-USUARIO.github.io/examen-grado-uchile/`.

También funciona abriendo `index.html` directamente en el navegador, sin publicar nada.

## Estructura

```
index.html                 la página
css/estilos.css
js/app.js                  vistas y lógica
js/fsrs.js                 repetición espaciada (del proyecto original)
datos/uchile.js            datos que carga la página (generado)
fuente/                    YAML originales: cedulario, mapa cédula→temas, perfil, temario, plazos, confusiones
scripts/generar-datos.mjs  convierte fuente/ en datos/uchile.js
```

Si corriges o actualizas algo en `fuente/` (por ejemplo, un cedulario nuevo):

```bash
npm install
npm run datos
```

## Aviso

Proyecto independiente: no es un producto oficial de la Universidad de Chile ni reemplaza las indicaciones de la Facultad. El cedulario y el formato del examen vienen de documentos oficiales publicados (fuentes en la sección *El examen*), pero cambian: confirma con la Secretaría de Estudios antes de rendir.

## Licencia

Código bajo licencia MIT (ver `LICENSE`). El cedulario es documento de la Facultad de Derecho de la Universidad de Chile, reproducido con su fuente para fines de estudio.
