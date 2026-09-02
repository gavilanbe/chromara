# CHROMARA — PoC de JRPG (mapa → transición de tinta → batalla Golden Sun con mezcla de colores)

Prueba de concepto en HTML + JS vanilla, sin dependencias. Abrir `index.html` en Chrome (funciona por `file://`).

## Qué demuestra
- Bucle completo: título → mapa de Chromara → encuentro visible → transición (la gota negra cae, salpica, la mancha se traga el mapa y lo inclina) → batalla sobre el mismo sitio → resultados → vuelta al mapa en el mismo punto.
- Combate estilo Chrono Trigger: **ATB en modo Active** (el tiempo no se para mientras eliges; los enemigos actúan aunque tengas el menú abierto y varias acciones se animan a la vez; `W` en debug alterna a Wait), menú Atacar / Tech / Objeto, **techs dobles y triple** que solo aparecen disponibles cuando los compañeros tienen la barra llena y consumen MP de todos.
- El corazón temático: **mezcla RYB**. Rojo+Amarillo=Naranja (Llamarada), Amarillo+Azul=Verde (Brote), Rojo+Azul=Violeta (Eclipse), los tres=Arcoíris. Un ataque hace 2× contra el color complementario y 0.5× contra el mismo color. Las Gotas Negras llevan el color que han robado en el núcleo; al morir dejan un charquito de ese color.
- Equipo temático: armas (Brocha, Lápiz, Pincel) y accesorios (Paleta, Goma, Sacapuntas, Lienzo, Difumino) con efectos reales. Objetos: Gota de agua, Tubo de pintura, Goma de borrar.
- Jefa: La Tinta. Al vencerla, la paleta del mundo pasa de apagada a viva.

## Controles
Flechas/WASD mover · Z/Enter confirmar · X/Esc atrás (en el menú de batalla, X cede el turno al siguiente listo) · Enter en el mapa: menú de estado/equipo (◄► cambia accesorio) · F1 panel debug (1-6/B batalla, H curar, F ATB lleno, K enemigos a 1 HP, C paleta).

## Vista de batalla: Golden Sun sobre el propio mapa (`scene.js`)
- **Suelo Mode 7**: por cada fila de pantalla se lanza un rayo desde la cámara (guiñada, cabeceo, altura, focal) y se muestrea la textura cenital del mapa (`sceneTexture`, montada con los mismos autotiles del overworld). Niebla hacia el horizonte, cielo en bandas con sol de pintura y silueta de bosque que gira con la cámara.
- **Proyección** (`project`): cada unidad, partícula, marca y prop vive en coordenadas de mundo `(wx, wy, wz)`; la escala del sprite depende de la profundidad. Árboles y rocas del mapa se dibujan como siluetas (`bigTree`, `bigRock`) salvo los que pisaría alguien.
- **Formación** alrededor del punto del encuentro: eje grupo→enemigo; enemigos delante, grupo detrás en escalera. La cámara de reposo (`camRest`) se calcula para dejar a los enemigos arriba-izquierda y al grupo abajo-derecha; `camFocus` la gira y acerca a cada acción y `camReset` la devuelve.

## Transición (`transitionGen`, siete fases)
1. **Detección**: el mapa se congela, el enemigo late con un `!`, y sobre el grupo crece la sombra de la gota que viene. El tema del mapa frena.
2. **Caída** con aceleración; la sombra se cierra.
3. **Salpicón**: hit-stop, sacudida, anillos de onda y gotas grandes que vuelan hacia la cámara.
4. **Mancha orgánica** (metabolas + tentáculos) que crece desde el impacto; por delante va una onda que **desatura** el mapa (composición `saturation`). Mientras cubre, la cámara pasa de cenital a la vista de batalla: el mapa se inclina.
5. **Drenaje**: la tinta se escurre hacia los enemigos y se vuelve su charco; los enemigos emergen con chorreones, el grupo rebota a su formación como tres gotas de color.

