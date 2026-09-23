// CHROMARA — sprites.js: personajes dibujados a mano en píxeles (matrices de caracteres) con rampa por color.
// Leyenda común: . transparente · O contorno · D oscuro · S sombra · B base · H luz · W brillo · K pupila · w blanco de ojo
// Extras por sprite: letras minúsculas/otras en `pal` (colores fijos).
'use strict';
const SPRITES = {
  // ---- Carmín: gota gorda y baja con boina de pintor y ceño decidido
  carmin_back: { pal: { b: '#3a2440', c: '#5a3a62', d: '#241428' }, rows: [
    '.............dd.............',
    '..........dbbccbbd..........',
    '........dbbcccccbbbd........',
    '.......dbccccccbbbbbd.......',
    '......dbbbbbbbbbbbbbbd......',
    '.......ddddddddddddd........',
    '.......OOHHHHBBBBBOO........',
    '......OHHHHBBBBBBBBSO.......',
    '.....OHHHBBBBBBBBBBSSO......',
    '....OHHBBBBBBBBBBBBSSSO.....',
    '....OHBBBBBBBBBBBBBSSSO.....',
    '...OHBBBBBBBBBBBBBBSSSDO....',
    '...OBBBBBBBBBBBBBBBSSSDO....',
    '...OBBBBBBBBBBBBBBSSSDDO....',
    '...OSBBBBBBBBBBBBBSSSDDO....',
    '...OSBBBBBBBBBBBBSSSDDDO....',
    '....OSBBBBBBBBBBSSSDDDO.....',
    '....OSSBBBBBBBBSSSDDDDO.....',
    '.....ODSSSSSSSSSDDDDDO......',
    '......OODDDDDDDDDDDOO.......',
    '........OOOOOOOOOOO.........',
  ], eyes: [[5, 11]], eyeKind: 'side' },
  carmin_side: { pal: { b: '#3a2440', c: '#5a3a62', d: '#241428' }, rows: [
    '........dddd................',
    '.....ddbbccccbd.............',
    '...dbbccccccccbbd...........',
    '..dbbbbbbbbbbbbbbbd.........',
    '..ddddddddddddddddd.........',
    '....OOHHHBBBBBBBOO..........',
    '...OHHHBBBBBBBBBBSO.........',
    '..OHHBBBBBBBBBBBBSSO........',
    '..OHBBBBBBBBBBBBBSSSO.......',
    '.OHBBBBBBBBBBBBBBSSSDO......',
    '.OBBBBBBBBBBBBBBBBSSDO......',
    '.OBBBBBBBBBBBBBBBSSSDO......',
    '.OBBBBBBBBBBBBBBBSSSDO......',
    '.OSBBBBBBBBBBBBBSSSDDO......',
    '..OSBBBBBBBBBBBBSSSDDO......',
    '..OSSBBBBBBBBBBSSSDDO.......',
    '...ODSSSSSSSSSSDDDDO........',
    '....OODDDDDDDDDDDOO.........',
    '......OOOOOOOOOOO...........',
  ], eyes: [[4, 9], [10, 9]], eyeKind: 'front', brow: 'angry' },
  carmin_front: { pal: { b: '#3a2440', c: '#5a3a62', d: '#241428' }, rows: [
    '..........dddd..............',
    '.......ddbbccccbbdd.........',
    '.....dbbccccccccccbbd.......',
    '....dbbbbbbbbbbbbbbbbd......',
    '....dddddddddddddddddd......',
    '.......OOHHHBBBBBOO.........',
    '......OHHHBBBBBBBBSO........',
    '.....OHHBBBBBBBBBBBSO.......',
    '....OHHBBBBBBBBBBBBSSO......',
    '....OHBBBBBBBBBBBBBSSO......',
    '...OHBBBBBBBBBBBBBBSSDO.....',
    '...OBBBBBBBBBBBBBBBSSDO.....',
    '...OBBBBBBBBBBBBBBBSSDO.....',
    '...OSBBBBBBBBBBBBBSSDDO.....',
    '...OSBBBBBBBBBBBBSSSDDO.....',
    '....OSBBBBBBBBBBSSSDDO......',
    '....OSSBBBBBBBBSSSDDDO......',
    '.....ODSSSSSSSSSDDDDO.......',
    '......OODDDDDDDDDOO.........',
    '........OOOOOOOOO...........',
  ], eyes: [[8, 10], [15, 10]], eyeKind: 'front', brow: 'angry' },
  // ---- Ámbar: gota afilada como punta de lápiz recién sacada, con la mina oscura arriba
  ambar_back: { pal: { m: '#2a2438', n: '#5a4a3a', o: '#e8cf9a' }, rows: [
    '..........m.........',
    '..........mm........',
    '.........mmo........',
    '.........moo........',
    '........Oooo........',
    '........OHHOO.......',
    '.......OHHHBBO......',
    '.......OHHBBBBO.....',
    '......OHHBBBBBSO....',
    '......OHBBBBBBSO....',
    '.....OHBBBBBBBSSO...',
    '.....OHBBBBBBBSSO...',
    '.....OBBBBBBBBSSDO..',
    '....OBBBBBBBBBSSDO..',
    '....OBBBBBBBBSSSDO..',
    '....OBBBBBBBBSSSDO..',
    '....OSBBBBBBBSSDDO..',
    '....OSBBBBBBSSSDDO..',
    '.....OSBBBBBSSDDO...',
    '.....OSSBBBSSSDDO...',
    '......ODSSSSSDDO....',
    '.......OODDDDOO.....',
    '.........OOOO.......',
  ], eyes: [[6, 12]], eyeKind: 'side' },
  ambar_side: { pal: { m: '#2a2438', n: '#5a4a3a', o: '#e8cf9a' }, rows: [
    '.......m............',
    '......mm............',
    '......mo............',
    '.....moo............',
    '.....Oooo...........',
    '.....OHHOO..........',
    '....OHHHBBO.........',
    '....OHHBBBBO........',
    '...OHHBBBBBSO.......',
    '...OHBBBBBBBSO......',
    '..OHBBBBBBBBSSO.....',
    '..OHBBBBBBBBSSO.....',
    '..OBBBBBBBBBSSDO....',
    '..OBBBBBBBBBSSDO....',
    '..OBBBBBBBBSSSDO....',
    '..OBBBBBBBBSSSDO....',
    '..OSBBBBBBBSSDDO....',
    '..OSBBBBBBSSSDDO....',
    '...OSBBBBBSSDDO.....',
    '...OSSBBBSSSDDO.....',
    '....ODSSSSSDDO......',
    '.....OODDDDOO.......',
    '.......OOOO.........',
  ], eyes: [[4, 12], [9, 12]], eyeKind: 'front', brow: 'sharp' },
  ambar_front: { pal: { m: '#2a2438', n: '#5a4a3a', o: '#e8cf9a' }, rows: [
    '.........m..........',
    '.........mm.........',
    '........moo.........',
    '........Oooo........',
    '........OHHOO.......',
    '.......OHHHBBO......',
    '.......OHHBBBBO.....',
    '......OHHBBBBBSO....',
    '......OHBBBBBBSO....',
    '.....OHBBBBBBBSSO...',
    '.....OHBBBBBBBSSO...',
    '.....OBBBBBBBBSSDO..',
    '....OBBBBBBBBBSSDO..',
    '....OBBBBBBBBSSSDO..',
    '....OBBBBBBBBSSSDO..',
    '....OSBBBBBBBSSDDO..',
    '....OSBBBBBBSSSDDO..',
    '.....OSBBBBBSSDDO...',
    '.....OSSBBBSSSDDO...',
    '......ODSSSSSDDO....',
    '.......OODDDDOO.....',
    '.........OOOO.......',
  ], eyes: [[7, 12], [12, 12]], eyeKind: 'front', brow: 'sharp' },
  // ---- Añil: salpicadura ancha y baja con cresta ondulada (sus gotitas satélite se dibujan aparte)
  anil_back: { pal: {}, rows: [
    '.......OO.........OO............',
    '......OHHO...OO..OHHO...........',
    '.....OHHHBO.OHHOOHBBBO..........',
    '....OHHHBBBOHHBBBBBBSSO.........',
    '...OHHHBBBBBBBBBBBBBSSSO........',
    '..OHHBBBBBBBBBBBBBBBBSSSO.......',
    '.OHHBBBBBBBBBBBBBBBBBSSSSO......',
    'OHBBBBBBBBBBBBBBBBBBBBSSSDO.....',
    'OBBBBBBBBBBBBBBBBBBBBBSSSDDO....',
    'OBBBBBBBBBBBBBBBBBBBBSSSSDDO....',
    'OSBBBBBBBBBBBBBBBBBBSSSSDDDO....',
    '.OSSBBBBBBBBBBBBBBBSSSSDDDO.....',
    '..OSSSBBBBBBBBBBBSSSSSDDDO......',
    '...OODSSSSSSSSSSSSSDDDDOO.......',
    '.....OOODDDDDDDDDDDOOO..........',
    '........OOOOOOOOOOO.............',
  ], eyes: [[5, 8]], eyeKind: 'side' },
  anil_side: { pal: {}, rows: [
    '.....OO..........OO.............',
    '....OHHO..OO....OHHO............',
    '...OHHBBOOHHO..OHBBO............',
    '..OHHBBBBHHBBOOBBBBSO...........',
    '.OHHBBBBBBBBBBBBBBBSSO..........',
    'OHHBBBBBBBBBBBBBBBBBSSO.........',
    'OHBBBBBBBBBBBBBBBBBBSSSO........',
    'OBBBBBBBBBBBBBBBBBBBBSSDO.......',
    'OBBBBBBBBBBBBBBBBBBBBSSDDO......',
    'OSBBBBBBBBBBBBBBBBBBSSSDDO......',
    '.OSSBBBBBBBBBBBBBBBSSSDDDO......',
    '..OSSSBBBBBBBBBBBBSSSSDDO.......',
    '...OODSSSSSSSSSSSSSDDDDO........',
    '.....OOODDDDDDDDDDDOOO..........',
    '........OOOOOOOOOO..............',
  ], eyes: [[4, 7], [10, 7]], eyeKind: 'front', brow: 'calm' },
  anil_front: { pal: {}, rows: [
    '.......OO.........OO............',
    '......OHHO...OO..OHHO...........',
    '.....OHHHBO.OHHOOHBBBO..........',
    '....OHHHBBBOHHBBBBBBSSO.........',
    '...OHHHBBBBBBBBBBBBBSSSO........',
    '..OHHBBBBBBBBBBBBBBBBSSSO.......',
    '.OHHBBBBBBBBBBBBBBBBBSSSSO......',
    'OHBBBBBBBBBBBBBBBBBBBBSSSDO.....',
    'OBBBBBBBBBBBBBBBBBBBBBSSSDDO....',
    'OBBBBBBBBBBBBBBBBBBBBSSSSDDO....',
    'OSBBBBBBBBBBBBBBBBBBSSSSDDDO....',
    '.OSSBBBBBBBBBBBBBBBSSSSDDDO.....',
    '..OSSSBBBBBBBBBBBSSSSSDDDO......',
    '...OODSSSSSSSSSSSSSDDDDOO.......',
    '.....OOODDDDDDDDDDDOOO..........',
    '........OOOOOOOOOOO.............',
  ], eyes: [[8, 8], [16, 8]], eyeKind: 'front', brow: 'calm' },
  // ---- Gotas Negras (frente tres cuartos, miran al grupo). 'c' = núcleo (color robado), 'C' su brillo
  gota_negra: { pal: {}, rows: [
    '........OOOO........',
    '......OOHHHSOO......',
    '.....OHHHBBSSSO.....',
    '....OHHBBBBBSSSO....',
    '...OHHBBBBBBSSSSO...',
    '...OHBBBBBBBBSSSO...',
    '..OHBBBBBBBBBSSSSO..',
    '..OBBBBBBBBBBBSSSO..',
    '..OBBBBBBBBBBBSSSO..',
    '..OBBBBBBBBBBSSSSO..',
    '..OSBBBBBBBBBSSSSO..',
    '...OSBBBBBBBSSSSO...',
    '...OSSBBBBBSSSSSO...',
    '....OSSSSSSSSSSO....',
    '.....OOSSSSSSOO.....',
    '.......OOOOOO.......',
  ], eyes: [[6, 8], [12, 8]], eyeKind: 'ink' },
  mancha: { pal: {}, rows: [
    '....OO..........OO........',
    '...OHHO...OO...OHSO.......',
    '..OHHBBO.OHHO.OBBSSO......',
    '..OHBBBBOHHBBOBBBSSSO.....',
    '.OHBBBBBBBBBBBBBBSSSSO....',
    '.OHBBBBBBBcccBBBBSSSSO....',
    'OHBBBBBBBcCCccBBBBSSSSO...',
    'OBBBBBBBBcCcccBBBBSSSSSO..',
    'OBBBBBBBBBccccBBBBBSSSSO..',
    'OSBBBBBBBBBccBBBBBSSSSSO..',
    '.OSBBBBBBBBBBBBBBSSSSSO...',
    '..OSSBBBBBBBBBBBSSSSSO....',
    '...OOSSSSSSSSSSSSSSOO.....',
    '.....OOOOOOOOOOOOOO.......',
  ], eyes: [[7, 4], [13, 4]], eyeKind: 'ink' },
  borron: { pal: {}, rows: [
    '.....OOO....',
    '....OHHSO...',
    '...OHHBSSO..',
    '...OHBBSSO..',
    '..OHBBBSSSO.',
    '..OHBBBBSSO.',
    '..OBBcccSSO.',
    '..OBBcCcSSO.',
    '..OBBcccSSO.',
    '..OBBBBBSSO.',
    '..OBBBBBSSO.',
    '..OSBBBSSSO.',
    '...OSBBSSO..',
    '...OSSSSSO..',
    '...OSSSSSO..',
    '..OSSSSSSSO.',
    '..OSSSSSSSO.',
    '...OOOOOOO..',
  ], eyes: [[4, 4], [8, 4]], eyeKind: 'ink' },
  charco: { pal: {}, rows: [
    '..........OOOOO.................',
    '.......OOOHHHBBOOO..............',
    '....OOOHHHBBBBBBBSOOO...........',
    '..OOHHBBBBBBcccBBBBSSOO.........',
    '.OHHBBBBBBBcCCccBBBBSSSO........',
    'OHBBBBBBBBBcccccBBBBBSSSOO......',
    'OBBBBBBBBBBBcccBBBBBBSSSSSO.....',
    'OSBBBBBBBBBBBBBBBBBBBSSSSSSO....',
    '.OSSBBBBBBBBBBBBBBBBSSSSSSSO....',
    '..OOSSSSSSSSSSSSSSSSSSSSSOO.....',
    '....OOOOOOOOOOOOOOOOOOOOO.......',
  ], eyes: [[6, 5], [17, 5]], eyeKind: 'ink' },
  grumo: { pal: {}, rows: [
    '.......OOO...OO.......',
    '.....OOHHSOOOHSO......',
    '....OHHBBBSSBBSSO.....',
    '...OHHBBBBBBBBSSSO....',
    '..OHHBBBBBBBBBSSSSO...',
    '..OHBBBBBcccBBBSSSO...',
    '.OHBBBBBcCCccBBBSSSO..',
    '.OBBBBBBcCcccBBBSSSSO.',
    '.OBBBBBBBccccBBBSSSSO.',
    '.OBBBBBBBBccBBBBSSSSO.',
    '.OSBBBBBBBBBBBBSSSSSO.',
    '..OSBBBBBBBBBBSSSSSO..',
    '..OSSBBBBBBBBSSSSSSO..',
    '...OSSSSSSSSSSSSSSO...',
    '....OOSSSSSSSSSSOO....',
    '......OOOOOOOOOO......',
  ], eyes: [[7, 4], [14, 4]], eyeKind: 'ink' },
  tinta: { pal: {}, rows: [
    '....................OOOOOO....................',
    '.................OOOHHHHHSSOOO................',
    '..............OOOHHHHHBBBBSSSSOOO.............',
    '............OOHHHHBBBBBBBBBSSSSSSOO...........',
    '..........OOHHHBBBBBBBBBBBBBSSSSSSSOO.........',
    '.........OHHHBBBBBBBBBBBBBBBBSSSSSSSSO........',
    '........OHHBBBBBBBBBBBBBBBBBBBSSSSSSSSO.......',
    '.......OHHBBBBBBBBBBBBBBBBBBBBBSSSSSSSSO......',
    '......OHHBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO.....',
    '.....OHBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO....',
    '.....OHBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO....',
    '....OHBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO...',
    '....OBBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO...',
    '....OBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSO...',
    '...OBBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSO..',
    '...OBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSO..',
    '...OSBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSSO..',
    '...OSBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSSSO..',
    '...OSSBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSSSSO..',
    '....OSSBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSSSSSO...',
    '....OSSSBBBBBBBBBBBBBBBBSSSSSSSSSSSSSSSSSSO...',
    '.....OSSSSBBBBBBBBBBBBSSSSSSSSSSSSSSSSSSSO....',
    '.....OOSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSOO....',
    '......OOSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSOO.....',
    '.......OOOSSSSSSSSSSSSSSSSSSSSSSSSSSOOO.......',
    '.........OOOOSSSSSSSSSSSSSSSSSSSOOOO..........',
    '............OOOOOOOOOOOOOOOOOOOO..............',
    '..........OO.....OO.......OO....OO............',
    '..........OO.....OO.......OO....OO............',
    '..........O......O........OO....O.............',
  ], eyes: [[14, 12], [30, 12]], eyeKind: 'ink', big: true },
};

