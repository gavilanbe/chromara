# CHROMARA — una partitura para el cuaderno (v4, jefa v5, batalla v6)

El color necesita una línea que lo sostenga. Carmín, Ámbar y Añil devuelven vida a una página; La Tinta teme que olviden quién dibujó sus contornos. Esta suite desarrolla esa relación entre exploración, lucha y reconciliación.

## Escuchar

- [Recorrido del leitmotif · 59 s](leitmotif-demo.mp3): título **0:00**, mapa **0:09**, batalla **0:19**, La Tinta **0:32**, mundo recuperado **0:40**, victoria **0:51**.
- [Muestra de SFX · 52 s](sfx-demo.mp3): cuaderno **0:00**, Carmín **0:03**, Ámbar **0:06**, Añil **0:09**, goma **0:12**, pigmento devuelto **0:15**, Llamarada **0:19**, Brote **0:23**, Eclipse **0:27**, Arcoíris **0:31**, enemigos **0:36**, Marea negra **0:43**, Pluma **0:48**.
- [Batalla completa](battle.mp3) · [Mapa gris](map.mp3) · [La Tinta](boss.mp3) · [Mundo recuperado](restored.mp3).

Los dos demos son montajes de escucha, no piezas adicionales. Los MP3 de esta carpeta se abren directamente en el ordenador. La secuencia exacta de los demos está en [score/preview-cues.json](score/preview-cues.json).

La batalla normal se ha recompuesto en **v6**; La Tinta conserva **v5**: [dirección musical y guía de escucha](COMBATES.md).

## La idea musical

La célula del Prisma es **Re–Fa–Mi–La**: partir, abrirse, retroceder un paso y saltar. En el mapa su ritmo largo–corto deja respirar la frase; en la batalla, tres ataques cortos desembocan en un La sostenido que cruza la barra de compás. No se repite igual en cada escena.

El color abre **Fa a Fa♯**. El mapa gris y el mundo recuperado comparten pulso, arquitectura y contorno melódico: el final permite reconocer el lugar que se ha salvado. Carmín, Ámbar y Añil aportan **Re, Fa♯ y La**. En los efectos de carga son pizzicato, marimba y arpa; al mezclarse suenan las notas de los participantes y una respuesta Mi–La.

La Tinta pliega la célula en **La–Fa–Mi♭–Re**. Su tema desarrolla el recuerdo del mapa en piano antes de teñir el Mi de Mi♭, conservando el pulso del combate. El preludio permite escuchar a la persona que hay dentro de la amenaza. El final conserva un pasaje de armonía menor: recuperar el color no borra la línea.

## Las nueve escenas

Se han **recompuesto los seis temas principales**, incluida la batalla. Estuche, preludio y mundo recuperado conservan las composiciones incorporadas en v3 y encajan en el nuevo arco. Todos los archivos publicados se han renderizado con el mismo banco CT. Las fichas [v2](FICHA_v2.md) y [v3](FICHA_v3.md) describen ediciones anteriores.

| Escena | Pieza / audio | Escritura y función |
|---|---|---|
| Título | [Antes de la primera pincelada](title.mp3) | 84 bpm; entrada incompleta en piano, presentación de las tres voces, recuerdo de la Tinta y promesa en flauta |
| Mapa gris | [Donde el papel respira](map.mp3) | 100 bpm; Re dorio, ventanas a Fa lidio, retirada a piano y regreso con respuesta de oboe |
| Estuche | [Lo que duerme en el estuche](atelier.mp3) | 108 bpm, 3/4; marimba curiosa, oboe que contesta, arpa y pizzicato |
| Batalla | [Tres gotas](battle.mp3) | 160 bpm; tres corcheas martilleadas, salto y caída con puntillo sobre un riff de bajo dórico; marimba contesta, flauta a terceras, luz en Re mayor con arpa, bajo y batería solos y subida hasta el bucle |
| Diálogo | [Debajo del color](prelude.mp3) | 72 bpm; oboe cercano, pedal, silencios y segunda bemol; espacio para leer |
| La Tinta | [La mancha](boss.mp3) | 150 bpm; el bajo martillea las tres gotas en Re grave con vecinas cromáticas, pisada La–Fa–Mi♭–Re en trompa y cuerda, la tinta se extiende por Mi♭, Fa y Sol menor, el contorno a solas en piano, línea y color en contrapunto y ascenso hasta el bucle |
| Victoria | [El color encuentra su sitio](victory.mp3) | 160 bpm; cuatro compases que resuelven el gesto de batalla en Re mayor; comienza tras la disolución |
| Derrota | [Una página sin terminar](gameover.mp3) | 76 bpm; la frase pierde el salto, el Mi desciende a Mi♭ y queda sobre Re |
| Mundo recuperado | [La línea también es color](restored.mp3) | 100 bpm; la melodía del mapa abre su tercera, las voces cantan juntas y permanece un recuerdo menor |

