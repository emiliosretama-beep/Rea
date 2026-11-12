// Tipos de auto: medidas y datos de cliente (el modelo 3D se arma en world/carModels.js).
// want: galones que pide [mín, máx] · tip: propina base · patience: segundos · chance: probabilidad relativa
// Los que no tienen 'chance' todavía no llegan como clientes (solo pasan por la carretera).
export const CAR_TYPES = {
  sedan: {
    len: 4.6, wid: 1.8, wheelR: 0.34, weight: 5,
    name: 'carSedan', want: [7, 11], tip: 0.25, patience: 55, chance: 5,
    colors: [0x7fb7b0, 0xc9584a, 0xe2c27a, 0x6f8fb8, 0xe9e0cc, 0x5d7a57],
  },
  pickup: {
    len: 5.0, wid: 1.9, wheelR: 0.38, weight: 3,
    name: 'carPickup', want: [10, 15], tip: 0.2, patience: 65, chance: 3,
    colors: [0xa8452f, 0x4f6f8a, 0x8a8f6a, 0xd9c9a3],
  },
  wagon: {
    len: 5.0, wid: 1.85, wheelR: 0.34, weight: 3,
    name: 'carWagon', want: [11, 16], tip: 0.4, patience: 45, chance: 3,
    colors: [0x8fa67a, 0xd3a15a, 0xb9c4c9, 0x9b5f4a],
  },
  truck: {
    len: 10.5, wid: 2.4, wheelR: 0.5, weight: 2,
    name: 'carTruck',
    colors: [0xb5462f, 0x2f7f86, 0x3d4a66, 0xd2a43c],
  },
};
