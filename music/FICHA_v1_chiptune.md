# CHROMARA — banda sonora original (5 piezas)

Compuesta con el pipeline `~/composer` (DSL por voces → MIDI → síntesis → informe crítico →
revisión) y exportada al esquema `MUSIC` del sintetizador del juego con
`~/composer/tools/chromara_export.py`. Nada escrito a mano en `music.js`, nada transcrito de
ninguna obra existente.

- Fuentes: `~/composer/pieces/chromara_{map,battle,boss,victory,gameover}.yaml`
- Brief razonado: `~/composer/pieces/chromara.brief.md`
- Informes por pieza: `~/composer/pieces/chromara_*/report.md`
- Entregable: `~/chromara/music.js` · audio de revisión y piano rolls: `~/chromara/music/`

---

## 1. Brief interpretado

| dimensión | lectura |
|---|---|
| Función | 3 loops de juego (exploración larga, combate corto, jefa larga) + 2 stings |
| Referente | Chrono Trigger / SNES 1995: modalidad sobre funcionalidad, acordes con añadidas y préstamos, textura pensada por **roles** (canto, contracanto, arpegio que simula la armonía, bajo que camina), segunda vuelta reorquestada |
| Motor | 5 pistas monofónicas + batería de 4 sonidos; ondas de pulso (duty 50/25/12), `tri`, `saw`, `sine`; ADSR por pista; eco compartido a corchea con puntillo |
| Matices | "melancólico **pero** esperanzado" → modo dorio, no eólico · "gancho memorable" → riff de 2 compases al desnudo · "respiro a mitad" → 6 compases sin batería · "mayor con añadida" → Re add9 desplegado |
| No dicho | que las 5 suenen del **mismo juego** |

## 2. Identidad de la BSO — "todo gira sobre RE; el modo es el color"

Las cinco piezas comparten centro tonal. Lo único que cambia es el **modo**, y el modo es el
color del mundo:

