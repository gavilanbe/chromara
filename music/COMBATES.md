# CHROMARA — batalla v7, La Tinta v6

[Batalla: Tres gotas](battle.mp3) · [La Tinta: La mancha](boss.mp3) · anteriores: [batalla v6](archive/v6-que-no-se-apague/battle.mp3), [La Tinta v5](archive/v5-la-pagina-se-resiste/boss.mp3)

## Tres gotas · 160 bpm

Una pequeña valentía obstinada. La partitura está en `tools/battle_tres_gotas.py`; la v6 «Que no se apague el color» se conserva en `tools/battle_theme.py` y su audio en `archive/v6-que-no-se-apague/` para comparar.

**Tres corcheas martilleadas sobre una misma nota, un salto de tercera y una caída con puntillo** (Re Re Re Fa | Mi· Re Do). Las tres gotas son el gancho: la frase se repite una tercera más arriba, baja al La dórico y queda en suspenso; la segunda mitad sube hasta Do agudo y cierra en Re. Es una canción de ocho compases en Re dórico, con antecedente sobre La7 y consecuente sobre la tónica.

**El bajo tiene riff propio** de dos compases (Re Re re La Do Si / Re Re re La Sol Fa Mi), con la octava en la segunda parte del segundo tiempo y el Si natural dórico. El bombo sigue sus golpes; la caja va en dos y cuatro; el charles abre al final de cada compás.

**Los colores se oyen así.** En A canta Carmín sola (trompeta). En A′ Ámbar contesta las tres gotas una octava arriba en los huecos (marimba) y Añil se suma a terceras (flauta) en la segunda frase. En B la misma frase cambia de carácter: pasa a Re mayor, la lleva Añil con el arpa de Ámbar y una batería a medio tiempo; el quinto compás es lidio sobre Sol, Carmín entra por debajo a terceras y el séptimo compás toma prestado Sol menor antes de que La7 devuelva el riff. En C quedan bajo y batería, con las gotas como ostinato de marimba; después una subida de cuatro compases (Re, Fa, Sol, La) en la que las tres voces gritan las gotas al unísono y la caja redobla hasta el bucle.

| Primera vuelta | Momento |
|---|---|
| 0:00 | Riff de bajo, charles y remate de timbales |
| 0:03 | A: la trompeta canta las tres gotas |
| 0:15 | A′: marimba contesta, flauta a terceras, llegada a Re |
| 0:27 | B: Re mayor, flauta y arpa, Sol menor prestado |
| 0:39 | C: bajo y batería, ostinato de marimba |
| 0:45 | Subida Re–Fa–Sol–La con redoble |
| 0:51 | Segunda vuelta, que el juego utiliza como bucle |

Duración del archivo: 1:39. Ciclo musical: 32 compases, 48 segundos.

### Interpretación

Banco **Chrono Trigger.sf2 (2011)**. Sus muestras cortan a los 8 ms de soltar la nota, así que la articulación está en las duraciones escritas: las gotas van cortas (86 % del valor) y el redoble y los remates nunca pisan el golpe siguiente del mismo tambor. Las notas largas de la flauta en B crecen y se retiran con CC11; la subida de C lleva un crescendo escrito de CC11 en trompeta y flauta que se reinicia antes del bucle. Sólo el Do agudo que corona el séptimo compás de A y A′ recibe una subida inicial de afinación. No hay vibrato automático ni variaciones aleatorias.

Trompeta y ritmo reciben reflexiones cortas; flauta, arpa y cuerdas, reflejos más largos. El bajo queda seco y centrado. Las duraciones de batería están en segundos para respetar las muestras. El respaldo de emergencia conserva notas, ritmos y forma.

Los tres bocetos que precedieron a esta versión están en `sketches/` (MP3 y MIDI; partitura en `tools/battle_sketches.py`): «Tres gotas», «Salpicaduras» (12/8) y «Tinta y brasa» (126 bpm).

## La mancha · 150 bpm