## Personajes (`sprites.js`)
Sprites dibujados a mano como matrices de caracteres con rampa por color (contorno, oscuro, sombra, base, luz, brillo) más paleta fija por sprite. Grupo en tres vistas (espaldas tres cuartos para el reposo, perfil para actuar, frente para herido/KO/victoria): Carmín gota gorda con boina, Ámbar afilada como punta de lápiz con la mina arriba, Añil salpicadura con cresta y tres gotitas satélite que orbitan. Gotas Negras de frente con el color robado en el núcleo; La Tinta ocupa media pantalla. Expresiones (normal, parpadeo, herido, KO, feliz, cejas) y squash & stretch por pose.

## Ataques (`attacks.js`): cada acción se ve como lo que es
Las herramientas son props (`propSprite`) que entran en escena y actúan sobre el objetivo; la cámara se gira hacia la acción.
- **Brocha** (Carmín): entra enorme por el borde en primer plano, cruza al enemigo dejando un trazo de cerdas que lo tapa; el trazo se seca y se descascarilla. **Lápiz** (Ámbar): dash con estelas, garabato en espiral alrededor del enemigo y tachón de dos rayas; virutas. **Pincel** (Añil): el pincel se moja en ella (se agita, gotea), pinta una voluta en el aire que sale disparada como latigazo y salpica gotas que ruedan por el suelo.
- **Techs de herramienta: 3 personajes × 3 armas = 9 techs únicas** (las armas se intercambian en el menú; si coges la de otro, se la cambias). Carmín: **Brochazo** (la brocha cae como un mazo y estampa una Z), **Tachón** (clava el lápiz y tacha al enemigo, lo deja lento), **Manchurrón** (carga el pincel hasta hincharlo y planta un pegote que chorrea). Ámbar: **Ráfaga** (cruza la fila de enemigos a brochazos cortos), **Trazo doble** (se vuelve línea de lápiz y atraviesa en X), **Punteado** (cuatro toques de pincel). Añil: **Aguada** (banda de color diluido que empapa y ralentiza a todos), **Contorno** (perfila a lápiz al grupo: reciben un 40 % menos de daño durante tres turnos), **Salpicón** (salta y llueven gotas con sombra).
- **Llamarada**: tras la fusión, lápiz y brocha se cruzan como una cerilla, el lápiz raspa, prende, y el fuego recorre el suelo hasta los enemigos. **Brote**: el pincel pinta un tallo que trepa por cada enemigo y florece; el polen cura al grupo. **Eclipse**: la pantalla se oscurece, un disco rojo y otro azul se superponen y el violeta cae como un tampón que deja la silueta estampada. **Arcoíris**: los tres orbitan, la pantalla se vuelve papel, un prisma dibuja una cinta de arcoíris hasta cada enemigo y los colorea hasta borrarlos.
- Objetos: nube a lápiz que llueve (Gota de agua), tubo que se exprime como un bote de salsa (Tubo), el enemigo se vuelve dibujo a lápiz y se borra en virutas (Goma).
- Enemigos por forma: redondas saltan y se estampan (planchazo), salpicaduras escupen tres pegotes, alargadas embisten dejando un tachón en el suelo, charcos mandan una ola de tinta; Borrón tizna; La Tinta inunda la página (Marea negra).
- **Pringue** (`goop`): el objetivo se tiñe del color y le caen churretes. Marcas de pintura en el mundo (`mark`: trazo, camino, mancha, charco) y partículas con gravedad y rebote en el suelo.

## Menú de estado y equipo (`gui.js`)
El cuaderno se abre con rebote (easeOutBack) y se cierra deslizándose. Página izquierda con anillas: fichas de los tres (pegatina que hace pop al seleccionar, nombre en su color, rol, barras HP/MP) y una pincelada que se desliza entre filas. Página derecha, que pasa hoja al cambiar de personaje: retrato grande con esquinas de cinta (sprite del título, respira y parpadea), HP/MP/ATK/DEF/SPD con deltas verdes o rojas al cambiar de equipo, fila ARMA con el prop de la herramienta y fila ACCESORIO; ◄► cambia con la herramienta entrando de un golpe y salpicando (fwip, equip y plop con la nota del personaje). Las armas se intercambian de verdad entre personajes.

