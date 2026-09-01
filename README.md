# CHROMARA — PoC de JRPG (mapa → transición → batalla ATB con mezcla de colores)

Prueba de concepto en HTML + JS vanilla, sin dependencias. Abrir `index.html` en Chrome (funciona por `file://`).

## Qué demuestra
- Bucle completo: título → mapa de Chromara → encuentro visible → transición (gota negra que cae y salpica) → batalla → resultados → vuelta al mapa en el mismo punto.
- Combate estilo Chrono Trigger: **ATB en modo Active** (el tiempo NO se para mientras eliges; los enemigos actúan aunque tengas el menú abierto y varias acciones se animan a la vez; `W` en debug alterna a Wait), menú Atacar / Tech / Objeto, **techs dobles y triple** que solo aparecen disponibles cuando los compañeros tienen la barra llena y consumen MP de todos.
- El corazón temático: **mezcla RYB**. Rojo+Amarillo=Naranja (Llamarada), Amarillo+Azul=Verde (Brote), Rojo+Azul=Violeta (Eclipse), los tres=Arcoíris. Un ataque hace 2× contra el color complementario y 0.5× contra el mismo color. Las Gotas Negras llevan el color que han robado en el núcleo; al morir dejan un charquito de ese color.
- Equipo temático: armas (Brocha, Lápiz, Pincel) y accesorios (Paleta, Goma, Sacapuntas, Lienzo, Difumino) con efectos reales. Objetos: Gota de agua, Tubo de pintura, Goma de borrar.
- Jefe: La Tinta. Al vencerla, la paleta del mundo pasa de apagada a viva.

## Controles
Flechas/WASD mover · Z/Enter confirmar · X/Esc atrás (en el menú de batalla, X cede el turno al siguiente listo) · Enter en el mapa: menú de estado/equipo (◄► cambia accesorio) · F1 panel debug (1-6/B batalla, H curar, F ATB lleno, K enemigos a 1 HP, C paleta).

## Dirección de arte aplicada
- Grid único 320×180, escalado por entero, UI incluida.
- Gotas generadas proceduralmente (`makeDrop`): rampa de 4 tonos con **hue-shifting** (sombras hacia azul, luces hacia amarillo; los amarillos limitados para no parecer fuego), **selout** en el contorno, brillo especular, forma = rol (redonda/guardia, alargada/veloz, salpicadura/pigmento).
- Mundo desaturado ("Chromara apagada") frente a personajes saturados. Dos paletas de tiles: `gris` y `vivo`.
- Overworld con **autotiling por vecindad** (`groundTile`, cacheado por forma, no por posición): agua con banco de tierra + espuma animada (4 frames en vaivén) y esquinas interiores; camino con borde irregular donde asoma la hierba; **puentes y embarcaderos** de tablones (orientados según el agua que cruzan, con barandas); zona de tinta con borde líquido (bultos, contorno oscuro, menisco brillante y chorretones al sur, charcos más profundos); hierba con 16 variantes (matas, flores muertas en gris / rosas y blancas en vivo); rocas con contorno y sombra. **Árboles como sprites 16×24** (`treeSprite`) ordenados por profundidad con el resto de entidades: el grupo pasa por detrás de la copa; los árboles contiguos fusionan sus copas en setos con hendiduras.
- Animación: idle con squash & stretch (4 frames), poses hurt/attack/ko/happy, lunge en el ataque, chorros de partículas del color de cada usuario que convergen y estallan en el color mezclado, **hit-stop**, shake, flash, números flotantes (amarillo grande = golpe débil).
- Sonido: SFX por osciladores. **Música con samples SNES** (v2): compuesta en ~/composer (YAML `chromara2_*`), renderizada con fluidsynth sobre `Chrono Trigger.sf2` + `snes.sf2` (máx. 8 voces como el SPC700, dinámicas nota a nota, eco), empaquetada por `tools/pack_music.py` a Ogg/Opus base64 en `music_samples.js` y reproducida con `AudioBufferSource` y loop points sample-exactos (render intro + loop×2; el loop es la segunda repetición para que la cola de reverb suene bajo el reenganche). Todo sobre Re: mapa Re dorio→Fa lidio (100 bpm, loop 86 s), batalla La eólico con B en Re menor (150 bpm, 45 s), jefa Re frigio con clave, timbales y tam-tam (144 bpm, 53 s, respiro = tema del mapa en caja de música), victoria Re mayor add9, game over Re→Mib. Leitmotiv "Célula del Prisma" 1–b3–2–5. `music.js` (chiptune v1) queda como fallback si faltan samples. Ficha en `music/FICHA.md`.

