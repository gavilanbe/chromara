# CHROMARA — revisión de los combates, v5

[Batalla: A pulso y a color](battle.mp3) · [La Tinta: La página se resiste](boss.mp3)

La v4 daba prioridad a enlazar motivos. En combate, la escritura cambiaba de frase demasiado pronto, el bajo dominaba y la percusión cortaba sus colas. Esta revisión trabaja sobre melodía, armonía, articulación y balance de ambos temas.

## A pulso y a color · 156 bpm

Un estribillo de ocho compases con dos frases emparentadas. **Re–Fa–Mi–La** ocupa el inicio y vuelve después; las respuestas y las cadencias varían, de modo que el regreso se reconoce. La trompeta presenta el tema dos veces. La guitarra responde en sus huecos; el bajo toca su propia línea sincopada y el Rhodes aporta terceras y séptimas que definen los acordes.

| Primera vuelta | Momento |
|---|---|
| 0:00 | Entrada de dos compases y llamada del motivo |
| 0:03 | Estribillo A: trompeta, bajo, Rhodes y batería |
| 0:15 | A′: se afianza la frase y crecen las respuestas |
| 0:28 | B: melodía más abierta de flauta, cuerda y armonía en Fa |
| 0:40 | C: guitarra y marimba dialogan con los metales |
| 0:52 | A″: vuelve el estribillo, con una cima nueva y giro de regreso |
| 1:05 | Comienza la segunda vuelta, que el juego utiliza como bucle |

Duración del archivo: 2:06. Ciclo musical: 40 compases, aproximadamente 1:02.

## La página se resiste · 152 bpm

La Tinta entra con una declaración de trompa y el motivo **La–Fa–Mi♭–Re**. Su ostinato acompaña los cambios de acorde. El motivo se reconoce en la persecución de cuerda y regresa después de una secuencia que eleva la tensión. El recuerdo del mapa conserva bajo y pulso; después los motivos de color y tinta se contestan entre metales.

| Primera vuelta | Momento |
|---|---|
| 0:00 | Llamada de trompa, coro y batería |
| 0:06 | A: motivo de La Tinta sobre el desplazamiento 3+3+2 |
| 0:19 | A′: respuesta en cuerda con ataque definido |
| 0:32 | B: secuencia en Do menor que asciende hacia la dominante de Re |
| 0:44 | C: el piano recuerda el mapa; Mi acaba cayendo a Mi♭ |
| 0:57 | D: las dos células se contestan |
| 1:09 | A″: vuelve La Tinta, reforzada en puntos concretos |
| 1:22 | Comienza la vuelta que se repite |

Duración del archivo: 2:38. Ciclo musical: 48 compases, aproximadamente 1:16.

## Sonido

Se mantiene **Chrono Trigger.sf2 (2011)**. La elección de notas, formas, instrumentación y balance es nueva. El bajo eléctrico de la batalla usa el preset `pbass`; la jefa conserva `synthbass` con un nivel compensado. Las melodías principales quedan por delante del bajo en los renders por instrumento. El Rhodes y las voces de cuerda sostienen la armonía.

La batería anterior duraba unos 56 ms de bombo, 49 ms de caja y 16 ms de charles en la batalla. Ahora se escriben las duraciones **en segundos**: bombo 140 ms, caja 280 ms, charles 110 ms y toms 280 ms. Así se conserva el decaimiento de la muestra. Los golpes suaves de caja usan otra altura para que su note-off no corte el acento siguiente. El plato procede de `crashfd1`, banco 1: tiene caída propia. Los remates sustituyen parte del patrón de charles.

La sonoridad publicada sigue alrededor de −19 LUFS en ambos temas. La pegada proviene del arreglo, los ataques y el balance. Los detalles por instrumento y por sección están en `stemBalance` de [meta.json](meta.json); los picos y empalmes, en [score/audio-audit.json](score/audio-audit.json).

Las comprobaciones de señal y partitura no equivalen a una escucha crítica humana. Los MP3 enlazados son las composiciones completas que carga el juego.

## Reconstrucción de esta revisión

```sh
python tools/compose_suite.py --soundfont '/ruta/Chrono Trigger.sf2' --render-dir /tmp/chromara-combat --cues battle boss
python tools/pack_music.py --render-dir /tmp/chromara-combat --cues battle boss
python tools/audit_audio.py
```

La selección parcial permite revisar estos dos temas conservando los otros archivos publicados y el banco de SFX. `tools/combat_score.py` es la partitura de los combates; `tools/compose_score.py` renderiza bancos, niveles y eco por instrumento. También se actualizan los dos MIDI, los dos WAV, Opus, MP3, la partitura de emergencia y las versiones HTTP/offline. El recorrido del leitmotif incorpora las nuevas tomas.