La Tinta trazó cada línea de Chromara y nadie mira ya el contorno: orgullo herido, no caos. La partitura está en `tools/boss_la_mancha.py`; la v5 «La página se resiste» se conserva en `tools/combat_score.py` y su audio en `archive/v5-la-pagina-se-resiste/`.

**El bajo martillea las tres gotas en Re grave**: la Tinta les roba el ritmo a las protagonistas y lo pisa con vecinas cromáticas (Mi♭, Do♯) en 3+3+2, con el piano doblando los acentos. **Su motivo es una pisada, La–Fa–Mi♭–Re** (larga, corta, larga, larga) en trompa y cuerda a la octava, sobre un pedal de Re frigio que no se mueve durante seis compases. Las gotas contestan con su propia frase y el Mi natural choca contra el Mi♭ del bajo.

| Primera vuelta | Momento |
|---|---|
| 0:00 | Llamada: dos racimos de coro sobre redoble de timbales, después el riff solo con timbales de batería |
| 0:06 | A: la pisada de la Tinta sobre el pedal |
| 0:19 | A′: la trompeta contesta con las gotas en los huecos |
| 0:32 | B: la tinta se extiende; el riff sube por Mi♭, Fa, Sol menor, Si♭ y La7 y el motivo con él |
| 0:45 | C: el contorno a solas, la línea en piano sobre un riff susurrado; la marimba responde con las gotas |
| 0:58 | D: línea y color a la vez, la canción de la trompeta en contrapunto con la pisada |
| 1:10 | E: dos ascensos cromáticos, un suspiro agudo en Sol menor y redoble con las tres voces gritando las gotas sobre La7 |
| 1:23 | Segunda vuelta, que el juego utiliza como bucle |

Duración del archivo: 2:40. Ciclo musical: 48 compases, 76,8 segundos.

### Interpretación

Duraciones y velocidades escritas por nota, como en la batalla. El coro crece con CC11 en los racimos de la llamada y al principio de cada frase; en C baja a un fondo. En E hay un crescendo escrito de CC11 en trompa, cuerda y trompeta que se reinicia antes del bucle. Sólo el Do agudo de la canción en D recibe una subida inicial de afinación. Los redobles y remates nunca pisan el golpe siguiente del mismo tambor.

Los tres bocetos previos están en `sketches/boss1..3` (partitura en `tools/boss_sketches.py`): «La mancha», «Contorno roto» (7/8) y «Trazo y sombra» (100 bpm, coral).

## Mezcla y comprobaciones

La masterización usa ganancia constante, con objetivo de −19 LUFS para ambos combates. Los niveles por instrumento están en `stemBalance` de [meta.json](meta.json), y los picos y empalmes en [score/audio-audit.json](score/audio-audit.json).

`tools/test_score_performance.py` verifica orden de controles antes del ataque, exportación MIDI, repetición, notas dentro del bucle y ausencia de retriggers que corten notas sostenidas. Con `CHROMARA_TEST_SF2` también verifica que una curva cambia la señal de una nota sostenida y que no contamina el instrumento siguiente. Las pruebas de navegador verifican carga, cambios de escena, reproducción offline y respaldo.

Estas comprobaciones verifican partitura, señal e integración. No son una valoración auditiva humana ni garantizan que una melodía resulte memorable.

## Reconstrucción de esta revisión

```sh
python tools/compose_suite.py --soundfont '/ruta/Chrono Trigger.sf2' --render-dir /tmp/chromara-tres-gotas --cues battle boss
python tools/pack_music.py --render-dir /tmp/chromara-tres-gotas --cues battle boss
python tools/audit_audio.py
```

La selección parcial actualiza sólo los combates. Copiar también los WAV de la carpeta de render a `music/`. `tools/compose_score.py` renderiza instrumentos, controles y eco. `pack_music.py` publica Opus, MP3 y los manifiestos HTTP/offline. `tools/render_audio_previews.cjs --music-only` actualiza el recorrido del leitmotif, con el servidor local activo.

```sh
CHROMARA_TEST_SF2='/ruta/Chrono Trigger.sf2' python tools/test_score_performance.py
node tools/test_audio.cjs
```