Las piezas cíclicas contienen una introducción y dos vueltas. El reproductor repite la segunda para conservar las colas asentadas. Victoria y derrota terminan. Los puntos de bucle, instrumentos y formas están en [meta.json](meta.json). La polifonía escrita va de 4 a 10 notas; las colas de muestras son adicionales. Es una estética de muestras SNES reproducida en Web Audio, no una emulación del SPC700.

## Tacto y respuesta

**49 efectos físicos nuevos, 58 muestras contando variantes**, sintetizados y renderizados a PCM de 32 kHz. No son efectos extraídos de otro juego. El código del juego utiliza este banco antes de recurrir al catálogo procedural de emergencia.

- Brocha: presión de cerdas, contacto de madera y arrastre húmedo; el brochazo grande tiene más cuerpo.
- Lápiz: dos cortes secos, grafito y virutas; la versión larga tiene cambios de dirección.
- Pintura: impacto opaco, salpicadura y pequeñas gotas. Agua: cavidades más claras y burbujas ligeras.
- Tinta: cavidad grave, fricción áspera y caída de tono; embestida, golpe y Marea negra tienen sonidos propios.
- Mezclas: fuego y chasquidos en Llamarada, madera y hojas en Brote, caída de resonancia y rotura en Eclipse. Las notas de los colores se reúnen antes del Arcoíris.
- Papel y mapa: apertura, cierre, paso de página, goma y pasos por tres superficies.

Al aterrizar el pigmento liberado por un enemigo, la animación dispara la célula en mayor. Carmín conserva su Re al anticipar un ataque: se corrigió un valor cero que antes se interpretaba como la afinación enemiga. La microvariación de material no desafina los avisos musicales.

[score/sfx-bank.json](score/sfx-bank.json) identifica cada efecto, duración, nivel y hash. El demo de SFX se renderiza con el código real del juego y sus niveles de bus, sin música ni normalización posterior.

## Mezcla e integración

La masterización aplica una ganancia constante por tema, corte suave a 7,8 kHz y reducción en 2,9 kHz. Mantiene los contrastes entre secciones. Referencias: mapa/título −21 LUFS, batalla/jefa −19, estuche −22, diálogo −24, mundo recuperado −20. Los nueve Opus decodificados conservan margen de pico; las mediciones vigentes están en `score/audio-audit.json`.

Los impactos atenúan brevemente la música y regresan a un nivel fijo. El mapa recuerda su posición después del combate. Los fundidos, el precargado de escenas y el cambio del estuche evitan reinicios continuos. El manifiesto incluye una revisión por archivo para que la caché no reproduzca la antigua batalla. La edición `file://` incluye exactamente los mismos bytes Opus. Si falla la carga, el sintetizador sigue las partituras nuevas y reproduce la introducción una sola vez.

## Reconstrucción y verificación

Fuente instrumental: **Chrono Trigger.sf2 (2011)** de Xouman, disponible en el [archivo de William Kage](https://www.williamkage.com/snes_soundfonts/). El origen y hash están en [score/soundfont.json](score/soundfont.json). El SF2 no se incluye en Git; las composiciones son originales.

Dependencias: Python con `tools/audio_requirements.txt`, biblioteca FluidSynth y FFmpeg. Desde la raíz:

```sh
python tools/compose_suite.py --soundfont '/ruta/Chrono Trigger.sf2' --render-dir /tmp/chromara-renders
python tools/design_foley.py
python tools/pack_music.py --render-dir /tmp/chromara-renders
python tools/audit_audio.py
```

`battle_tres_gotas.py` contiene la batalla v7 (véase [COMBATES.md](COMBATES.md)); `battle_theme.py` conserva la v6 y su audio está en `archive/v6-que-no-se-apague/`. `boss_la_mancha.py` contiene La Tinta v6; `combat_score.py` conserva la v5 y su audio está en `archive/v5-la-pagina-se-resiste/`. `compose_suite.py` reúne la suite; `compose_score.py` aporta el renderizador y las tres escenas incorporadas en v3. Se exportan nueve MIDI. Los seis WAV principales también están actualizados para escucharlos directamente; los otros tres WAV son intermediarios regenerables. Los informes y gráficos v2 están archivados en `archive/v2/`.

Para las comprobaciones del navegador y los demos, con Playwright instalado y un servidor local en el puerto 8765:

```sh
node tools/test_audio.cjs
node tools/render_audio_previews.cjs
```

`CHROME_BIN` permite elegir la ruta de Chrome. Se prueban las coreografías de las herramientas, notas de color y participantes de mezcla, impacto de tinta, las nueve pistas, transiciones hasta el final, recuperación del bus musical, mute, carga offline, caché, errores de red y bucles del respaldo. Se renderizan todos los efectos para detectar silencio, valores no finitos y saturación. [score/audio-audit.json](score/audio-audit.json) y [score/mastering.json](score/mastering.json) contienen las mediciones.

Estas verificaciones comprueban señal, partitura e integración; no sustituyen una escucha crítica humana. Los dos demos permiten valorar el resultado musical y ajustar preferencias concretas.
