# Chromara — prueba de sprites sin equipamiento

Seis hojas generadas con imagegen: 16 poses por hoja, 32 por personaje, 96 en total. Se conserva la boina de Carmín, la punta de Ámbar y la cresta con tres gotas de Añil. No llevan brochas, lápices de mano, pinceles ni paletas.

Los PNG de esta carpeta conservan las láminas originales con fondo marfil. El siguiente paso ya está integrado: `cutouts/` guarda las extracciones transparentes de ImageGen y [assets/characters](../../assets/characters/README.md) contiene los atlas pequeños con escala y anclaje uniformes. Abre [sprite-preview.html](../../sprite-preview.html) desde un servidor local para probarlos. Sigue siendo un estudio visual pendiente de pulido artístico entre fotogramas.

## Hojas

| Personaje | Exploración | Combate |
|---|---|---|
| Carmín | [Ver hoja](carmin-overworld.png) | [Ver hoja](carmin-battle.png) |
| Ámbar | [Ver hoja](ambar-overworld.png) | [Ver hoja](ambar-battle.png) |
| Añil | [Ver hoja](anil-overworld.png) | [Ver hoja](anil-battle.png) |

## Exploración: lectura de cada hoja

Las tres primeras filas comparten las direcciones de sus columnas. La última fila reúne cuatro reacciones frontales.

| Fila | Columna 1 | Columna 2 | Columna 3 | Columna 4 |
|---|---|---|---|---|
| Reposo | Frente / sur | Perfil izquierdo / oeste | Perfil derecho / este | Espalda / norte |
| Movimiento: contacto | Frente | Perfil izquierdo | Perfil derecho | Espalda |
| Movimiento: salto | Frente | Perfil izquierdo | Perfil derecho | Espalda |
| Reacciones | Parpadeo | Sobresalto | Golpe / aplastamiento | KO |

## Combate: lectura de cada hoja

| Fila | Columna 1 | Columna 2 | Columna 3 | Columna 4 |
|---|---|---|---|---|
| Vistas en reposo | Frente | Perfil izquierdo | Perfil derecho | Espalda a tres cuartos |
| Acción | Parpadeo frontal | Carga / anticipación | Ataque sin arma | Aterrizaje / recuperación |
| Movimiento y defensa | Salto frontal | Salto de perfil | Salto de espalda | Guardia |
| Expresiones | Daño / retroceso | Cansancio / poca vida | KO | Victoria |

## Relación con el juego actual

- Exploración: las direcciones vienen de `DIRVIEW` y `mapDrop` en `game.js`; se contemplan también parpadeo, sobresalto, compresión durante la transición y KO.
- Combate: las poses vienen de `VIEW`, `EYES`, `SQ` y `unitSpriteInfo` en `sprites.js`: `idle`, `hop`, `attack`, `charge`, `hurt`, `ko`, `happy`.
- La cámara puede mostrar reposo y salto de frente, perfil o espalda. Las hojas incluyen esas vistas.
- Guardia y cansancio se conectan a defensa y poca vida. Recuperación está disponible en el visor; no se han alterado las reglas del combate.
- Los satélites de Añil están incluidos en el atlas; con esta versión activa, el juego evita dibujarlos también por separado.

Los prompts de generación y los ajustes finales están en [PROMPTS.md](PROMPTS.md); el inventario, en [manifest.json](manifest.json).
