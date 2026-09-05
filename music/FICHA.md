# CHROMARA — BSO y diseño sonoro v3

El mundo es un cuaderno vivo. El grupo no conquista un territorio: devuelve pigmento a una página que alguien dibujó. La Tinta teme perder su lugar en ese dibujo. La música comparte un motivo entre exploración, amenaza y recuperación, y deja huecos para oír el papel y las herramientas.

## Qué cambia

Se conserva la escritura de los seis temas v2 y se publican de nuevo con niveles coherentes, agudos más suaves y empalmes tratados. Se añaden tres piezas originales, cuatro muestras para efectos musicales y dirección de música por escena. La documentación histórica está en [FICHA_v2.md](FICHA_v2.md); sus niveles y comprobaciones describen la versión anterior.

| Escena / archivo | Pieza | Centro / pulso | Función |
|---|---|---|---|
| Título · `title` | El cuaderno se abre | Re mayor · 90 | Presentar la promesa de color con maderas, arpa y celesta |
| Mapa gris · `map` | Chromara apagada | Re dorio · 100 | Curiosidad, melancolía y pequeñas ventanas al color |
| Estuche · `atelier` | Lo que duerme en el estuche | Re dorio / Fa lidio · 108, **3/4** | Marimba que pregunta, oboe que contesta, arpa y pasos de pizzicato |
| Combate · `battle` | Mezcla de colores | La menor · 150 | Impulso y respuestas entre voces; margen para los golpes |
| Diálogo · `prelude` | Debajo del color | Re menor / frigio · 72 | Oboe en registro humano sobre cuerdas; la segunda bemol es herida, no sólo amenaza |
| Jefa · `boss` | La Tinta | Re frigio · 144 | El mundo se reconoce dentro del tema enemigo |
| Victoria · `victory` | Una gota más de luz | Re mayor · 168 | El motivo encendido; entra con la celebración, tras la disolución |
| Derrota · `gameover` | Los colores se apagan | Re → Mi♭ · 96 | Una frase que no logra volver a casa |
| Mundo recuperado · `restored` | La línea también es color | Re mayor · 100 | Las voces comparten el canto; el recuerdo menor queda incorporado al final |

## Las tres composiciones nuevas

**Lo que duerme en el estuche**: dos compases de entrada y un vals de 24 compases, A–B–A′. Re–Fa–Mi–La aparece en marimba, con corcheas y silencios que recuerdan a una punta de lápiz buscando dónde apoyar. El puente se ilumina en Fa lidio. La vuelta reduce su dinámica antes de recuperar la flauta en las respuestas. No hay batería de combate en el puzle.

**Debajo del color**: dos compases de entrada, 16 de ciclo. El oboe dice la célula en registro medio, sobre pedal y díadas de cuerda. Re–Fa–Mi♭–La guarda relación con la jefa. En la segunda mitad el arpa recuerda el Mi natural del mapa: queda algo que escuchar en La Tinta. Termina en la dominante sin resolver y permite detenerse a leer el diálogo.

**La línea también es color**: cuatro compases de presentación separada —arpa, marimba, flauta, respuesta de oboe— y 24 de ciclo. La célula es Re–Fa♯–Mi–La. El puente pasa por Sol lidio y por Si♭/Sol menor, un recuerdo de la página oscura. Ahí baja la dinámica y desaparece el pulso de marimba; después vuelven flauta y oboe en contrapunto con refuerzo de trompa. El cambio de color tiene una recompensa musical propia.

Cada nueva pieza contiene introducción y dos vueltas. El bucle reproduce la segunda, con colas ya asentadas. Duraciones y puntos exactos están en [meta.json](meta.json). Polifonía escrita máxima: estuche 5, preludio 5, mundo restaurado 7. Esto cuenta notas escritas, no colas de muestras; el reproductor es Web Audio, no una emulación estricta del SPC700.

## Timbres, mezcla e interacción

Los efectos físicos conservan sus materiales: fricción seca para lápiz, barrido de cerdas para brocha, golpe húmedo y gotas para pincel, burbujeo grave para tinta. Los eventos musicales usan cuatro muestras cortas del mismo banco: marimba, arpa, pizzicato y coro. Carmín, Ámbar y Añil tienen Re, Fa♯ y La. Los avisos no varían aleatoriamente de afinación; la microvariación se reserva para materia y líquidos. La Pluma tiene un motivo de descubrimiento de seis notas.

Los buses de música y SFX tienen margen de nivel y un limitador común. Los impactos bajan temporalmente el bus musical; cada envolvente vuelve a un nivel fijo para que varias techs no vayan apagando la BSO. Un fundido cambia de escena, y el mapa/estuche recuerdan su posición al volver. Al salir de una pestaña se suspende el contexto y el ambiente no acumula sonidos pendientes.

La masterización usa ganancia constante por pista, filtro a 7,8 kHz y una reducción suave en 2,9 kHz. Conserva la dinámica interna. Referencias de sonoridad: mapa/título −21 LUFS, combate −19, estuche −22, diálogo −24, final −20. Los valores publicados se verifican después de Opus; [score/mastering.json](score/mastering.json) registra el ajuste previo al códec y [score/audio-audit.json](score/audio-audit.json) el análisis posterior. Los 8 ms previos al final del loop se aproximan a la entrada de la vuelta estable para suavizar el empalme.

## Fuente y reconstrucción

Las nuevas piezas y las muestras musicales usan **Chrono Trigger.sf2 (2011)**, de Xouman, distribuida en el [archivo de soundfonts de William Kage](https://www.williamkage.com/snes_soundfonts/). El hash y el origen figuran en [score/soundfont.json](score/soundfont.json). El SF2 no se incluye en este repositorio. Los seis masters anteriores ya usan CT + SNES; sus instrumentos están documentados en la ficha v2.

Dependencias de autoría: Python, FluidSynth, FFmpeg y `pip install -r tools/audio_requirements.txt`. Ejecución desde la raíz del proyecto:

```sh
python tools/compose_score.py --soundfont '/ruta/Chrono Trigger.sf2' --render-dir /tmp/chromara-renders
python tools/pack_music.py --render-dir /tmp/chromara-renders
python tools/audit_audio.py
```

`compose_score.py` contiene las notas, articulaciones, voicings y cambios de dinámica de las piezas nuevas y exporta MIDI. Las seis WAV v2 se conservan como masters. `pack_music.py` produce Ogg/Opus, MP3 y los manifiestos HTTP/offline desde esas mismas fuentes. Los WAV nuevos son intermediarios reproducibles y no se duplican en Git.

Validación: señal decodificada, picos, sonoridad, empalmes, estado del reproductor, combate completo, final, acordes programados, recuperación del bus, mute, respaldo ante error y apertura `file://`. Las comprobaciones de señal y navegador no equivalen a una revisión auditiva humana.
