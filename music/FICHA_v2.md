# CHROMARA — BSO v2 (SPC700 con muestras)

Segunda pasada. La v1 era chiptune por osciladores y sonaba a NES; el encargo era **mismo
mundo, otro medio y otro nivel de escritura**. Fuentes en `~/composer/pieces/chromara2_*.yaml`,
brief en `~/composer/pieces/chromara2.brief.md`, informes en `report_<pieza>.md`.

---

## 1. El medio, auditado antes de orquestar

No se ha orquestado a ciegas: los dos soundfonts se inspeccionaron con dos herramientas
escritas para esto (`~/composer/tools/sf2zones.py` y `~/composer/tools/probe_sf2.py`, que
renderiza cada preset y mide f0 real, centroide espectral y perfil de envolvente).

| hallazgo | consecuencia de escritura |
|---|---|
| `Chrono Trigger.sf2` (2011): 48 presets, **una sola muestra por preset con raíz Do4**, en bucle | por encima de +26 semitonos el timbre se adelgaza. Regla: cuerdas ≤ La5, flauta ≤ Mi6, trompeta ≤ Mib6, bajo ≥ Mi1 |
| `str2` (49) y `panflute` (75) suenan **una octava arriba**; `sax` (65), una **abajo** | no usados, o compensados |
| La **percusión del CT no tiene release**: la nota se corta a seco al soltarla | la duración escrita ES la duración del golpe; `gate: 1.0` en toda la percusión |
| El plato del CT (`cymbal` 123) **está en bucle sin decaimiento**: si lo mantienes, zumba | los platos y el tam-tam vienen del kit GM de `snes.sf2` (banco 128, canal 9), cuyo crash (49) y china (52) decaen solos |
| `Chrono Trigger Exp 2019.sf2` está **~2 semitonos bajo** (Do4 escrito suena Sib3) | **descartado**. El clave sale de `snes.sf2` (0:6), que está afinado |
| El kit de batería sólo suena en **canal 9** (fluidsynth en modo GS) | una única voz de kit por pieza, con acordes cuando coinciden bombo y charles |

**8 voces simultáneas** (límite del SPC700), verificado con `~/composer/tools/spc.py voices`,
contando cada nota de un acorde como una voz — que es como las cuenta el chip. Las cinco
piezas pasan. Varias decisiones de orquestación salen literalmente de ese presupuesto:
en el clímax del mapa el coro pasa a nota sola para que quepa el oboe; en la jefa la campana
tubular y el coro se turnan (`D` c.1, 5 y 8 la campana; el resto el coro), lo que además
quedó mejor de lo que estaba.

**Eco**: el SPC700 tiene un eco por voz de hasta 240 ms. Se reproduce con un bus de eco
(`meta.buses` en el YAML) sincronizado a semicorchea — 150 ms en el mapa, 100 en la batalla,
104 en la jefa —, activado sólo en las voces que en el hardware llevarían EON: cantos,
arpa y campanas; nunca el bajo ni el bombo. Encima, reverb de fluidsynth con **envío por voz**
(CC91: bajo 12-20, percusión 30-50, cantos 42-70, cuerdas 80-90, coro 105-118), que es el
equivalente al mando de reverb del chip.

---

## 2. Identidad

**Todo gira sobre Re; el modo es el color.** Se mantiene de la v1 porque era lo bueno que había.

**Célula del Prisma** — grados 1 – b3 – 2 – 5:

| pieza | centro | célula | lectura |
|---|---|---|---|
| map | Re dorio | Re Fa **Mi** La | el mundo apagado con color debajo |
| battle | La eólico | La Do **Si** Mi | tensión que no vuelve a casa |
| boss | Re frigio | Re Fa **Mib** La | el mismo mundo con la 2ª teñida |
| victory | Re mayor | Re **Fa#** Mi La | 1–**3**–2–5: la célula encendida |
| gameover | Re → Mib | Re Fa Mi… **Mib** | la 2ª natural cae a bemol y se queda ahí |

### Lo nuevo de la v2 (lo que impide que sea la v1 con otros timbres)

1. **El mapa modula al lidio.** La sección B se va a Fa y el **Si natural** que hacía dorio al
   modo se reinterpreta como el **#4 lidio**. La misma nota, otro color: es el argumento del
   juego dicho en armonía. En el clímax (C c.7) vuelve como Mi natural sobre Sibmaj7, otro #11.
