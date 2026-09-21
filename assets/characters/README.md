# Atlas de personajes · prueba integrada

Abre `sprite-preview.html` desde un servidor local para comparar los sprites nuevos con los actuales, jugar en el mapa, lanzar un ataque y revisar daño, poca vida, KO y victoria. La mesa de poses permite inspeccionar cada personaje sin equipamiento.

El juego completo activa esta versión con `index.html?sprites=atlas`, incluso por `file://`. Sin ese parámetro conserva el arte original y no carga los atlas.

## Archivos y escala

- Seis PNG transparentes, 16 fotogramas por hoja: 96 en total.
- Exploración: celdas de 32 × 28 px, hoja de 128 × 112 px.
- Combate: celdas de 48 × 40 px, hoja de 192 × 160 px.
- Anclaje en el centro inferior de cada celda. Una escala común por hoja mantiene más bajo el KO y conserva el tamaño relativo de las poses.
- Alfa binaria y una paleta de hasta 48 colores por hoja. Renderizado sin suavizado.
- `manifest.json` contiene recortes originales, dimensiones y anclajes. `atlas.js` incorpora los PNG para que también funcionen sin servidor.

Las columnas de las tres primeras filas de exploración son frente, izquierda, derecha y espalda; las filas son reposo, apoyo y salto. La última fila contiene parpadeo, sobresalto, daño y KO frontales.

Combate: `[frente, izquierda, derecha, espalda ¾]`, `[parpadeo, carga izquierda, ataque izquierda, aterrizaje izquierda]`, `[salto frente, salto izquierda, salto espalda, defensa]`, `[daño, cansancio, KO, victoria]`. Las expresiones son frontales. El visor refleja el salto de perfil al mirar a la derecha y señala las poses de vista fija.

## Procedencia y reconstrucción

Las hojas originales y sus prompts están en `artifacts/sprite-study-2026-09-21/`. ImageGen extrajo los fondos a `cutouts/`, con los prompts guardados allí. `tools/pack_character_atlas.cjs` localiza los huecos transparentes, recorta, reduce con vecino más próximo y empaqueta los atlas. No dibuja ni genera el arte.

```sh
NODE_PATH=/ruta/a/node_modules node tools/pack_character_atlas.cjs
python3 -m http.server 8765
NODE_PATH=/ruta/a/node_modules CHROME_BIN=/ruta/a/chrome node tools/test_character_atlas.cjs
```

El empaquetador requiere `sharp`; las pruebas requieren `playwright`. El juego no necesita dependencias.

## Alcance de la prueba

Los cuerpos no contienen armas. El juego añade sus herramientas durante los ataques existentes. Añil ya incluye sus gotas satélite, por lo que el renderizado alternativo evita dibujarlas dos veces.

La exploración usa tres poses por dirección, con salto del motor. Combate conecta las poses existentes, defensa y poca vida; el aterrizaje adicional se puede revisar en el visor. Es una primera integración del estudio generado: sigue pendiente una pasada artística manual para unificar contornos y eliminar variaciones de volumen entre fotogramas antes de tratarlo como arte definitivo.
