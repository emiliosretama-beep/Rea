// Constantes generales del juego. Cambiar números aquí, no en la lógica.
export const CFG = {
  version: 'DEV 1.1 · Etapa 6',
  maxPixelRatio: 2,
  fov: 70,
  fovPortrait: 86,

  // Jugador
  eyeHeight: 1.65,
  radius: 0.4,
  walkSpeed: 4.2, // m/s
  runSpeed: 6.8,
  touchMaxSpeed: 5.6, // joystick a fondo
  mouseSens: 0.0022, // rad por pixel
  touchSens: 0.0048,
  interactRange: 3.2,

  // Zona caminable: el terreno cercado. En los accesos de autos el límite es invisible.
  bounds: { minX: -38.4, maxX: 38.4, minZ: -39.9, maxZ: -6.8 }, // por dentro de la barda

  // Carretera: corre a lo largo del eje X, centrada en z = 0
  road: { width: 10, length: 640, laneZ: 2.5 },

  debugFps: false, // contador de FPS solo para desarrollo
};

// Balance del negocio (precios de los años 50)
export const BAL = {
  pricePerGal: 0.3,
  startRep: 50,
  fillSeconds: 4.5, // tiempo aproximado para llenar un pedido
  overfillMax: 1.12, // la bomba corta sola al 112 %
  doneMin: 0.9, // desde aquí el cliente acepta la carga
  perfectMin: 0.95,
  perfectMax: 1.04,
  payPatienceRate: 0.5, // esperando a pagar, la paciencia baja más lento
  repPerfect: 2, repOk: 1, repOver: 0, repAngry: -6,
  firstCustomer: 1.5, // segundos hasta el primer cliente
  nextCustomer: [6, 11], // segundos entre llegadas (con reputación 50 y una sola bomba)
  afterLeave: 2.5, // respiro mínimo cuando se libera un lugar
  repSpeed: [1.6, 0.6], // multiplicador de esa espera con reputación 0 y con 100

  // Inventario y proveedor
  fuelStart: 80, fuelCap: 120, fuelOrder: 60, fuelCost: 0.12, // costo por galón
  fuelLow: 15, // con menos de esto se puede pedir a crédito
  sodaStart: 8, sodaCap: 12, sodaOrder: 8, sodaCost: 0.08, sodaPrice: 0.25,
  snackStart: 6, snackCap: 12, snackOrder: 8, snackCost: 0.12, snackPrice: 0.4,
  // Clientes que después de cargar se estacionan y entran a comprar
  shopChance: 0.5, shopChanceShop: 0.75, // sin y con la mejora "tienda surtida"
  counterPatience: 45, // segundos que espera en la caja
  walkSpeed: 1.7,

  // Estrellas: la reputación alta baja poco a poco si no atiendes bien
  repDecay: 0.02, // por segundo, cuando la reputación es 100 (proporcional desde 60)
  supplyDiscount: 0.85, // con 2 estrellas
  tipBonus: 1.3, // con 3 estrellas
  // Mejoras por niveles
  pumpTier: 0.22, trainingTier: 0.25, premiumTier: 0.2,
  // Mejoras (los costos están en data/upgrades.js)
  storageMult: 2, // almacén: capacidad x2
  neonSpawn: 0.8, // neón: los clientes llegan 20 % más seguido
  cafeChance: 0.45, cafePrice: 0.45, piePrice: 0.4, brewTime: 2.5,
  parkingPatience: 1.25,
  helperDelay: 1.5, helperSpeed: 0.55, helperPayDelay: 3,
  staffSpeed: 0.6, cashierDelay: 2.2, washAutoDelay: 2.5, // personal: más lento que tú
  // Servicios: segundos de trabajo y pago
  jobs: {
    wash: [{ id: 'jobWash', work: 8, pay: 1.4 }], // automático: corre solo
    garage: [{ id: 'jobOil', work: 5, pay: 1.8 }, { id: 'jobTires', work: 7, pay: 2.6 }],
  },
  servicePatience: 40, serviceTip: 0.3,
  bayWeight: { fuel: 3, wash: 1.3, garage: 1.1 },

  // Basura en el patio
  litterStart: 16, litterMax: 8, // al inicio el terreno está lleno; ya abierto, hasta 8
  litterEvery: 35, repLitter: 0.5,
};

// Paleta compartida entre el mundo 3D y la interfaz
export const PAL = {
  sand: 0xd9a066,
  sandDark: 0xb98152,
  asphalt: 0x2b2a33,
  concrete: 0xaaa69f,
  cream: 0xe6d3ad,
  red: 0xb5462f,
  teal: 0x2f9c95,
  wood: 0x6e4a32,
  dark: 0x23202a,
  glass: 0x2a3440,
  chrome: 0xcfd3d6,
  cactus: 0x55793f,
  rock: 0x9c6248,
  mesa: 0x8a4a3c,
};
