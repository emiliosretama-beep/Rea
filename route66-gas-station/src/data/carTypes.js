// Tipos de auto: forma (modelo 3D) y datos de cliente.
// want: galones que pide [mín, máx] · tip: propina base · patience: segundos · chance: probabilidad relativa
// Los que no tienen 'chance' todavía no llegan como clientes (solo pasan por la carretera).
export const CAR_TYPES = {
  sedan: {
    kind: 'car', len: 4.6, wid: 1.8, bodyH: 0.62, ground: 0.3, wheelR: 0.34,
    cabin: { len: 2.3, h: 0.6, offset: -0.2 }, fins: true, weight: 5,
    name: 'carSedan', want: [7, 11], tip: 0.25, patience: 55, chance: 5,
    colors: [0x7fb7b0, 0xc9584a, 0xe2c27a, 0x6f8fb8, 0xe9e0cc, 0x5d7a57],
  },
  pickup: {
    kind: 'car', len: 5.0, wid: 1.9, bodyH: 0.7, ground: 0.38, wheelR: 0.38,
    cabin: { len: 1.6, h: 0.68, offset: 0.45 }, weight: 3,
    name: 'carPickup', want: [10, 15], tip: 0.2, patience: 65, chance: 3,
    colors: [0xa8452f, 0x4f6f8a, 0x8a8f6a, 0xd9c9a3],
  },
  wagon: {
    kind: 'car', len: 5.0, wid: 1.85, bodyH: 0.64, ground: 0.3, wheelR: 0.34,
    cabin: { len: 3.3, h: 0.62, offset: -0.6 }, weight: 3,
    name: 'carWagon', want: [11, 16], tip: 0.4, patience: 45, chance: 3,
    colors: [0x8fa67a, 0xd3a15a, 0xb9c4c9, 0x9b5f4a],
  },
  truck: {
    kind: 'truck', len: 10.5, wid: 2.4, wheelR: 0.5, weight: 2,
    name: 'carTruck',
    colors: [0xb5462f, 0x2f7f86, 0x3d4a66, 0xd2a43c],
  },
};