// ---- Versiones mini para el mapa (dibujadas a mano, coherentes con las grandes)
Object.assign(SPRITES, {
  carmin_back_mini: { mini: true, pal: { b: '#3a2440', c: '#5a3a62', d: '#241428' }, rows: [
    '.....dddd....',
    '...dbccccbd..',
    '..dbbbbbbbbd.',
    '...ddddddddd.',
    '...OOHHBBOO..',
    '..OHHBBBBBSO.',
    '.OHBBBBBBBSSO',
    '.OBBBBBBBSSDO',
    '.OBBBBBBBSSDO',
    '.OSBBBBBSSDDO',
    '..OSBBBSSDDO.',
    '...OODDDDOO..',
    '.....OOOO....',
  ], eyes: [[2, 8]], eyeKind: 'side' },
  carmin_side_mini: { mini: true, pal: { b: '#3a2440', c: '#5a3a62', d: '#241428' }, rows: [
    '...dddd......',
    '.dbcccbbd....',
    'dbbbbbbbbbd..',
    'dddddddddd...',
    '.OOHHBBBOO...',
    'OHHBBBBBBSO..',
    'OHBBBBBBBSSO.',
    'OBBBBBBBBSSO.',
    'OBBBBBBBSSDO.',
    'OSBBBBBSSDDO.',
    '.OSBBBSSDDO..',
    '..OODDDDOO...',
    '....OOOO.....',
  ], eyes: [[2, 7], [5, 7]], eyeKind: 'front', brow: 'angry' },
  carmin_front_mini: { mini: true, pal: { b: '#3a2440', c: '#5a3a62', d: '#241428' }, rows: [
    '....dddd.....',
    '..dbbccccbd..',
    '.dbbbbbbbbbd.',
    '.ddddddddddd.',
    '...OOHHBBOO..',
    '..OHHBBBBBSO.',
    '.OHBBBBBBBSSO',
    '.OBBBBBBBSSDO',
    '.OBBBBBBBSSDO',
    '.OSBBBBBSSDDO',
    '..OSBBBSSDDO.',
    '...OODDDDOO..',
    '.....OOOO....',
  ], eyes: [[4, 7], [8, 7]], eyeKind: 'front', brow: 'angry' },
  ambar_back_mini: { mini: true, pal: { m: '#2a2438', o: '#e8cf9a' }, rows: [
    '....m...',
    '....mo..',
    '...Ooo..',
    '...OHHO.',
    '..OHHBBO',
    '..OHBBSO',
    '.OHBBBSO',
    '.OBBBBSO',
    '.OBBBSDO',
    '.OBBBSDO',
    '.OSBBSDO',
    '..OSSDO.',
    '...OOO..',
  ], eyes: [[2, 8]], eyeKind: 'side' },
  ambar_side_mini: { mini: true, pal: { m: '#2a2438', o: '#e8cf9a' }, rows: [
    '...m....',
    '..mo....',
    '..Ooo...',
    '..OHHO..',
    '.OHHBBO.',
    '.OHBBSO.',
    'OHBBBSO.',
    'OBBBBSO.',
    'OBBBSDO.',
    'OBBBSDO.',
    'OSBBSDO.',
    '.OSSDO..',
    '..OOO...',
  ], eyes: [[1, 8], [4, 8]], eyeKind: 'front', brow: 'sharp' },
  ambar_front_mini: { mini: true, pal: { m: '#2a2438', o: '#e8cf9a' }, rows: [
    '...m....',
    '...mo...',
    '..Ooo...',
    '..OHHO..',
    '.OHHBBO.',
    '.OHBBSO.',
    'OHBBBSO.',
    'OBBBBSO.',
    'OBBBSDO.',
    'OBBBSDO.',
    'OSBBSDO.',
    '.OSSDO..',
    '..OOO...',
  ], eyes: [[1, 8], [4, 8]], eyeKind: 'front', brow: 'sharp' },
  anil_back_mini: { mini: true, pal: {}, rows: [
    '...OO....OO.....',
    '..OHHO..OHHO....',
    '.OHBBBOOHBBSO...',
    'OHBBBBBBBBBSSO..',
    'OBBBBBBBBBBSSDO.',
    'OSBBBBBBBBSSDDO.',
    '.OSSBBBBBSSDDO..',
    '..OOSSSSSDDOO...',
    '....OOOOOOO.....',
  ], eyes: [[2, 5]], eyeKind: 'side' },
  anil_side_mini: { mini: true, pal: {}, rows: [
    '..OO....OO......',
    '.OHHO..OHHO.....',
    'OHBBBOOHBBSO....',
    'OHBBBBBBBBSSO...',
    'OBBBBBBBBBSSDO..',
    'OSBBBBBBBSSDDO..',
    '.OSSBBBBSSDDO...',
    '..OOSSSSDDOO....',
    '....OOOOOO......',
  ], eyes: [[2, 5], [6, 5]], eyeKind: 'front', brow: 'calm' },
  anil_front_mini: { mini: true, pal: {}, rows: [
    '...OO....OO.....',
    '..OHHO..OHHO....',
    '.OHBBBOOHBBSO...',
    'OHBBBBBBBBBSSO..',
    'OBBBBBBBBBBSSDO.',
    'OSBBBBBBBBSSDDO.',
    '.OSSBBBBBSSDDO..',
    '..OOSSSSSDDOO...',
    '....OOOOOOO.....',
  ], eyes: [[4, 5], [9, 5]], eyeKind: 'front', brow: 'calm' },
  gota_negra_mini: { mini: true, pal: {}, rows: [
    '...OOOO...',
    '..OHHSSO..',
    '.OHBBBSSO.',
    '.OBBBBSSSO',
    '.OBBBBSSSO',
    '.OSBBBSSSO',
    '..OSSSSSO.',
    '...OOOOO..',
  ], eyes: [[3, 4], [6, 4]], eyeKind: 'ink' },
  mancha_mini: { mini: true, pal: {}, rows: [
    '..OO....OO....',
    '.OHBO..OHSO...',
    'OHBBBOOBBSSO..',
    'OBBBBcccBBSSO.',
    'OBBBBcCcBBSSSO',
    'OSBBBBcBBSSSSO',
    '.OSSBBBBSSSSO.',
    '..OOOOOOOOOO..',
  ], eyes: [[3, 3], [9, 3]], eyeKind: 'ink' },
  borron_mini: { mini: true, pal: {}, rows: [
    '..OO..',
    '.OHSO.',
    '.OHSO.',
    'OHBSSO',
    'OBcCSO',
    'OBccSO',
    'OBBSSO',
    'OSBSSO',
    'OSSSSO',
    'OSSSSO',
    '.OOOO.',
  ], eyes: [[1, 3], [4, 3]], eyeKind: 'ink' },
  charco_mini: { mini: true, pal: {}, rows: [
    '.....OOOOOO.......',
    '..OOOHHBBccBOO....',
    '.OHBBBBBBcCcBSSO..',
    'OHBBBBBBBcccBSSSO.',
    'OSBBBBBBBBBBSSSSSO',
    '.OOSSSSSSSSSSSSOO.',
  ], eyes: [[4, 2], [13, 2]], eyeKind: 'ink' },
  grumo_mini: { mini: true, pal: {}, rows: [
    '...OO..OO...',
    '..OHSOOHSO..',
    '.OHBBBBBSSO.',
    '.OBBBcccBSSO',
    'OHBBBcCcBSSO',
    'OBBBBcccBSSO',
    'OBBBBBBBSSSO',
    '.OSBBBBSSSSO',
    '..OSSSSSSSO.',
    '...OOOOOO...',
  ], eyes: [[3, 4], [8, 4]], eyeKind: 'ink' },
  tinta_mini: { mini: true, big: true, pal: {}, rows: [
    '........OOOOOO........',
    '.....OOOHHHSSSOOO.....',
    '...OOHHBBBBBSSSSSOO...',
    '..OHHBBBBBBBBSSSSSSO..',
    '.OHBBBBBBBBBBSSSSSSSO.',
    '.OHBBBBBBBBBBSSSSSSSO.',
    'OHBBBBBBBBBBBSSSSSSSSO',
    'OBBBBBBBBBBBSSSSSSSSSO',
    'OBBBBBBBBBBSSSSSSSSSSO',
    'OSBBBBBBBBSSSSSSSSSSSO',
    '.OSBBBBBBSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSSSSSSSO.',
    '..OOSSSSSSSSSSSSSSOO..',
    '....OOOOOOOOOOOOOO....',
    '.....OO....OO..OO.....',
    '.....O.....O...O......',
  ], eyes: [[6, 7], [14, 7]], eyeKind: 'ink' },
});