## Animaciones de ataque (cada acción se ve como lo que es)
Las herramientas **no las empuña la gota**: aparecen como assets independientes (destello), actúan sobre el objetivo y se retiran.
- Assets pixel art en `propSprite`: Brocha plana de pintor 60×22 (mango-pala de madera clara con agujero, virola ancha con remaches, cerdas naturales con la punta cargada del color), Lápiz (goma, virola, cuerpo hexagonal facetado, cono de madera, mina), Pincel (mango lacado con anilla del color, virola con pliegues, mechón afilado), Goma bicolor con funda, Tubo con etiqueta y tapón.
- `toolStroke` mueve la herramienta con la **punta siguiendo un camino** y deja el trazo detrás (marcas `path`, con grafito debajo en el lápiz).
- Básicos: Brocha = pincelada diagonal que cae sobre el enemigo · Lápiz = dash con estelas + garabato en zigzag · Pincel = voluta pintada en el aire que sale disparada y salpica.
- Techs simples: Brochazo = brocha gigante que pinta una Z roja · Trazo doble = X gigante mientras Ámbar atraviesa dos veces · Salpicón = salto + pincel-látigo que salpica a todos.
- Combos: fase común `chargeAndFuse` (anillos bajo los usuarios, partículas subiendo, chorros que convergen en un orbe que alterna colores y se funde en el mezclado) y liberación propia: Llamarada = orbe que cae y lenguas de fuego bajo cada enemigo · Brote = onda verde por el suelo, zarcillos que trepan por los enemigos, brotes con flor bajo el grupo · Eclipse = disco negro con corona violeta que oscurece el campo y se estrella con onda de choque · Arcoíris = tres orbes que orbitan y se funden en blanco, prisma de seis haces + arco.
- Enemigos por forma: redondas saltan y planchan (mancha negra), salpicaduras escupen pegotes, alargadas embisten y tiznan en diagonal, charcos mandan una ola de tinta por el suelo; La Tinta: Marea negra como ola grande.
- **Pringue** (`goop`): al recibir pintura, el objetivo se tiñe del color (sprite compuesto `source-atop`, cacheado) y le caen churretes que van bajando; a los ~1,5 s se desvanece y vuelve a la normalidad. Lo aplican brocha, pincel, Brochazo, Salpicón, Eclipse, Arcoíris, el Tubo (color del aliado) y los ataques de tinta de las Gotas Negras (negro).
- Objetos: Gota de agua cae del cielo y salpica · Tubo se coloca encima, apunta abajo y se exprime · Goma frota de lado a lado mientras el enemigo parpadea (virutas rosas).

## Batalla estilo Chrono Trigger: la arena es el mapa
- **Diorama isométrico** (`buildArena`, `isoTile`): al empezar la batalla se recorta el trozo de mapa 11×7 donde te han pillado y se proyecta en 2:1 (cada tile cenital se gira 45° y se aplasta, así conserva orillas, bordes de camino y chorretones de tinta). Flota sobre la tinta negra con grosor de tierra, sombra y ondas lentas. Árboles y rocas se dibujan a escala de batalla (`bigTree`, `bigRock`) y se ordenan por profundidad con las unidades: el grupo puede pasar por detrás de un árbol.
- La ventana se recorta al interior del mapa (evita el anillo de árboles del borde) y cada unidad ocupa la casilla transitable libre más cercana a su puesto en la formación en diagonal (enemigos arriba-izquierda, grupo abajo-derecha), penalizando casillas que quedarían tapadas por un árbol.
- El grupo **entra corriendo** a su posición durante la intro; las techs de área (Llamarada, Brote, Marea negra) se anclan al centro real de cada bando en vez de a coordenadas fijas.