## Título (`drawTitle`)
Página de bloc con renglones; cae una gota de tinta, salpica y la mancha abre un agujero con borde de tinta por el que se ve Chromara en vuelo Mode 7. El logo son letras gooey pintadas a brochazos una a una (bases abultadas, meneo de gelatina, pop con salpicaduras, charquitos que se juntan, goterones que crecen y caen, onda de gelatina con chispazo y arpegio). Los personajes nacen de los goterones de sus letras (C→Carmín, R→Ámbar, M→Añil) con sprites grandes exclusivos, y saltan al centro en formación. Al pulsar Z: acorde, las letras se derriten y caen, la cámara pica hasta la vista cenital sobre el inicio mientras los tres se encogen, y aterrizan en el mapa uno tras otro con salpicón antes de que arranque el tema.

## GUI: cuaderno de pintor (`gui.js`)
- Páginas de bloc (`page`) con grano, borde rasgado, línea a lápiz y anillas; cinta de carrocero (`tape`) para el objetivo y la ecuación de color; pegatinas-retrato (`sticker`).
- Batalla: página izquierda de comandos teñida del color del personaje activo (cursor = gota de su color, resalte = pincelada translúcida), página derecha con nombre en su color, HP y MP en rectángulos a lápiz rellenos de pintura y brocha que se carga de pintura como ATB (gotea al estar lista). La lista de techs/objetos es una **hoja que se pasa** sobre el campo con el coste de MP y las gotas de los compañeros necesarios; arriba, cinta con `■+■=■ Llamarada · 6 MP · con Ámbar` y la descripción.
- Mapa: HUD de pigmento, aviso a página completa y menú de estado/equipo con el mismo papel.

## Overworld (`game.js`)
Versiones mini dibujadas a mano de los mismos personajes (coherentes con los sprites de batalla): espaldas al subir, frente al bajar, perfil a los lados (los seguidores miran hacia donde avanzan por la estela). Movimiento con aceleración y frenada, bote de gota al andar con gotitas del color del líder al aterrizar y pasos según el terreno, parpadeo en reposo, cámara suave con anticipación. Los enemigos usan sus sprites, botan, avisan con `!` al verte y persiguen; los vencidos dejan un charco con el color robado.
Autotiling por vecindad (`groundTile`, cacheado por forma): agua con banco de tierra y espuma animada, camino con borde irregular, puentes y embarcaderos de tablones, zona de tinta con borde líquido y chorretones, 16 variantes de hierba (flores muertas en gris, rosas y blancas en vivo), rocas. Árboles como sprites 16×24 ordenados por profundidad; los contiguos fusionan sus copas en setos.

## Sonido
- SFX sintetizados en Web Audio (`sfx.js`): agua, pintura, papel y herramientas; cada gota tiene su nota (Carmín Re, Ámbar Fa#, Añil La).
- **Música con samples SNES** (v2): compuesta en ~/composer (YAML `chromara2_*`), renderizada con fluidsynth sobre `Chrono Trigger.sf2` + `snes.sf2`, empaquetada por `tools/pack_music.py` a Ogg/Opus base64 en `music_samples.js` y reproducida con `AudioBufferSource` y loop points. `music.js` (chiptune v1) queda como fallback. Ficha en `music/FICHA.md`.

## Estructura
- `data.js` — todo lo tuneable: colores, complementarios, equipo, objetos, grupo, techs, enemigos, encuentros, mapa (strings), textos.
- `game.js` — núcleo/input/color · audio · arte procedural del mapa (gotas pequeñas, tiles) · overworld · título y bucle.
- `sprites.js` — sprites a mano y expresiones. `scene.js` — suelo Mode 7, cámara y proyección. `gui.js` — cuaderno. `battle.js` — estado, transición, efectos en el mundo, menú, ATB, fin. `attacks.js` — coreografías.
- Hooks: `window.__chromara` → `start()`, `battle('2')`, `atb()`, `kill()`, `win()`, `heal()`, `colorize()`, `pause()`.

## Decisiones de PoC (a revisar si pasa a vertical slice)
- La batalla ocurre sobre el propio trozo de mapa (misma textura, misma posición), pero con cámara propia y sin enemigos "de campo" durante el combate.
- Sin niveles ni subida de stats: el "Pigmento" solo se acumula. Sin guardado. Un mapa. Sin huir.
- Texto con Press Start 2P (Google Fonts, cae a monospace sin red).