// ---- Sprites grandes exclusivos del título (con boca y más detalle)
Object.assign(SPRITES, {
  carmin_title: { pal: { b: '#3a2440', c: '#5a3a62', d: '#241428', K: '#14121c', p: '#ff9d9d' }, rows: [
    '............bbbbb.............',
    '.........bbbccccccbb..........',
    '.......bbccccccccccccbb.......',
    '......bcccccccccccccccb.......',
    '.....bbbbbbbbbbbbbbbbbbbb.....',
    '......ddddddddddddddddd.......',
    '.........OOOOHHHHOOO..........',
    '.......OOHHHHHHBBBBBOO........',
    '......OHHHHHHBBBBBBBBSO.......',
    '.....OHHHHHBBBBBBBBBBSSO......',
    '....OHHHHBBBBBBBBBBBBSSSO.....',
    '....OHHHBBBBBBBBBBBBBSSSO.....',
    '...OHHHBBBBBBBBBBBBBBSSSSO....',
    '...OHHBBBBBBBBBBBBBBBSSSSO....',
    '...OHBBBBBBBBBBBBBBBBSSSDO....',
    '..OHBBBBBBBBBBBBBBBBBSSSSDO...',
    '..OBBBBBBBBBBBBBBBBBBSSSSDO...',
    '..OBBpBBBBBBBBBBBBBpBSSSDDO...',
    '..OBBBBBBBBBBBBBBBBBSSSSDDO...',
    '..OBBBBBBBBBBBBBBBBKSSSDDDO...',
    '..OSBBBBBBBBBBBBKKKBSSSDDDO...',
    '..OSBBBBBBBBBBBBBBBSSSSDDDO...',
    '...OSBBBBBBBBBBBBBBSSSDDDO....',
    '...OSSBBBBBBBBBBBBSSSSDDDO....',
    '...OSSSBBBBBBBBBBSSSSDDDDO....',
    '....OSSSBBBBBBBBSSSSDDDDO.....',
    '....ODSSSSSSSSSSSSSDDDDDO.....',
    '.....ODDSSSSSSSSSDDDDDDO......',
    '......OODDDDDDDDDDDDDOO.......',
    '........OOOOOOOOOOOOO.........',
  ], eyes: [[10, 15], [19, 15]], eyeKind: 'front', brow: 'angry' },
  ambar_title: { pal: { m: '#2a2438', o: '#e8cf9a', K: '#14121c' }, rows: [
    '.........m..........',
    '.........mm.........',
    '........mmo.........',
    '........moo.........',
    '.......Oooo.........',
    '.......OoooO........',
    '......OOHHOO........',
    '......OHHHHO........',
    '......OHHHBBO.......',
    '.....OHHHBBBO.......',
    '.....OHHHBBBSO......',
    '.....OHHBBBBSO......',
    '....OHHHBBBBSSO.....',
    '....OHHBBBBBSSO.....',
    '....OHHBBBBBSSO.....',
    '...OHHBBBBBBSSSO....',
    '...OHHBBBBBBSSSO....',
    '...OHBBBBBBBSSSO....',
    '...OHBBBBBBBSSDO....',
    '..OHBBBBBBBBSSDO....',
    '..OHBBBBBBBBSSDO....',
    '..OHBBBBBBBBSSDDO...',
    '..OBBBBBBBBBSSDDO...',
    '..OBBBBBBBBBSSDDO...',
    '..OBBBBBBBKKSSSDDO..',
    '..OBBBBBBBBSSSDDO...',
    '..OSBBBBBBBSSSDDO...',
    '..OSBBBBBBBSSDDDO...',
    '..OSBBBBBBSSSDDDO...',
    '...OSBBBBBSSSDDO....',
    '...OSSBBBBSSSDDO....',
    '...OSSBBBSSSDDDO....',
    '....OSSSSSSDDDO.....',
    '....OODSSSSDDOO.....',
    '......OODDDOO.......',
    '........OOO.........',
  ], eyes: [[6, 20], [11, 20]], eyeKind: 'front', brow: 'sharp' },
  anil_title: { pal: { K: '#14121c' }, rows: [
    '..........OO..........OO............',
    '.........OHHO........OHHO...........',
    '........OHHBBO..OO..OHBBSO..........',
    '.......OHHBBBBOOHHOOHBBBSSO.........',
    '......OHHBBBBBBBHHBBBBBBSSSO........',
    '.....OHHBBBBBBBBBBBBBBBBSSSSO.......',
    '....OHHBBBBBBBBBBBBBBBBBBSSSSO......',
    '...OHHBBBBBBBBBBBBBBBBBBBBSSSSO.....',
    '..OHHBBBBBBBBBBBBBBBBBBBBBBSSSSO....',
    '.OHHBBBBBBBBBBBBBBBBBBBBBBBSSSSSO...',
    '.OHBBBBBBBBBBBBBBBBBBBBBBBBBSSSSDO..',
    'OHBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSDDO.',
    'OBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSDDO.',
    'OBBBBBBBBBBBBBBBBKKBBBBBBBBSSSSSDDO.',
    'OSBBBBBBBBBBBBBBBBBBBBBBBBSSSSSDDDO.',
    'OSBBBBBBBBBBBBBBBBBBBBBBBSSSSSSDDDO.',
    '.OSSBBBBBBBBBBBBBBBBBBBBSSSSSSDDDO..',
    '..OSSSBBBBBBBBBBBBBBBBSSSSSSDDDDO...',
    '...OSSSSBBBBBBBBBBBBSSSSSSSDDDDO....',
    '....OODSSSSSSSSSSSSSSSSSSDDDDOO.....',
    '......OOODDDDDDDDDDDDDDDDOOO........',
    '.........OOOOOOOOOOOOOOOO...........',
  ], eyes: [[11, 10], [22, 10]], eyeKind: 'front', brow: 'calm' },
});
// Ojos mini: 1×2 píxeles (con brillo), tinta en claro; herido/KO = dos píxeles en diagonal; feliz = ^ ; parpadeo = raya
function drawEyesMini(x, def, mode, kind, rp) {
  const F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const ink = kind === 'ink', eyeCol = ink ? '#f4f0ea' : '#14121c';
  def.eyes.forEach(([ex, ey], i) => {
    if (mode === 'ko' || mode === 'hurt') { F(eyeCol, ex - 1, ey - 1); F(eyeCol, ex, ey); F(eyeCol, ex + 1, ey - 1); F(eyeCol, ex + 1, ey + 1); F(eyeCol, ex - 1, ey + 1); return; }
    if (mode === 'happy') { F(eyeCol, ex - 1, ey); F(eyeCol, ex, ey - 1); F(eyeCol, ex + 1, ey); return; }
    if (mode === 'blink') { F(eyeCol, ex, ey, 2, 1); return; }
    if (mode === 'wide') { F(eyeCol, ex - (i ? 0 : 1), ey - 2, 2, 3); F('#ffffff', ex - (i ? 0 : 1), ey - 2); return; } // ojos como platos (sobresalto)
    if (ink) { F(eyeCol, ex, ey - 1, def.big ? 2 : 1, def.big ? 3 : 2); if (def.big) F('#14121c', ex + 1, ey); return; }
    F(eyeCol, ex, ey - 1, 1, 2); F('#ffffff', ex, ey - 1);
    if (def.brow === 'angry') F('#14121c', ex + (i ? 1 : -1), ey - 2);
    if (def.brow === 'sharp') F('#14121c', ex, ey - 3, 2, 1);
  });
}
// Construye un sprite: rampa del color + paleta fija. core = color del núcleo (enemigos), dark = cuerpo de tinta
function buildSprite(name, color, core, opt = {}) {
  const atlas = typeof SpriteAtlas !== 'undefined' && SpriteAtlas.staticSprite(name, opt.eyes || 'normal');
  if (atlas) return atlas;
  const key = `spr|${name}|${color}|${core || ''}|${opt.eyes || 'normal'}`;
  return cached(key, () => {
    const def = SPRITES[name], rp = ramp(color), rows = def.rows, h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const cr = core ? ramp(core) : null;
    const P = Object.assign({ O: rp.out, D: rp.dk, S: rp.sh, B: rp.base, H: rp.hi, W: rp.spec, c: cr ? cr.base : rp.base, C: cr ? cr.hi : rp.hi }, def.pal);
    for (let y = 0; y < h; y++) for (let X = 0; X < rows[y].length; X++) { const ch = rows[y][X]; if (ch === '.') continue; const col = P[ch]; if (!col) continue; x.fillStyle = col; x.fillRect(X, y, 1, 1); }
    // especular: un brillo húmedo arriba a la izquierda del cuerpo
    const spec = def.mini ? [[Math.round(w * .3), Math.round(h * .3), 1, 1]] : def.big ? [[11, 6, 5, 2], [9, 8, 2, 3]] : def.eyeKind === 'ink' ? [[Math.round(w * .28), 2, 3, 1], [Math.round(w * .24), 3, 1, 2]] : [[Math.round(w * .3), Math.round(h * .3), 3, 1], [Math.round(w * .28), Math.round(h * .3) + 1, 1, 2]];
    if (!def.gen) for (const [sx, sy, sw, sh] of spec) { if (rows[sy] && rows[sy][sx] && rows[sy][sx] !== '.' && 'HB'.includes(rows[sy][sx])) { x.fillStyle = rp.spec; x.fillRect(sx, sy, sw, sh); } }
    (def.mini ? drawEyesMini : drawEyes)(x, def, opt.eyes || 'normal', def.eyeKind, rp);
    if (def.gen) drawHeroFace(x, def, opt.eyes || 'normal', rp);
    c.__key = key; return c;
  });
}
// Ojos y cejas: normal | blink | hurt | ko | happy | angry
function drawEyes(x, def, mode, kind, rp) {
  const F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const ink = kind === 'ink', eyeCol = ink ? '#f4f0ea' : '#14121c', hi = ink ? '#ffffff' : '#ffffff';
  def.eyes.forEach(([ex, ey], i) => {
    if (mode === 'ko') { F(eyeCol, ex - 1, ey - 1); F(eyeCol, ex + 1, ey - 1); F(eyeCol, ex, ey); F(eyeCol, ex - 1, ey + 1); F(eyeCol, ex + 1, ey + 1); return; }
    if (mode === 'hurt') { F(eyeCol, ex - 1, ey); F(eyeCol, ex + 1, ey); F(eyeCol, ex, ey - 1); F(eyeCol, ex, ey + 1); return; }
    if (mode === 'happy') { F(eyeCol, ex - 1, ey); F(eyeCol, ex, ey - 1); F(eyeCol, ex + 1, ey); return; }
    if (mode === 'blink') { F(eyeCol, ex - 1, ey, 3, 1); return; }
    if (mode === 'wide' && !ink) { F(eyeCol, ex - 1, ey - 2, 3, 4); F(hi, ex - 1, ey - 2); F(hi, ex + 1, ey + 1); return; } // sorpresa: ojos redondos
    if (mode === 'worried' && !ink) { F(eyeCol, ex, ey - 1, 2, 3); F(hi, ex, ey - 1); if (i) { F('#14121c', ex, ey - 4, 2, 1); F('#14121c', ex + 2, ey - 3); } else { F('#14121c', ex - 1, ey - 3); F('#14121c', ex, ey - 4, 2, 1); } return; } // cejas que suben por dentro
    if (ink) { F(eyeCol, ex, ey - 1, 2, 3); F('#14121c', ex + 1, ey, 1, 1); if (def.big) { F(eyeCol, ex - 1, ey - 2, 4, 5); F('#14121c', ex + 1, ey, 2, 2); } return; }
    if (kind === 'side') { F(eyeCol, ex, ey - 1, 1, 3); F(hi, ex, ey - 1); F(eyeCol, ex + 1, ey, 1, 1); }
    else { F(eyeCol, ex, ey - 1, 2, 3); F(hi, ex, ey - 1); }
    if (mode === 'angry' || def.brow === 'angry') { F('#14121c', ex - 1 + (i ? 1 : 0), ey - 3, 2, 1); F('#14121c', ex + (i ? 0 : 1), ey - 2, 1, 1); }
    if (def.brow === 'sharp') F('#14121c', ex - 1, ey - 3, 3, 1);
  });
}
// Gotitas satélite de Añil (orbitan; se dibujan aparte del sprite)
function drawSatellites(x, y, t, col, sc = 1) { const rp = ramp(col); for (let i = 0; i < 3; i++) { const a = t * .08 + i * 2.09, r = (16 + Math.sin(t * .1 + i) * 3) * sc, dx = Math.cos(a) * r, dy = Math.sin(a) * r * .35 - 14 * sc; const s = Math.max(2, Math.round(3 * sc)); g.fillStyle = rp.out; g.fillRect(Math.round(x + dx) - 1, Math.round(y + dy) - 1, s + 2, s + 2); g.fillStyle = rp.base; g.fillRect(Math.round(x + dx), Math.round(y + dy), s, s); g.fillStyle = rp.hi; g.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1); } }
// Sprite de una unidad según pose y frame: vista (back/side/front) + deformación squash & stretch
const VIEW = { idle: 'back', hop: 'back', attack: 'side', charge: 'side', hurt: 'front', ko: 'front', happy: 'front' };
const EYES = { idle: 'normal', hop: 'normal', attack: 'angry', charge: 'normal', hurt: 'hurt', ko: 'ko', happy: 'happy' };
const SQ = { idle: [[1, 1], [1.03, .97], [1, 1], [.97, 1.03]], hop: [[.92, 1.1]], attack: [[1.06, .96]], charge: [[.9, 1.12]], hurt: [[1.16, .84]], ko: [[1.4, .4]], happy: [[.96, 1.06]] };
function unitSpriteInfo(u, frame) {
  const party = u.kind === 'party', pose = u.pose || 'idle';
  let view=VIEW[pose]||'back';
  if(party&&['idle','hop'].includes(pose)&&B.axis){
    const dot=Math.cos(SCENE.cam.yaw)*B.axis.dx+Math.sin(SCENE.cam.yaw)*B.axis.dy;
    view=dot<-.3?'front':Math.abs(dot)<.3?'side':'back';
  }
  const atlas=typeof SpriteAtlas!=='undefined'&&SpriteAtlas.battle(u,frame,view);
  if(atlas)return atlas;
  const name=party?`${u.id}_${view}`:u.data.phaseSprites?.[(u.bossPhase||1)-1]||u.id;
  const blink = pose === 'idle' && ((B.t + u.idx * 37) % 160) < 6;
  const spr = buildSprite(name, party ? C(u.color) : C('negro'), party ? null : u.def.core, { eyes: blink ? 'blink' : (party ? EYES[pose] : (pose === 'hurt' ? 'hurt' : pose === 'ko' ? 'ko' : 'normal')) });
  const sq = (SQ[pose] || SQ.idle), [sx, sy] = sq[frame % sq.length];
  return { spr, sx, sy };
}

