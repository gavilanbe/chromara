// CHROMARA — datos del juego (PoC). Todo lo tuneable vive aquí, no en game.js.
'use strict';
const DATA = {
  // ---- Modelo de color: RYB (pintor). Primarios → secundarios → blanco (arcoíris).
  colors: {
    rojo:     { name: 'Rojo',     hex: '#e23c3c' },
    amarillo: { name: 'Amarillo', hex: '#f2c93a' },
    azul:     { name: 'Azul',     hex: '#3a6fe2' },
    naranja:  { name: 'Naranja',  hex: '#f07d2a' },
    verde:    { name: 'Verde',    hex: '#4fb84a' },
    violeta:  { name: 'Violeta',  hex: '#8b48c8' },
    negro:    { name: 'Tinta',    hex: '#2a2438' },
    blanco:   { name: 'Arcoíris', hex: '#f4f0ea' },
  },
  // Complementarios: un ataque de color X hace 2× a un objetivo de color complement[X], 0.5× al mismo color.
  complement: { rojo: 'verde', verde: 'rojo', amarillo: 'violeta', violeta: 'amarillo', azul: 'naranja', naranja: 'azul' },
  mix: { 'amarillo+rojo': 'naranja', 'amarillo+azul': 'verde', 'azul+rojo': 'violeta', 'amarillo+azul+rojo': 'blanco' },

  // ---- Equipo: armas y accesorios de "material de dibujo"
  weapons: {
    brocha: { name: 'Brocha',  atk: 6, spd: -1, desc: 'Salpica al vecino con un 30% del golpe.' },
    lapiz:  { name: 'Lápiz',   atk: 4, spd: 2,  desc: 'El ataque ignora un 35% de defensa.' },
    pincel: { name: 'Pincel',  atk: 3, mp: 6,   desc: 'Su pintura dura 3 acciones enemigas.' },
    pluma:  { name: 'Pluma',   atk: 5, mp: 4,   found: true, desc: 'Estilográfica del delineante. Escribe con tu color.' },
  },
  accessories: {
    paleta:     { name: 'Paleta',      mp: 8,  techDiscount: 1, desc: 'Las techs cuestan 1 MP menos.' },
    goma:       { name: 'Goma',        def: 5, immune: 'tiznado', desc: 'Borra el tizne. Inmune a Tiznar.' },
    sacapuntas: { name: 'Sacapuntas',  spd: 3, desc: 'Más filo, más velocidad.' },
    lienzo:     { name: 'Lienzo',      hp: 30, desc: 'Más superficie que pintar. +HP.' },
    difumino:   { name: 'Difumino',    def: 2, atk: 2, desc: 'Equilibrio entre trazo y guarda.' },
  },
  items: {
    gota_agua: { name: 'Gota de agua',   short: 'Agua',     kind: 'heal',  amount: 55, target: 'ally',  desc: 'Recupera 55 HP.' },
    tubo:      { name: 'Tubo de pintura', short: 'Tubo',    kind: 'mp',   amount: 12, target: 'ally',  desc: 'Recupera 12 MP.' },
    goma_b:    { name: 'Goma de borrar', short: 'Borrar'  , kind: 'erase', amount: 45, target: 'enemy', desc: 'Borra tinta: 45 de daño a Gotas Negras puras.' },
    savia:     { name: 'Savia de color', short: 'Savia', kind: 'revive', amount: .4, target: 'fallen', desc: 'Revive a una gota con el 40% de vida.' },
  },
  inventory: { gota_agua: 4, tubo: 2, goma_b: 2, savia: 2 },
  // Sepia, la marchante de pigmentos: una gota de tinta sepia que recorre las páginas con un fardo de tubos a la espalda.
  // Vende el nivel 2 de cada mezcla a cambio de pigmento.
  merchant: { name: 'Sepia', title: 'Sepia, marchante de pigmentos',
    greet: '¿Pigmento fresco? Te enseño a mezclar a lo grande.', thanks: '¡Buena mezcla! Úsala con cariño.', poor: 'Vuelve con más pigmento, cielo.', owned: 'Esa ya la llevas en la brocha.',
    recipes: { llamarada: 30, brote: 30, eclipse: 38, arcoiris: 48 } },
  studies: {
    veladura: { name: 'Veladura', cost: 18, desc: 'Preparar de Añil moja a todos los enemigos.' },
    relevo: { name: 'Relevo', cost: 22, desc: 'Proteger devuelve 3 MP a la gota protegida.' },
    pulso: { name: 'Pulso fino', cost: 24, desc: 'Una interrupción de Ámbar devuelve 35 ATB.' },
  },

  // ---- Grupo: tres gotas primarias. forma = rol.
  party: [
    { id: 'carmin', name: 'Carmín', color: 'rojo',     shape: 'round',  role: 'Guardia',  hp: 160, mp: 18, atk: 13, def: 11, spd: 7,  weapon: 'brocha', acc: 'goma',       w: 26, h: 24 },
    { id: 'ambar',  name: 'Ámbar',  color: 'amarillo', shape: 'tall',   role: 'Veloz',    hp: 120, mp: 20, atk: 11, def: 7,  spd: 11, weapon: 'lapiz',  acc: 'sacapuntas', w: 18, h: 30 },
    { id: 'anil',   name: 'Añil',   color: 'azul',     shape: 'splash', role: 'Pintora', hp: 110, mp: 30, atk: 9,  def: 7,  spd: 8,  weapon: 'pincel', acc: 'paleta',     w: 28, h: 22 },
  ],

  // ---- Techs. users define si es simple/doble/triple. color decide el multiplicador.
  techs: {
    // techs de herramienta: cada personaje tiene una tech propia con cada arma (user + weapon), siempre de su color
    brochazo:   { name: 'Brochazo',    user: 'carmin', weapon: 'brocha', mp: 4, power: 1.8, target: 'enemy',   desc: 'La brocha cae como un mazo y estampa una Z.' },
    tachon:     { name: 'Tachón',      user: 'carmin', weapon: 'lapiz',  mp: 4, power: 1.5, target: 'enemy',   status: 'lento', desc: 'Clava el lápiz y tacha al enemigo. Lo ralentiza.' },
    manchurron: { name: 'Manchurrón',  user: 'carmin', weapon: 'pincel', mp: 5, power: 1.7, target: 'enemy',   desc: 'Carga el pincel hasta reventar y planta un pegote.' },
    rafaga:     { name: 'Ráfaga',      user: 'ambar',  weapon: 'brocha', mp: 4, power: 0.7, target: 'enemies', desc: 'Cruza la fila de enemigos a brochazos rápidos.' },
    trazo:      { name: 'Trazo doble', user: 'ambar',  weapon: 'lapiz',  mp: 3, power: 0.85, hits: 2, target: 'enemy', desc: 'Dos trazos rapidísimos en X.' },
    punteado:   { name: 'Punteado',    user: 'ambar',  weapon: 'pincel', mp: 4, power: 0.45, hits: 4, target: 'enemy', desc: 'Cuatro toques de pincel a toda velocidad.' },
    aguada:     { name: 'Aguada',      user: 'anil',   weapon: 'brocha', mp: 5, power: 0.9, target: 'enemies', status: 'lento', desc: 'Un baño de color diluido empapa a todos.' },
    contorno:   { name: 'Contorno',    user: 'anil',   weapon: 'lapiz',  mp: 4, power: 0,   target: 'party',   status: 'contorno', desc: 'Perfila a lápiz al grupo: reciben menos daño.' },
    firma:      { name: 'Firma',       user: 'carmin', weapon: 'pluma',  mp: 5, power: 1.6, target: 'enemy',   status: 'firmado', desc: 'Firma al enemigo con floritura: recibe más daño.' },
    taquigrafia:{ name: 'Taquigrafía', user: 'ambar',  weapon: 'pluma',  mp: 4, power: 0.5, hits: 3, target: 'enemies', desc: 'Tres golpes rapidísimos repartidos.' },
    caligrafia: { name: 'Caligrafía',  user: 'anil',   weapon: 'pluma',  mp: 5, power: 0, heal: 0.4, target: 'ally', cure: true, desc: 'Escribe bien el nombre de un aliado: cura y limpia.' },
    salpicon:   { name: 'Salpicón',    user: 'anil',   weapon: 'pincel', mp: 5, power: 1.1, target: 'enemies', desc: 'Salta y salpica a todos los enemigos.' },
    llamarada: { name: 'Llamarada',    users: ['carmin', 'ambar'],         color: 'naranja',  mp: 6, power: 1.5, target: 'enemies', desc: 'Rojo+Amarillo: fuego naranja en área.',
      lv2: { name: 'Fénix', mp: 8, power: 2.1, desc: 'Un fénix de pintura quema la página y cae sobre todos.', rule: 'Daño naranja alto a todos los enemigos.' } },
    brote:     { name: 'Brote',        users: ['ambar', 'anil'],           color: 'verde',    mp: 5, power: 0.7, heal: 0.35, target: 'enemies', desc: 'Amarillo+Azul: brota vida verde. Cura al grupo y daña.',
      lv2: { name: 'Selva', mp: 7, power: 1.0, heal: 0.55, desc: 'Un árbol entero crece en la página: raíces y frutos.', rule: 'Daño verde a todos y cura 55% al grupo.' } },
    eclipse:   { name: 'Eclipse',      users: ['carmin', 'anil'],          color: 'violeta',  mp: 7, power: 3.0, target: 'enemy', status: 'lento', desc: 'Rojo+Azul: violeta que aplasta y ralentiza.',
      lv2: { name: 'Eclipse total', mp: 9, power: 4.2, desc: 'La noche absorbe la tinta del enemigo y lo aplasta.', rule: 'Daño violeta enorme y Lento.' } },
    arcoiris:  { name: 'Arcoíris',     users: ['carmin', 'ambar', 'anil'], color: 'blanco',   mp: 8, power: 2.4, target: 'enemies', desc: 'Todos los colores a la vez. Devastador contra la Tinta.',
      lv2: { name: 'Espectro', mp: 10, power: 3.3, desc: 'Seis ríos de color bajan por un puente de arcoíris.', rule: 'Daño de todos los colores a todos.' } },
  },

  // ---- Enemigos: las Gotas Negras. core = color robado (su debilidad es el complementario).
  enemies: {
    gota_negra: { name: 'Gota Negra', color: 'negro',   shape: 'round',  hp: 60,  atk: 9,  def: 3, spd: 6,  exp: 6,  w: 20, h: 20, ai: 'basic' },
    mancha:     { name: 'Mancha',     color: 'verde',   shape: 'splash', hp: 85,  atk: 11, def: 5, spd: 7,  exp: 10, w: 26, h: 20, ai: 'hunter' },
    borron:     { name: 'Borrón',     color: 'violeta', shape: 'tall',   hp: 75,  atk: 12, def: 4, spd: 9,  exp: 10, w: 16, h: 28, ai: 'tiznar' },
    charco:     { name: 'Charco',     color: 'naranja', shape: 'blob',   hp: 120, atk: 10, def: 8, spd: 4,  exp: 14, w: 32, h: 18, ai: 'basic' },
    grumo:      { name: 'Grumo',      color: 'azul',    shape: 'round',  hp: 95,  atk: 12, def: 6, spd: 6,  exp: 12, w: 22, h: 22, ai: 'hunter' },
    tinta:      { name: 'La Tinta',   color: 'negro',   shape: 'blob',   hp: 520, atk: 15, def: 7, spd: 7,  exp: 60, w: 48, h: 40, ai: 'boss', boss: true },
  },

  // ---- Encuentros visibles en el mapa (clave = carácter en el mapa)
  encounters: {
    '1': ['gota_negra', 'gota_negra'],
    '2': ['mancha', 'gota_negra'],
    '3': ['borron', 'borron'],
    '4': ['charco', 'mancha'],
    '5': ['grumo', 'borron', 'gota_negra'],
    '6': ['charco', 'grumo'],
    'B': ['tinta', 'gota_negra', 'gota_negra'],
  },

  // ---- Mapa de Chromara (40×30, tiles de 16px)
  // . hierba  , hierba tiznada  ~ agua  = camino  T seto de lápices y pinceles  r goma  x mancha de tinta  P inicio  V vaso de agua (2×2)  S cartel  M Sepia  f pliegue a la otra hoja
  // Magias: H garabato (Borrar)  p chincheta (Trazar: pareja en línea)  g/o/v boceto verde/naranja/violeta (Colorear)  N charco de Tinta (Aguada)  R/Q tinta  E estuche de la Pluma  e cofre  1-6 B encuentros
  map: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTT.....................~~......R......T',
    'T.........TT....TT....r.~~.TT...R.x....T',
    'T...r...................~~......R....x.T',
    'T.......................~~......R...B..T',
    'T.....3.................~~....NNv......T',
    'T...........============gg====NNv.x....T',
    'T...........=...........~~......R......T',
    'T...........=...........~~...r..R..x...T',
    'T..~~~~~....=...........~~......R.....xT',
    'T..~~e~~....=.....4.....~~..5.TTR......T',
    'T..~~o~~....=.......TT..~~......Rx.6...T',
    'TT..........=..T........~~T..N..R....x.T',
    'T...........p...........~~..NeN.R......T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~TTTTTTTTTTTTTT',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~TTTTTTTTTTTTTT',
    'T..........Tp..............TRR.........T',
    'T.TT.....TTT=..............TRR......NE.T',
    'T..........T=.S.......2....TRR......NNNT',
    'T......V...T=......TT......TRR.........T',
    'T..........T=..............TRRQQQQgQQQQT',
    'T.......r..T=............S.TRR.........T',
    'T..........H===============TRR.........T',
    'T...P......H..............=pRRp........T',
    'T.....S....T.......r.......TRR.........T',
    'T..........T....1......TT..TRR.........T',
    'TT.......M.T...............TRR.........T',
    'T.f........T...TT........H.TRR.........T',
    'T........TTT......T.....HeHTRR.........T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],

  signs: {
    '6,24': ['Refugio Carmín', 'C abre las magias de campo:', 'mira hacia algo y úsala.', 'Lo que es lápiz, se borra.'],
    '14,18': ['Río de Añil', 'Dos chinchetas, una en cada orilla.', 'Una línea entre ellas', 'se puede cruzar.'],
    '25,21': ['Atelier de las tres tintas', 'Rodeado de tinta. Dentro', 'guardan algo que escribe solo.'],
  },
  // Cofres del mapa: lo que guarda cada uno (el estuche E es la Pluma).
  chests: { '5,10': { item: 'gota_agua', n: 2 }, '25,28': { item: 'tubo', n: 1 }, '29,13': { item: 'savia', n: 1 } },
  // ---- Magias de campo: las herramientas del pintor actúan sobre la página. Se lanzan hacia donde mira el líder, sobre lo
  // primero que haya delante; gastan pintura (MP), que vuelve al caminar.
  fieldArts: [
    { id: 'rojo', kind: 'color', name: 'Colorear rojo', users: ['carmin'], color: 'rojo', tool: 'brocha', mp: 1, desc: 'Pinta de rojo lo que tienes delante. Un boceto con su color se vuelve real.' },
    { id: 'amarillo', kind: 'color', name: 'Colorear amarillo', users: ['ambar'], color: 'amarillo', tool: 'lapiz', mp: 1, desc: 'Pinta de amarillo. Sobre otro color, se mezclan en el propio objeto.' },
    { id: 'azul', kind: 'color', name: 'Colorear azul', users: ['anil'], color: 'azul', tool: 'pincel', mp: 1, desc: 'Pinta de azul. Amarillo y azul dan verde; rojo y azul, violeta.' },
    { id: 'trazar', kind: 'trazar', name: 'Trazar', users: ['ambar'], color: 'amarillo', tool: 'lapiz', mp: 2, desc: 'Dibuja una línea de grafito entre dos chinchetas: se puede cruzar.' },
    { id: 'borrar', kind: 'borrar', name: 'Borrar', users: ['carmin'], color: 'rojo', tool: 'goma', mp: 1, desc: 'La goma borra lo dibujado a lápiz y el color mal puesto.' },
    { id: 'aguada', kind: 'aguada', name: 'Aguada', users: ['anil'], color: 'azul', tool: 'pincel', mp: 2, desc: 'El agua diluye la Tinta: los charcos negros se aclaran y se escurren.' },
  ],
  puzzle: {
    things: {
      scribble: { name: 'Garabato de lápiz', hint: 'Un garabato tapa el paso. Es grafito: se puede borrar.', done: 'El garabato desaparece en virutas.' },
      pin: { name: 'Chincheta', hint: 'Hay otra chincheta al otro lado. Una línea entre las dos...', done: 'La línea de grafito cruza el río.' },
      line: { name: 'Línea de grafito', hint: 'Es tu propia línea. Sostiene tu peso.' },
      sketch: { name: 'Puente en boceto', need: 'verde', hint: 'Es sólo un boceto: no aguanta nada. En el margen pone «verde».', done: 'El boceto toma color y se vuelve un puente de hojas.' },
      pit: { name: 'Canal de tinta', hint: 'Demasiado ancho para saltar.' },
      puddle: { name: 'Charco de Tinta', hint: 'Tinta espesa. La pintura no agarra; el agua sí la diluye.', done: 'El agua diluye la tinta y se escurre por el papel.' },
      chest: { name: 'Estuche' },
    },
  },
  // ---- Diálogo previo a la jefa (who: tinta | carmin | ambar | anil)
  bossDialogue: [
    { who: 'tinta', text: 'Otra vez color en mi página.' },
    { who: 'tinta', text: 'Yo tracé cada línea de Chromara antes de que nadie pintara nada. Cuando llegasteis, nadie volvió a mirar el contorno.' },
    { who: 'carmin', text: 'El contorno sigue ahí. Debajo de todo.' },
    { who: 'tinta', text: 'Debajo. Exacto. Pues hoy la página vuelve al boceto. Bebed.' },
    { who: 'anil', text: 'Un dibujo terminado tiene las dos cosas: la línea y el color.' },
    { who: 'tinta', text: 'Demostradlo.' },
  ],
  texts: {
    intro: ['Chromara pierde sus colores.', 'Las Gotas Negras beben el pigmento', 'de todo lo que tocan.', '', 'Tres gotas primarias salen a', 'devolver el color al mundo.'],
    ending: ['La Tinta se disuelve.', '', 'Chromara recupera su color.', '', 'Pero la tinta atraviesa el papel.', 'El pliegue del jardín conduce', 'al territorio de Los Negros.'],
    gameover: ['Los colores se apagan...', '', 'Pulsa una tecla para volver a intentarlo.'],
  },
};
// sanity: mapa rectangular
for (const row of DATA.map) if (row.length !== DATA.map[0].length) throw new Error('Fila de mapa con ancho distinto: ' + row);
