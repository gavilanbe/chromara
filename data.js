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
    brocha: { name: 'Brocha',  atk: 6, spd: -1, desc: 'Brocha gorda. Trazos contundentes.' },
    lapiz:  { name: 'Lápiz',   atk: 4, spd: 2,  desc: 'Lápiz afilado. Rápido y preciso.' },
    pincel: { name: 'Pincel',  atk: 3, mp: 6,   desc: 'Pincel fino. Canaliza más pigmento.' },
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
  },
  inventory: { gota_agua: 4, tubo: 2, goma_b: 2 },

  // ---- Grupo: tres gotas primarias. forma = rol.
  party: [
    { id: 'carmin', name: 'Carmín', color: 'rojo',     shape: 'round',  role: 'Guardia',  hp: 160, mp: 18, atk: 13, def: 11, spd: 7,  weapon: 'brocha', acc: 'goma',       w: 26, h: 24 },
    { id: 'ambar',  name: 'Ámbar',  color: 'amarillo', shape: 'tall',   role: 'Veloz',    hp: 120, mp: 20, atk: 11, def: 7,  spd: 11, weapon: 'lapiz',  acc: 'sacapuntas', w: 18, h: 30 },
    { id: 'anil',   name: 'Añil',   color: 'azul',     shape: 'splash', role: 'Pintora', hp: 110, mp: 30, atk: 9,  def: 7,  spd: 8,  weapon: 'pincel', acc: 'paleta',     w: 28, h: 22 },
  ],

  // ---- Techs. users define si es simple/doble/triple. color decide el multiplicador.
  techs: {
    brochazo:  { name: 'Brochazo',     users: ['carmin'],                  color: 'rojo',     mp: 4, power: 1.8, target: 'enemy',  desc: 'Trazo rojo brutal a un enemigo.' },
    trazo:     { name: 'Trazo doble',  users: ['ambar'],                   color: 'amarillo', mp: 3, power: 0.85, hits: 2, target: 'enemy', desc: 'Dos trazos amarillos rapidísimos.' },
    salpicon:  { name: 'Salpicón',     users: ['anil'],                    color: 'azul',     mp: 5, power: 1.1, target: 'enemies', desc: 'Salpica azul a todos los enemigos.' },
    llamarada: { name: 'Llamarada',    users: ['carmin', 'ambar'],         color: 'naranja',  mp: 6, power: 1.5, target: 'enemies', desc: 'Rojo+Amarillo: fuego naranja en área.' },
    brote:     { name: 'Brote',        users: ['ambar', 'anil'],           color: 'verde',    mp: 5, power: 0.7, heal: 0.35, target: 'enemies', desc: 'Amarillo+Azul: brota vida verde. Cura al grupo y daña.' },
    eclipse:   { name: 'Eclipse',      users: ['carmin', 'anil'],          color: 'violeta',  mp: 7, power: 3.0, target: 'enemy', status: 'lento', desc: 'Rojo+Azul: violeta que aplasta y ralentiza.' },
    arcoiris:  { name: 'Arcoíris',     users: ['carmin', 'ambar', 'anil'], color: 'blanco',   mp: 8, power: 2.4, target: 'enemies', desc: 'Todos los colores a la vez. Devastador contra la Tinta.' },
  },

  // ---- Enemigos: las Gotas Negras. core = color robado (su debilidad es el complementario).
  enemies: {
    gota_negra: { name: 'Gota Negra', color: 'negro',   shape: 'round',  hp: 60,  atk: 9,  def: 3, spd: 6,  exp: 6,  w: 20, h: 20, ai: 'basic' },
    mancha:     { name: 'Mancha',     color: 'verde',   shape: 'splash', hp: 85,  atk: 11, def: 5, spd: 7,  exp: 10, w: 26, h: 20, ai: 'hunter' },
    borron:     { name: 'Borrón',     color: 'violeta', shape: 'tall',   hp: 75,  atk: 12, def: 4, spd: 9,  exp: 10, w: 16, h: 28, ai: 'tiznar' },
    charco:     { name: 'Charco',     color: 'naranja', shape: 'blob',   hp: 120, atk: 10, def: 8, spd: 4,  exp: 14, w: 32, h: 18, ai: 'basic' },
    grumo:      { name: 'Grumo',      color: 'azul',    shape: 'round',  hp: 95,  atk: 12, def: 6, spd: 6,  exp: 12, w: 22, h: 22, ai: 'hunter' },
    tinta:      { name: 'La Tinta',   color: 'negro',   shape: 'blob',   hp: 320, atk: 14, def: 7, spd: 7,  exp: 60, w: 48, h: 40, ai: 'boss', boss: true },
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
  // . hierba  , hierba tiznada  ~ agua  = camino/puente  T árbol  r roca  x mancha decorativa  P inicio  1-6 encuentros  B jefe
  map: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T........TT.............T...,,,,,,,,,,,T',
    'T.........T......3......T..,,,,,,,B,,,,T',
    'T....T....T.............TT.,,,,,,,,,,,,T',
    'T....T.....==============.,,,,,,x,,,,,,T',
    'T....T.....=......TTTTTT..,,,x,,,,,,,,,T',
    'T....T.....=......T~~~~T...,,,,,,,,,,,,T',
    'T.....2....=......T~~~~T.....,,,5,,,,..T',
    'T..........=......T~~~~TT..............T',
    'T....~~~...=.......~~~~~TTT............T',
    'T...~~~~~..=......~~~~~~..TTT.....4....T',
    'T...~~~~~..=.....~~~~~~........TT......T',
    'T....~~~...=....~~~~~.....T....TT......T',
    'T..........=...~~~~..........TT........T',
    'T...1......=...~~~~....r...............T',
    'T..........=====~~~~======.....x.......T',
    'T........T.....~~~~.....=..............T',
    'T.......TT......~~~~....=...T.....6....T',
    'T......TT........~~~~...=..TT..........T',
    'T.....TT..........~~~~..=..T...........T',
    'T.....T............~~~~.=..............T',
    'T..P..T.............~~~~=.....r........T',
    'T.....T..............~~~=~.............T',
    'T.....T...............~~=~~............T',
    'T.....TT...............~=~~~...........T',
    'T......TT..............~=~~~~..........T',
    'T.......TTT...........~~=~~~~~.........T',
    'T.........TT.........~~~=~~~~~~........T',
    'T..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],

  texts: {
    intro: ['Chromara pierde sus colores.', 'Las Gotas Negras beben el pigmento', 'de todo lo que tocan.', '', 'Tres gotas primarias salen a', 'devolver el color al mundo.'],
    ending: ['La Tinta se disuelve.', '', 'Chromara recupera su color.', '', 'Gracias por jugar la PoC.'],
    gameover: ['Los colores se apagan...', '', 'Pulsa una tecla para volver a intentarlo.'],
  },
};
// sanity: mapa rectangular
for (const row of DATA.map) if (row.length !== DATA.map[0].length) throw new Error('Fila de mapa con ancho distinto: ' + row);