// Versión descolorida de un sprite (sin pigmento): desaturación real, conservando la silueta
function desatSprite(spr, amount) {
  const q = Math.round(clamp(amount, 0, 1) * 4) / 4; if (q <= 0) return spr;
  return cached(`${spr.__key}|desat|${q}`, () => { const c = document.createElement('canvas'); c.width = spr.width; c.height = spr.height; const x = c.getContext('2d'); x.drawImage(spr, 0, 0); x.globalCompositeOperation = 'saturation'; x.globalAlpha = q; x.fillStyle = '#808080'; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.drawImage(spr, 0, 0); x.globalCompositeOperation = 'source-over'; if (q >= 1) { x.globalAlpha = .25; x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#c9c4d4'; x.fillRect(0, 0, c.width, c.height); } c.__key = `${spr.__key}|desat|${q}`; return c; });
}
const pigmentFade = (mp, maxmp) => { const r = maxmp ? mp / maxmp : 1; return r <= 0 ? 1 : r < .35 ? (1 - r / .35) * .8 : 0; }; // cuánto se descolora una gota según su pigmento
// =====================================================================
// Protagonistas dibujados por forma: cada gota se describe con su silueta (ancho a cada altura), su luz (arriba a la
// izquierda) y sus rasgos; de ahí salen las vistas de frente, lado y espalda y los tres tamaños (batalla, mapa, retrato),
// siempre coherentes entre sí. Las filas resultantes usan la misma leyenda que el resto de sprites.
// =====================================================================
const HERO_FORMS = {
  // Carmín: gota ancha y robusta, boina de pintor ladeada con su rabillo, ceño decidido y rubor
  carmin: { size: { battle: [30, 24], mini: [15, 13], title: [36, 32] }, width: .94, top: .8, bottom: .3, brow: 'angry', eyeY: .44, eyeGap: .33, beret: true, blush: true, pal: { b: '#3a2440', c: '#5a3a62', d: '#241428', e: '#7a5484', p: '#ff9d9d' } },
  // Ámbar: la gota clásica, redonda abajo y afilada arriba en una punta que se riza, viva y ligera
  ambar: { size: { battle: [24, 30], mini: [12, 15], title: [28, 38] }, width: .84, top: .95, bottom: .25, brow: 'sharp', eyeY: .34, eyeGap: .34, tear: true, freckles: true, pal: {} },
  // Añil: salpicadura ancha con tres crestas, brillo de agua y un goterón que le cae por un lado
  anil: { size: { battle: [34, 20], mini: [17, 10], title: [40, 26] }, width: 1, top: .62, bottom: .4, brow: 'calm', eyeY: .44, eyeGap: .26, splash: true, drip: true, pal: {} },
};
function heroDef(id, view, kind) {
  const F = HERO_FORMS[id], [Wd, Ht] = F.size[kind], mini = kind === 'mini', grid = Array.from({ length: Ht }, () => Array(Wd).fill('.'));
  const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < Wd && y < Ht) grid[y][x] = ch; };
  const side = view === 'side', back = view === 'back', cx = Wd / 2 - (side ? .5 : 0), groundY = Ht - 1;
  // alto útil del cuerpo (lo de arriba queda para boina, cono o crestas)
  const bodyTop = F.beret ? Math.round(Ht * .24) : F.pencil ? Math.round(Ht * .06) : Math.round(Ht * .12), bodyH = groundY - bodyTop, A = (Wd / 2 - 1) * F.width * (side ? .93 : 1);
  const half = v => { // medio ancho del cuerpo a la altura v (0 abajo, 1 arriba)
    if (F.tear) { if (v < .5) { const k = (v - .34) / .34; return A * Math.sqrt(Math.max(0, 1 - k * k * (v < .34 ? .95 : .2))); } const q = (v - .5) / .5; return A * .98 * Math.pow(1 - q, 1.35); } // gota: la punta se afila
    if (F.pencil) { if (v > .62) return A * .98 * (1 - (v - .62) / .38); const k = (v - .34) / .34; return A * Math.sqrt(Math.max(0, 1 - k * k * (v < .34 ? .9 : .15))); }
    if (F.splash) { const k = (v - .38) / (v > .38 ? .62 : .42); return A * Math.sqrt(Math.max(0, 1 - k * k)); }
    const k = (v - .42) / (v > .42 ? .58 : .45); return A * Math.sqrt(Math.max(0, 1 - k * k)) * (v > .86 ? 1 - (v - .86) * 1.6 : 1);
  };
  const inside = (x, y) => { const v = (groundY - y) / bodyH; let u = x + .5 - cx; if (v < 0 || v > 1) return false; if (F.tear && v > .6) u += (side ? -1 : 1) * Math.pow((v - .6) / .4, 2) * A * .45; let w = half(v); // la punta se riza
    if (F.splash && v > .5) { const n = u / A + (side ? .15 : 0), crest = Math.max(...[-.62, 0, .62].map((c, i) => Math.exp(-((n - c) ** 2) / .07) * (i === 1 ? 1 : .85))); w = Math.abs(n) < .98 ? A * (1 - Math.max(0, v - .5) * .12) : 0; if (v > .52 + .46 * crest) return false; } // tres crestas redondas en lo alto
    return Math.abs(u) <= w; };
  for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) if (inside(x, y)) {
    const v = (groundY - y) / bodyH, u = (x + .5 - cx) / A, k = -u * .6 + (v - .45) * 1.1 + (side ? .15 : 0);
    put(x, y, k > .62 ? 'H' : k > -.05 ? 'B' : k > -.55 ? 'S' : 'D');
  }
  // canto: contorno de tinta alrededor; el borde de abajo a la derecha se oscurece y el de arriba a la izquierda brilla
  const body = grid.map(r => r.slice()), inB = (x, y) => y >= 0 && y < Ht && x >= 0 && x < Wd && body[y][x] !== '.';
  for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
    if (body[y][x] === '.') { if (inB(x - 1, y) || inB(x + 1, y) || inB(x, y - 1) || inB(x, y + 1)) put(x, y, 'O'); continue; }
    if (!inB(x + 1, y) || !inB(x, y + 1)) put(x, y, 'D'); else if (!inB(x - 1, y) || !inB(x, y - 1)) put(x, y, grid[y][x] === 'D' ? 'S' : 'H');
  }
  const def = { rows: null, pal: F.pal, gen: true, mini, brow: F.brow === 'calm' ? undefined : F.brow, eyeKind: back ? 'side' : 'front', eyes: [] };
  const vy = v => groundY - v * bodyH, ux = u => cx + u * A;
  // brillo húmedo: un trazo curvo arriba a la izquierda (en la espalda, en el otro hombro)
  if (!mini) { const sx = back ? .35 : -.5, sy = F.pencil ? .5 : .66; put(ux(sx), vy(sy), 'W'); put(ux(sx) + 1, vy(sy) - 1, 'W'); put(ux(sx) - 1, vy(sy) + 1, 'W'); if (F.splash) { put(ux(sx) + 2, vy(sy) - 1, 'W'); put(ux(sx) + 3, vy(sy) - 1, 'W'); } }
  else put(ux(back ? .3 : -.45), vy(.62), 'W');
  // Ámbar: facetas de lápiz, cono de madera y mina
  if (F.pencil) {
    for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) { if (grid[y][x] === '.' || grid[y][x] === 'O') continue; const v = (groundY - y) / bodyH;
      if (v > .8) put(x, y, v > .92 ? 'm' : (x + .5 < cx ? 'o' : 'q')); else if (v > .74) put(x, y, 'n'); // mina, madera y el filo pintado
      else if (!mini && grid[y][x] !== 'D' && grid[y][x] !== 'H' && Math.abs(((x + .5 - cx) / A) - (side ? -.1 : 0)) > .05 && Math.round(x + .5 - cx) % 4 === 0) put(x, y, 'S'); } // facetas
    put(cx - .5, vy(1) , 'm');
  }
  // Carmín: boina ladeada con rabillo
  if (F.beret) { const by = bodyTop + (mini ? 1 : 2), bw = A * 1.08, tilt = side ? -1 : back ? .5 : -.4;
    for (let y = by - (mini ? 3 : 5); y <= by; y++) for (let x = 0; x < Wd; x++) { const u = (x + .5 - cx - tilt * 2) / bw, t = (by - y) / (mini ? 3 : 5); if (Math.abs(u) > Math.sqrt(Math.max(0, 1 - t * t)) * (1 - t * .35)) continue; put(x, y, y === by ? 'd' : t > .6 ? 'e' : u < -.2 ? 'c' : 'b'); }
    put(cx + tilt * 2, by - (mini ? 4 : 6), 'd'); if (!mini) put(cx + tilt * 2, by - 7, 'd'); // rabillo
    for (let x = 0; x < Wd; x++) if (grid[by + 1] && grid[by + 1][x] !== '.' && grid[by + 1][x] !== 'O' && Math.abs(x + .5 - cx) < bw * .9) put(x, by + 1, 'S'); } // sombra de la boina en la frente
  // Añil: goterón por un lado
  if (F.drip && !mini) { const dx = ux(side ? .55 : .7), top = vy(.3); for (let i = 0; i < 4; i++) put(dx, top + i, i === 3 ? 'D' : 'B'); put(dx - 1, top + 3, 'O'); put(dx + 1, top + 3, 'O'); put(dx, top + 4, 'O'); }
  // cara: ojos (drawEyes), boca, rubor, pecas; de espaldas no hay cara
  if (!back) { const ey = Math.round(vy(F.eyeY)), gap = F.eyeGap * A, off = side ? -A * .38 : 0;
    def.eyes = side ? [[Math.round(cx + off - gap * .45), ey], [Math.round(cx + off + gap * .55), ey]] : [[Math.round(cx - gap - (mini ? 1 : 1)), ey], [Math.round(cx + gap - (mini ? 0 : 1)), ey]];
    def.mouth = [Math.round(cx + off * (side ? 1.1 : 0)) - (mini ? 0 : 1), ey + (mini ? 2 : 3)];
    if (F.blush && !mini) def.blush = def.eyes.map(([x, y], i) => [x + (i ? 1 : -2), y + 2]);
    if (F.freckles && !mini) def.freckles = def.eyes.map(([x, y], i) => [x + (i ? 2 : -2), y + 2]);
  }
  def.rows = grid.map(r => r.join(''));
  return def;
}
for (const id of Object.keys(HERO_FORMS)) for (const view of ['front', 'side', 'back']) { SPRITES[id + '_' + view] = heroDef(id, view, 'battle'); SPRITES[id + '_' + view + '_mini'] = heroDef(id, view, 'mini'); }
for (const id of Object.keys(HERO_FORMS)) SPRITES[id + '_title'] = heroDef(id, 'front', 'title');
// Boca, rubor y pecas de los protagonistas según el gesto.
function drawHeroFace(x, def, mode, rp) {
  const F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); }, ink = '#14121c';
  if (def.blush && mode !== 'ko') for (const [a, b] of def.blush) F('#ff9d9d', a, b, 2, 1);
  if (def.freckles) for (const [a, b] of def.freckles) { F(rp.sh, a, b); F(rp.sh, a + 1, b + 1); }
  if (!def.mouth) return; const [mx, my] = def.mouth;
  if (def.mini) { if (mode === 'happy') F(ink, mx, my, 2, 1); else if (mode !== 'blink' && mode !== 'wide') F(ink, mx, my, 1, 1); else if (mode === 'wide') F(ink, mx, my, 1, 2); return; }
  if (mode === 'happy') { F(ink, mx - 1, my, 4, 1); F(ink, mx, my + 1, 2, 1); F('#e8707a', mx, my + 1, 2, 1); F(ink, mx - 1, my + 1); F(ink, mx + 2, my + 1); F(ink, mx, my + 2, 2, 1); } // boca abierta
  else if (mode === 'hurt' || mode === 'ko' || mode === 'worried') { F(ink, mx - 1, my + 1); F(ink, mx, my); F(ink, mx + 1, my + 1); F(ink, mx + 2, my); } // mueca en zigzag
  else if (mode === 'angry') F(ink, mx - 1, my, 4, 1); // gesto serio al atacar
  else if (mode === 'wide') { F(ink, mx, my, 2, 2); }
  else { F(ink, mx - 1, my); F(ink, mx, my + 1, 2, 1); F(ink, mx + 2, my); } // sonrisa
}