| pieza | centro | grado que cambia | lectura |
|---|---|---|---|
| map | **Re dorio** (Si natural) | 6ª mayor | mundo apagado, con color debajo |
| battle | **La eólico** (dominante de Re) | — | tensión que nunca vuelve a casa |
| boss | **Re frigio + sensible** (Mib, Do#) | 2ª menor | el mismo mundo teñido de tinta |
| victory | **Re mayor add9** | 3ª mayor | el color pleno |
| gameover | Re → **Mib** | bII gana | la Tinta se queda con el cuadro |

**Célula del Prisma (leitmotiv):** grados `1 – b3 – 2 – 5`.
- Re dorio → `Re Fa Mi La` (mapa, c. 5)
- Re frigio → `Re Fa **Mib** La` (La Tinta, c. 5 — el motivo teñido)
- Re mayor → `Re **Fa#** Mi La` (victoria, c. 1)
- derrota → `Re Fa Mib **La grave**`: la 5ª ascendente se convierte en 4ª descendente

La célula contiene justo los dos grados (2º y 3º) que distinguen los tres modos: **el leitmotiv
cambia de color con el mundo**. Es la idea que sostiene las cinco piezas y es lo que hace que
esto sea una banda sonora y no cinco loops.

---

## 3. Pieza a pieza

### map — "Chromara apagada" · Re dorio · 100 bpm · 32 c. · **76,8 s** de loop
**Forma** `intro(4) A(8) A2(8) B(8) coda(4)` — clímax en B.
**Armonía**
```
intro  Dm7 | G/D | Dm7 | Asus4
A/A2   Dm7 | Gadd9 | Fadd9 | C | Bbmaj7 | Am7 | Gm6 | A7
B      Fadd9 | C/E | Dm7 | Bb6 | Gm6 | C | Bb | A7
coda   Dm7 | Bb | Gm7 | A7
```
El Sol mayor sobre un modo menor (IV dórico) es el "esperanzado"; el Sib es préstamo eólico
(la punzada); el La7 con Do# es préstamo de la menor armónica y **no resuelve nunca dentro
del loop**: la coda muere en la sensible Do# y el bucle la resuelve al empezar otra vez.
**Motivos** `m0` = Célula del Prisma (c. 1, 13 y 29); `m1` = respuesta descendente.
Transformaciones: ornamentación en A2, fragmentación en la coda, y en B una frase nueva que
es la inversión del arco de A (A baja tras el pico, B sube hasta Fa6).
**Orquestación** lead `pulse50` (canto) · counter `pulse25` (callada toda la sección A: entra
en la segunda vuelta, como pide el lenguaje del referente) · pad `tri` (línea de notas guía,
no bloques) · bass `tri` (caminando en negras con cromatismos de aproximación: Sol#→La,
Si→Sib) · arp `pulse12` (solo en intro, B y coda: el destello de color).
**Curva** RMS por sección −16,2 / −13,0 / −12,2 / **−11,6** / −13,7 dBFS: sube hasta B y
respira en la coda.

### battle — "Mezcla de colores" · La eólico · 154 bpm · 32 c. · **49,9 s** de loop
**Forma** `intro(4) A(8) A2(8) B(8) C(4)` — clímax en C.
**Armonía** `Am | Am | F | G | Am | F | Dm | E7` (A/A2) · `Cm | Cm | Ab | Bb | Cm | Fm | Ab | E7` (B) ·
`Am | F | G | E7` (C).
**Gancho** riff de 2 compases (`m1`), a solas con bajo y batería en el intro: corchea con
puntillo + semicorchea, salto a Mi6, **un silencio** y caída; la respuesta acaba con la
sensible Sol# y otro silencio. El silencio es lo que lo hace recordable.
**Modulación** B sube a Do menor (bIII). La vuelta se hace por nota común: el Lab de la
sección B **es** el Sol# de la sensible del Mi7 que devuelve a La menor.
**Orquestación** lead `pulse50` · counter `pulse25` (respuestas en A, contracanto en corcheas
desde A2) · pad `saw` · bass `saw` en corcheas motoras con octavas y aproximación cromática al
acorde siguiente (Fa#→Sol, Sol#→La, Re#→Mi) · arp `pulse12` (corcheas en A2, **semicorcheas
solo en el clímax**) · batería completa con fill en el último compás de cada sección y
**cambio de patrón de bombo** en C.
**Curva** densidad 28 / 30 / 48 / 36 / **55** notas por compás; velocidad media máxima en C.

### boss — "La Tinta" · Re frigio + sensible · 146 bpm · 32 c. · **52,6 s** de loop
**Forma** `intro(4) A(8) respiro(6) B(8) coda(6)` — clímax en B.
**Ostinato cromático** (2 compases, `m3`): martilleo sobre Re con vecina superior **Mib**
(el bII frigio) y caída cromática `Mib–Re–Do#–Do–Si–Sib–La` hasta la dominante. En B el mismo
ostinato en semicorcheas (`m4`). **Pedal** de Re en el pad durante 12 de los 16 primeros
compases.
**Respiro** 6 compases sin batería, sin arpegio y con el bajo en pedal: ahí suena **el tema
del mapa en frigio**, aumentado. Es el mismo material melódico del mundo, con el 2º grado
bajado. Termina con un redoble de caja en crescendo (p→f) que reconstruye la tensión.
**Vuelta** B entra una **novena menor por encima** (Do#5 del respiro → Re6): la sensible
resuelve, pero una octava más arriba y con todo el grupo. El informe lo marca como salto de 13
semitonos; es deliberado y es el momento dramático de la pieza.
**Orquestación** lead `pulse25` (nasal) · counter `pulse50` grave · pad `saw` (pedal) ·
bass `saw` (ostinato) · arp `pulse12` en semicorcheas = el goteo de tinta · batería pesada
(bombo a 1 y 2-y, caja al 3 en A; caja a 2 y 4 en B).
**Curva** densidad 32 / 27 / **4,2** / **61** / 41: el respiro es un agujero real y B revienta.

### victory · Re mayor · 168 bpm · 4 c. · **5,7 s** (sin loop)
`D | Bm7 | Gmaj7 A7 | Dadd9`. Redoble de anacrusa, Célula del Prisma en mayor en el primer
compás (`Re Fa# Mi La`), ascenso por grados conjuntos hasta Mi6 y caída sobre el acorde final.
El **Re add9** final se construye entre las cinco pistas monofónicas: bajo Re2, pad La4,
contracanto Fa#5, canto Re6 y el arpegio sosteniendo **Mi5, la 9ª añadida**.

### gameover · Re → Mib · 126 bpm · 3 c. · **5,7 s** (sin loop)
`Dm | Bbm | Ebmaj7`. La Célula del Prisma desinflada: en vez de subir a la 5ª, **cae a la 4ª**.
El bajo hace la caída cromática de La Tinta a ritmo de negras (`Re–Do#–Do–Si–Sib–La–Lab`), la
melodía desciende y, en la última nota, **sube un semitono a Mib y se queda ahí**: el bII de la
tinta, sin resolver, con el Re del contracanto debajo formando una 9ª menor.

---

## 4. Decisiones y por qué

- **Batería fuera de la sección A del mapa.** Un tema pastoral que se oye 10 minutos seguidos
  no puede empezar con percusión. Entra en A2 (charles a contratiempo), crece en B y se retira
  en la coda.
- **El contracanto calla en toda la sección A** de mapa y batalla. Si la contramelodía suena a
  la vez que la melodía desde el primer compás, no hay segunda vuelta.
- **Arpegios en vez de acordes.** Cada pista es monofónica: la armonía se dice desplegándola,
  que además es la marca de la casa del hardware que se está imitando.
- **Articulación por envolvente, no por duración.** Las notas se tocan pegadas y el carácter
  (pizzicato del bajo, pad que respira, lead sostenido) sale del ADSR de cada pista. Así el
  exportador puede garantizar cero solapes dentro de una pista.
- **Eco a corchea con puntillo** (el motor lo sincroniza al tempo): fuerte en el mapa (0,30) y
  en los stings (0,35–0,40), bajo en la jefa (0,18) para que el ostinato no se embarre.
- **Volúmenes calibrados midiendo, no a ojo**: con un AnalyserNode sobre el master del juego,
  picos de 0,125 (mapa) a 0,386 (victoria) y RMS de −30 a −21 dBFS. Sin recorte, y con los SFX
  del juego (0,25–0,40 de pico) todavía por encima de la música.

## 5. Avisos del informe que quedan, y su justificación

- **map, 25 choques en tiempo fuerte.** 14 son notas del bajo en el 4º tiempo: son las
  aproximaciones cromáticas al acorde siguiente (Sol#→La, Si→Sib, La→Sib), que es exactamente
  lo que se pide de un bajo que camina. Los 11 melódicos son 9ªs y 11ªs de apoyatura que
  resuelven por grado conjunto (Do6→Sib5 sobre Gm6, La5→Sib5 sobre Bb). Etiqueté como
  `Gadd9 / Fadd9 / Bbmaj7 / Gm6 / Bb6` los acordes en los que la nota añadida **es** el color
  buscado, para que el informe distinga lo intencionado de lo accidental.
- **boss, 32 choques.** Son los grados del modo: Mib (bII frigio), Sib (b6) y Do# (sensible de
  la menor armónica) sobre un campo modal etiquetado `Dm`. El analizador razona con tríadas y
  no sabe expresar "campo modal frigio con sensible". No son errores: son la pieza.
- **boss, salto de 13 semitonos en la melodía.** Es la transferencia de registro del respiro a
  la sección B, descrita arriba. Intencionada.
- **arp por encima del lead / del pad.** El arpegio vive en la franja media-alta y el canto
  cruza por debajo cuando la frase baja. Es la disposición normal de una textura de chip
  (canto arriba, arpegio brillando en medio); limité el arpegio a Do6 en las secciones donde
  el canto está activo para reducirlo.
- **gameover, choques del bajo.** Son la caída cromática entera. Es el motivo, no un error.

## 6. Limitaciones honestas

- **No he podido escuchar el resultado.** Mi verificación es: el informe del pipeline (ámbitos,
  saltos, densidad por sección, choques, RMS), los piano rolls, y una prueba en Chrome real
  contra el sintetizador del juego (las cinco piezas se programan sin errores de consola, los
  jingles se paran solos y medí picos y RMS). Nada de eso sustituye a oírlo.
- **El WAV de `music/` no es lo que sonará exactamente.** Está renderizado con mi sintetizador
  Game Boy (pulsos con duty, tabla de onda, ruido LFSR), que es el equivalente más cercano
  que tengo a las ondas del motor, pero no es el mismo sintetizador: el eco, el ADSR y la
  batería del juego son distintos. Sirve para juzgar notas, forma y equilibrio, no timbre.
- **El loop del mapa dura 77 s**, que es largo. Es deliberado (menos fatiga al oírlo mucho),
  pero si en el juego se siente lento, la coda de 4 compases se puede recortar a 2.
- **La sección B de la batalla es la más floja de las tres piezas largas.** La melodía en Do
  menor es correcta y contrasta, pero no tiene un gancho propio como el riff: cumple la función
  de "sección media" sin ser memorable por sí sola. Alternativa si quieres mejorarla: darle su
  propio motivo rítmico en vez de reutilizar el patrón corchea-con-puntillo del riff.