2. **La célula en mayor como recuerdo.** En el B del mapa aparece como `Fa La Sol Do` (1–3–2–5),
   ocho compases en los que el mundo se ve en color antes de volver al gris.
3. **La napolitana como firma de la Tinta.** El B de la batalla termina `Sib → Mi`: napolitana
   de La. Ese Sib es el mismo bII que en la jefa se convierte en el Mib de Re frigio. La
   batalla ya avisa de quién está detrás.
4. **El clave, no un sintetizador.** El ostinato cromático de La Tinta (Re–Mib–Re–Do#, semicorcheas)
   lo toca un clave: tinta y plumilla, no un pad de terror.
5. **El respiro de la jefa es el tema del mapa en frigio, a caja de música.** Ocho compases sin
   percusión ni ostinato de 16avos, a −32 dB de RMS, con el coro debajo. Estás peleando contra
   lo que vació el mundo y suena la canción del mundo envenenada.
6. **El mapa se calla.** La sección C deja cuatro compases de caja de música sola sobre pedal de
   Re. En un tema que se oye diez minutos seguidos, el silencio es el recurso más caro.

---

## 3. Las cinco piezas

Los bpm no son sólo estéticos: 100, 150, 144, 168 y 96 son **divisores de 10 584 000**, así que
un compás dura un número **entero de muestras** a 44,1 kHz y los puntos de loop caen en muestra
exacta, sin deriva acumulada.

### MAP — «Chromara apagada» · Re dorio · 100 bpm · 182,40 s
`intro(4) + [A(8) A2(8) B(8) C(8) link(4)] ×2` — loop de 36 c. = 86,40 s · loop [96,0000 → 182,4000]

| sección | armonía | qué pasa |
|---|---|---|
| intro | Dm7 ‖ Gadd9 ‖ Sibmaj7 ‖ Asus4 | arpa + colchón + oboe solo diciendo la célula, ppp |
| A | Dm7 ‖ G6 ‖ Famaj7 ‖ Cadd9 ‖ Sibmaj7 ‖ Am7 ‖ Gm6 ‖ Am7 | flauta cantabile, sin percusión. Cima Do6 (c.3) y Mi6 (c.7) |
| A2 | igual | **las cuerdas toman el canto una octava abajo**, la flauta pasa a contracanto nuevo, entran marimba (3+3+2), tambor de mano y bajo en corcheas; el oboe se suma en 3ªs en c.5-8 |
| B | Famaj7 ‖ G/F ‖ Famaj7 ‖ Sibmaj7 ‖ Am7 ‖ Dm7 ‖ Gm6 ‖ Cadd9 | **Fa lidio**. Canta el oboe (célula en mayor). Marimba a contratiempo, sonajero a 16avos. En c.7-8 flauta y oboe al unísono + coro: el punto más ancho (−14,2 dB) |
| C | Dm7 ‖ Dm7 ‖ Sibmaj7/D ‖ Gm6/D ‖ Dm7 ‖ Gadd9 ‖ Sibmaj7 ‖ Am7 | **c.1-4: caja de música sola sobre pedal de Re (−32,2 dB)**. c.5-8 vuelve todo: flauta + cuerdas a la octava + coro + oboe como tercera voz. Cima de la pieza (Mi6 sobre Sibmaj7 = #11) |
| link | Gm6 ‖ Cadd9 ‖ Sibmaj7 ‖ Asus4 A | se adelgaza; el Do# del oboe y del arpa en el último compás tira hacia Re |

Curva de RMS: intro −30,3 · A −24,1 · A2 −21,4 · B −19,6 → **−14,2** · C **−32,2** → **−15,5** · link −24,0.
**18 dB de recorrido.**

### BATTLE — «Mezcla de colores» · La eólico · 150 bpm · 96,00 s
`intro(4) + [A(8) A2(8) B(8) C(4)] ×2` — loop de 28 c. = 44,80 s · loop [51,2000 → 96,0000]

Gancho (m1): **La–Do–Si–Mi La Sol** con ritmo corchea-con-puntillo / semicorchea / corchea /
corchea / negra / negra, y las **tres primeras frases son la misma célula bajando por grados
conjuntos** (La, Sol, Fa). Tres peldaños idénticos y una cuarta frase que rompe la secuencia
saltando al Re6. Es lo que hace que se pueda tararear.

| sección | armonía | qué pasa |
|---|---|---|
| intro | Am7 ×3 ‖ E7 | redoble de caja en crescendo, plato, bajo motor; el gancho asoma en c.3-4 |
| A | Am7 ‖ G7 ‖ Famaj7 ‖ E7 ‖ Am7 ‖ Domaj7 ‖ Dm7 ‖ E7 | trompeta + bajo + batería + cuerdas tenidas |
| A2 | igual | entran trompa (contracanto ascendente), cuerdas a contratiempo staccato, arpegio de sinte a 16avos; la melodía sube una octava en c.5-8 y llega a Mi6 |
| B | Dm7 ‖ Dm7 ‖ Sibmaj7 ‖ Cadd9 ‖ Dm7 ‖ Gm6 ‖ **Sib** ‖ E7 | **cae al Re menor, la tónica del mundo**: la célula del mapa entera en la trompeta, cuerdas tenidas, sin arpegio. −21,7 dB. Y sale por la **napolitana Sib → Mi** |
| C | Am7 ‖ Famaj7 ‖ Dm7 ‖ E7 | clímax: el sinte dobla al canto al unísono, trompa a la octava, cuerdas a golpes acentuados, bombo a negras, redoble de caja de 16avos en el último compás |

Curva de RMS: intro −20,6 · A −19,7 · A2 −18,6 · B −21,7 → −17,6 · C **−16,2**.

### BOSS — «La Tinta» · Re frigio (+ 7ª sensible) · 144 bpm · 113,33 s
`intro(4) + [A(8) B(8) C(8) D(8)] ×2` — loop de 32 c. = 53,33 s · loop [60,0000 → 113,3333]

| sección | armonía | qué pasa |
|---|---|---|
| intro | Dm ‖ Dm ‖ Mibmaj7 ‖ A7 | el clave solo con el goteo Re–Mib–Re–Do#; campana tubular, timbal, tam-tam |
| A | Dm ‖ Mibmaj7 ‖ Dm ‖ Mibmaj7 ‖ Dm/Mibmaj7-D ‖ Sibmaj7 ‖ Gm7 ‖ A7 | tema en la **trompa**, registro medio-grave; cuerdas en díadas tenidas; sin coro |
| B | Dm ‖ Dm ‖ Mibmaj7 ‖ Mibmaj7 ‖ Sibmaj7 ‖ Gm7 ‖ Mibmaj7 ‖ A7 | el tema pasa a las **cuerdas** una octava arriba, la trompa hace contracanto, entra la **caja de orquesta** con crescendo escrito compás a compás, coro desde c.5 |
| C | Dm ‖ Mibmaj7/D ‖ F/D ‖ Gm7/D ‖ Dm ‖ Mibmaj7 ‖ Gm7 ‖ A7 | **el respiro**. El tema del mapa en frigio, a caja de música, sobre pedal de Re. Clave en arpegio lentísimo (ppp), coro, sin percusión. −32,1 dB. En el último compás, redoble de timbal en crescendo que anuncia lo que viene |
| D | Dm ‖ Mibmaj7 ‖ F ‖ Gm7 ‖ Mibmaj7 ‖ Dm ‖ Mibmaj7 ‖ A7 | clímax: trompeta arriba, trompa debajo, cuerdas motor a corcheas, clave a 16avos ff, timbales acentuados, campana en c.1 y 5. Acaba en Mi6 tenido sobre A7 — **dominante sin resolver**, vuelve a A |

Curva de RMS: intro −30,5 · A −24,4 · B −24,2 → −20,0 · C **−32,1** · D −18,8 → **−17,1**. **15 dB.**

### VICTORY — Re mayor add9 · 168 bpm · 6,71 s (5,71 s + 1 s de cola)
`Dadd9 ‖ Sibmaj7 ‖ Gadd9 A7 ‖ Dadd9`. La célula encendida (Re Fa# Mi La) en la trompeta, trompa
a la octava, glissandi de arpa a 16avos, coro, timbal, plato, campana tubular en el acorde final.
El **Sibmaj7** del c.2 es el mismo bVI/napolitana que en la batalla era la firma de la Tinta:
aquí suena cálido en vez de amenazante. Es el mismo acorde ganado.

### GAMEOVER — Re → Mib · 96 bpm · 6,00 s (5,0 s + 1 s de cola)
`Dm ‖ Mibmaj7/D`. El oboe dice la célula del mapa por última vez (Re–Fa–**Mi**–La, con el La ya
una octava abajo), y en el segundo compás la 2ª ya es **Mib**. El bajo se queda clavado en Re,
así que el acorde final es un **bII sobre pedal de tónica que no resuelve**. La última nota que
se oye es el Mib de la caja de música: la Tinta se queda con el cuadro.

---

## 4. Orquestación (voz → fuente → función)

`CT` = `~/eva-intro/ct_sf/Chrono Trigger.sf2` · `SNES` = `~/eva-intro/snes.sf2`

| pieza | voz | fuente | función | bus |
|---|---|---|---|---|
| map | flute | CT 73 | canto en A y C, contracanto en A2 | eco |
| | oboe | CT 69 | respuestas en A, canto en B, 3ª voz en la cima de C | eco |
| | strings | CT 48 | canto en A2 (8ª baja), doblaje en C, línea en B | seco |
| | pad | CT 48 (canal aparte) | colchón: díadas en intro/A/C, nota sola donde no cabe más | seco |
| | harp | CT 46 | arpegio continuo; contorno distinto en cada sección | seco |
| | marimba | CT 12 | 3+3+2 staccato en A2, contratiempos en B (sabor DKC) | seco |
| | bass | CT 33 | blancas en A, corcheas con aproximaciones cromáticas en A2/B, pedal en C | seco |
| | choir | CT 52 | sólo B c.7-8 y C c.5-8 | seco |
| | musicbox | SNES 0:10 | los cuatro compases de silencio de C | eco |
| | handdrum | CT 122 | pulso suave desde A2, redoble al final de cada sección | seco |
| | shaker | SNES 128:0 (82) | 16avos en B, corcheas en C; triángulo (81) en C c.5 | seco |
| battle | lead | CT 56 trompeta | el gancho | eco |
| | horn | CT 60 | contracanto en A2/B, 8ª baja del canto en C | seco |
| | strings | CT 48 | tenidas en A, contratiempos staccato en A2, acordes acentuados en C | seco |
| | synth | CT 81 | arpegio de 16avos en A2 y B c.5-8; **unísono con el canto en C** | eco |
| | bass | CT 38 synthbass | motor de corcheas La1↔La2 con aproximaciones cromáticas | seco |
| | snare | CT 124 | contratiempo y redobles | seco |
| | drums | SNES 128:0 | bombo (36), charles (42/46), toms (41/45/47), plato (49) | seco |
| boss | trumpet | CT 56 | canto del clímax (D) | eco |
| | horn | CT 60 | tema en A, contracanto en B, refuerzo en D | seco |
| | strings | CT 48 | díadas en A, tema en B, pedal en C, motor de corcheas en D | seco |
| | harpsi | SNES 0:6 clave | ostinato cromático Re–Mib–Re–Do# a 16avos | seco |
| | bass | CT 33 | pedal en A/C, corcheas en B/D | seco |
| | choir | CT 52 | entra en B c.5; díadas en C; alterna con la campana en D | seco |
| | timp | CT 47 | acentos y redobles; el crescendo que cierra C | seco |
| | osnare | CT 117 | caja de orquesta, sólo en B, con crescendo escrito | seco |
| | kit | SNES 128:0 | bombo, toms, plato (49) y **tam-tam/china (52)** | seco |
| | musicbox | SNES 0:10 | el tema del mapa en frigio, en C | eco |
| | bell | SNES 0:14 | campana tubular: intro y D c.1/5/8 | eco |
| victory | trumpet, horn, strings, choir, harp (CT), timp (CT 47), kit (SNES), bell (SNES 0:14) | | fanfarria | |
| gameover | oboe, strings, choir, bass, timp (CT), musicbox + tam-tam (SNES) | | caída | |

**Minuciosidad, en concreto**: no hay una sola nota a velocity fija. Cada frase lleva su
velocity escrita nota a nota (ataque, crescendo hacia la cima, caída); los redobles y crescendos
de percusión están escritos golpe a golpe (p. ej. la caja de orquesta de la jefa sube de 52 a
127 a lo largo de ocho compases). Articulación: `gate` 0,98 en cantos legato, `.` staccato en
marimba y golpes de cuerda, `gate` 0,78-0,88 en bajos, `gate` 1,0 en toda la percusión (que no
tiene release). Notas de adorno reales: la aproximación La-Si semicorcheas antes del Do6 en el
mapa (A c.3), el mordente Mi-Re en la cima de A c.7, la aproximación Sol-La-Sib en B c.4.

---

## 5. Avisos que quedan y por qué

| aviso | justificación |
|---|---|
| **mapa: 30 choques en tiempo fuerte** | El lenguaje del mapa es de **notas añadidas** (6ª, 9ª, 11ª) sobre un analizador que sólo modela tríadas y séptimas. Los casos: 13ªs sobre maj7 (Re6 sobre Famaj7 = Fa6/9), 11ªs sobre m7 (Re5 sobre Am7 = Am11), 9ªs sobre G/F, y **un #11 deliberado**: el Mi6 tenido sobre Sibmaj7 en la cima de C, que es el eco del Si natural lidio de la sección B. No son errores: son el color |
| **batalla: 14 choques**, todos en C t.4 | Anticipaciones del acorde siguiente: el Si5 sobre Am7 y el Mi6 sobre Dm7 en el último tiempo del compás se resuelven en el compás siguiente. Es cómo se empuja un clímax |
| **salto de 14 semitonos en el canto** (batalla y jefa) | No es un salto melódico: es el corte entre el final de una sección y el arranque de la siguiente (o de la vuelta del loop), con silencio de por medio |
| **cruces de registro** (arpa/marimba/sinte por encima de cuerdas o colchón) | Un arpegio de arpa por encima de un colchón de cuerdas y una marimba a contratiempo por encima del pizzicato son orquestación normal, no cruces de voces. El aviso viene de que el rol (`lead`/`counter`/`harmony`) es fijo por voz y en estas piezas **las voces se intercambian el canto entre secciones**: en el mapa las cuerdas cantan en A2 y acompañan en B; en la jefa la trompa canta en A y las cuerdas en B |
| **jefa: el bajo no toca la fundamental en 2 cambios** | Pedal de Re bajo Mibmaj7/D y F/D en el respiro; está declarado en el cifrado |
| **jingles: «todas las secciones tienen el mismo RMS»** | Tienen una sola sección. El aviso no aplica |

## 6. Verificación del loop

`intro + loop + loop`, con el segundo loop empezando exactamente donde termina el primero,
de modo que **la cola de reverb del primer loop suena bajo el arranque del segundo**. El corte
final es exacto en muestras (`loopEnd == longitud del fichero`), calculado desde bpm y compases,
no medido a ojo. Medido en el empalme (correlación de los 250 ms previos a `loopEnd` contra los
250 ms previos a `loopStart`, y salto de muestra en el punto de corte):

| pieza | correlación | Δ RMS | salto de muestra | RMS local |
|---|---|---|---|---|
| map | 0,9946 | +0,2 dB | 0,00052 | 0,0528 |
| battle | 0,9956 | −0,02 dB | 0,0277 | 0,1471 |
| boss | 0,8301 | +0,61 dB | 0,0596 | 0,1584 |

El salto en la jefa es el mayor (38 % del RMS local, unos −24 dBFS instantáneos) porque el loop
cierra con un redoble de timbal y caja a ff; queda enmascarado por el propio transitorio. La
correlación más baja (0,83) tiene la misma causa: en un pasaje de transitorios densos, el estado
interno de la reverb no es periódico. En el mapa el empalme es prácticamente perfecto.

## 7. Limitaciones honestas

- **No he podido escuchar el resultado.** Toda la verificación es instrumental: informe del
  pipeline, piano roll, RMS por sección y por tramo, balance espectral por bandas, polifonía
  simultánea, medida del empalme del loop y sonda de cada preset del soundfont. Un oído humano
  puede oír cosas que estas medidas no cogen (sobre todo asperezas de timbre en el registro
  agudo de las muestras estiradas: trompeta en Mib6/Mi6 y flauta en Fa6 están a +27/+29
  semitonos de la muestra raíz y pueden sonar finas).
- **El mapa tiene poco grave** (−16,4 dB por debajo de 120 Hz, frente a −3 de la batalla).
  Es en parte deliberado (bajo acústico en registro de violonchelo, textura ligera) y en parte
  una limitación: subir el CC7 apenas mueve la aguja porque el bajo está escrito en Re2-Fa3, y
  bajarlo una octava más empeoraría el timbre de la muestra.
- **`map.wav` pesa 31 MB.** Es la consecuencia de 36 compases de loop a 100 bpm renderizados
  dos veces. Están los `.mp3` y unos `.opus.ogg` a 112 kbps por si el juego prefiere cargar eso.
- Los `.opus.ogg` que había en la carpeta eran de la v1; los he **regenerado desde el audio
  nuevo** con `libopus 112k`. Si los habías creado tú con otros ajustes, rehazlos.
- La v1 sigue documentada en `FICHA_v1_chiptune.md`, pero sus audios han sido sustituidos.

---

## 8. TITLE — «El cuaderno se abre» · Re mayor (add9, mezcla modal) · 90 bpm · 138,67 s
Añadido después de la v2. Fuente `~/composer/pieces/chromara2_title.yaml`; ficha completa en
`~/composer/pieces/chromara2_title/FICHA.md`; informe `report_title.md`. Empaquetado como
`MUSIC_SAMPLES.title` con los mismos campos que las demás (`tools/pack_music.py`, que ahora incluye `title`).

`intro(4) + [A(8) B(8) C(8)] ×2` — intro **10,667 s**, loop de 24 c. = **64,000 s** · loop [74,6667 → 138,6667]
(90 es divisor de 10 584 000: compás = 117 600 muestras; `loopEndSample 6 115 200 == longitud`).

**Identidad — tres pinceladas de la misma célula.** En B el oboe dice la Célula del Prisma tres veces en
tres colores: Si menor (`Si Re Do# Fa#`, la sombra), Re menor sobre Sibmaj7/Gm6 (la célula del mapa sobre
el acorde de la Tinta) y Re mayor (`Re Fa# Mi La`, encendida): las tres gotas que nacen de la misma mancha.
La celesta marca la 3ª que cambia (Fa#6 / Fa6 / Fa#6). Cada sección acaba con un glissando de arpa que
pasa la página.

| sección | armonía | qué pasa |
|---|---|---|
| intro | Dadd9 ‖ Dadd9 ‖ Gmaj7/D ‖ Dadd9 | celesta sola con la célula aumentada (`Re:2 Fa#:4 Mi:4 La:1`), gotas de pizzicato muy espaciadas; colchón ppp desde c.3; arpa sube en c.4 |
| A | Dadd9 ‖ Gmaj7 ‖ Em7 ‖ Asus4 A7 ‖ Dadd9 ‖ Bm7 ‖ Gmaj7 ‖ Asus4 A7 | flauta con el gancho (`Re:4. Fa#:8 Mi:4 La:4`, cima Re6 en c.3 y Mi6 en c.6); oboe contesta en las respiraciones; cuerdas desde c.5; dos golpes pp de timbal |
| B | Bm7 ‖ Gmaj7 ‖ Sibmaj7 ‖ Gm6 ‖ Dmaj7 ‖ Bm7 ‖ Gmaj7 ‖ A7 | las tres pinceladas del oboe; redoble ppp de timbal en c.8 |
| C | Dadd9 ‖ A/C# ‖ Gmaj7 ‖ Bm7 ‖ Em7 ‖ F#m7 ‖ Gm6 ‖ Asus4 A7 | clímax: celesta al unísono con la flauta, cima Mi6 en c.6 con cuerdas a la octava y oboe a la 3ª; c.7 la sombra (Gm6) sin celesta; c.8 glissando hasta Do#6 + redoble → vuelve a A |

Curva de RMS: intro **−33,8** · A −21,5 · B −19,6 · C **−17,0**. Polifonía máxima 8 (spc.py).

Orquestación: flute CT 73 (eco) · oboe CT 69 (eco) · **celesta snes 0:8** en bus propio (eco + `pitch 19`:
la muestra está 19 cents baja respecto al sf2 de CT, medido por FFT; latencia de sox compensada con
trim/pad) · pizz CT 45 (gotas) · harp CT 46 (eco) · pad CT 48 (díadas) · strings CT 48 (línea lenta,
doblaje en la cima) · bass CT 33 · timp CT 47.

Empalme del loop: correlación 1,0000 · ΔRMS 0,0 dB · salto 0,0027 (RMS local 0,084). Avisos que quedan:
37 «choques» (9ª/11ª/13ª y la 2ª de la célula en el tiempo 3, incluido el #11 Mi sobre Sibmaj7), cruces
arpa/celesta sobre oboe (orquestación normal) y «corno inglés» para el preset `oboe` 69 (mismo caso que el mapa).
Limitación: no escuchado; verificación instrumental (informe, piano roll, RMS, FFT, empalme).