## GUI estilo Chrono Trigger con el tema de los colores
- Ventanas de tinta con degradado, marco biselado claro/oscuro y un **hilo prismático** (rojo→violeta) en el borde superior (`win`); texto blanco con sombra (`ui`), etiquetas en lila, resaltes en amarillo.
- Batalla: ventana de comandos a la izquierda (teñida del color del personaje activo) y ventana de estado a la derecha, con **brocha que se carga de pintura = ATB**, nombre en el color de cada gota (blanco al estar activo sobre su pincelada), `HP`/`MP` con barras de pintura. La lista de techs/objetos se abre **sobre el campo** con el coste de MP a la derecha y las gotas de los compañeros necesarios para cada combo; arriba, la **ecuación de color** (`■+■=■ Llamarada · 6 MP · con Ámbar`) y la descripción.
- Cursor = gota del color del personaje; resaltes = pincelada translúcida de su color (`hilite`). Letreros superiores como pincelada del color de la acción; cursor de objetivo con etiqueta de nombre y HP.
- Mapa: HUD de pigmento, aviso a página completa y menú de estado/equipo con el mismo estilo.

## SFX: agua, pintura, papel y herramientas (`sfx.js`)
Kit sintetizado en Web Audio (ruido blanco/rosa/marrón filtrado, gotas con barrido de tono, campanas inarmónicas, reverb por convolución generada, ducking de la música). Todo varía ±4 % de tono y hay antirrepetición de 30 ms.
- **UI cuaderno**: cursor = gotita con la nota del personaje (Carmín Re, Ámbar Fa#, Añil La), confirmar = pincelada + gota, cancelar = goma, abrir/cerrar cuaderno, pasar página (cambiar personaje / cerrar mensaje), estuche al cambiar accesorio, rasca de lápiz sin mina si no se puede.
- **ATB**: brocha llena = gota en vaso con la nota del personaje; combo disponible = tres gotas en acorde; enemigo a punto de actuar (82 %) = burbuja de tinta.
- **Herramientas**: barrido de cerdas + splat (brocha), dash + rascado de grafito (lápiz), siseo + fwip + splat pequeño (pincel), brocha grande y barrido largo (Brochazo), látigo + rascados largos (Trazo doble), látigo + chapoteo limpio (Salpicón), frotado + virutas (goma), squeeze + plop (tubo), caída + chapoteo + burbujas (gota de agua).
- **Mezclas**: carga = glissandos con la nota de cada usuario; fusión = campanazo de mezcla con ducking; Llamarada fwoom + crepitar; Brote crujidos de tallo + hojas + campanitas; Eclipse zumbido descendente → impacto sub + cristales; Arcoíris arpegio de 8 + shimmer.
- **Daño/estados**: splat normal, splat + crack + campana en golpe débil (2×), golpe sordo de cera al resistir, chorro de tinta al tiznar, goteo lento, disolución con burbujas al morir un enemigo, gota aplastada en KO aliado.
- **Mapa**: pasos por terreno (hierba/camino/madera del puente), detección de enemigo (burbuja + latido), encuentro (silbido de caída + splash grande con ducking), tintineo de pigmento en resultados, acorde que se satura al recuperar el color, ambiente continuo (viento + gotas lejanas en gris; viento + pájaros en vivo).

## Estructura
- `data.js` — todo lo tuneable: colores, complementarios, equipo, objetos, grupo, techs, enemigos, encuentros, mapa (strings), textos.
- `sfx.js` — kit de efectos; `music_samples.js` — audio embebido; `tools/pack_music.py` — empaquetador.
- `game.js` — motor: núcleo/input/color · audio · arte procedural · mapa · transición · batalla (corrutinas con generadores) · bucle y debug.
- Hooks: `window.__chromara` → `battle('2')`, `atb()`, `kill()`, `win()`, `heal()`, `colorize()`, `pause()`, `sprite({...})`.

## Decisiones de PoC (a revisar si pasa a vertical slice)
- Batalla en pantalla aparte pero **sobre el propio trozo de mapa** en isométrico (diorama): se queda el momento visual de la transición y la sensación CT de luchar donde estabas. In-situ puro (sin cambio de pantalla) queda para la vertical slice.
- Sin niveles ni subida de stats: el "Pigmento" solo se acumula. Sin guardado. Un mapa. Sin huir.
- Los accesorios se pueden repetir entre personajes (no hay inventario de equipo real).
- Texto con Press Start 2P (Google Fonts, cae a monospace sin red).
