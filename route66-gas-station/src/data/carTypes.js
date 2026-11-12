// Tipos de auto: medidas y datos de cliente (el modelo 3D se arma en world/carModels.js).
//  want: galones que pide [mín, máx] · tip: propina base · patience: segundos
//  chance: probabilidad relativa como cliente · weight: probabilidad en el tráfico de fondo
//  level: nivel de la estación que lo desbloquea · fill: segundos que tarda en llenarse
//  service: puede pedir autolavado o taller
export const CAR_TYPES = {
  sedan: {
    len: 4.6, wid: 1.8, wheelR: 0.34, weight: 5, level: 1, service: true,
    name: 'carSedan', want: [7, 11], tip: 0.25, patience: 55, chance: 5,
    colors: [0x7fb7b0, 0xc9584a, 0xe2c27a, 0x6f8fb8, 0xe9e0cc, 0x5d7a57],
  },
  pickup: {
    len: 5.0, wid: 1.9, wheelR: 0.38, weight: 3, level: 1, service: true,
    name: 'carPickup', want: [10, 15], tip: 0.2, patience: 65, chance: 3,
    colors: [0xa8452f, 0x4f6f8a, 0x8a8f6a, 0xd9c9a3],
  },
  wagon: {
    len: 5.0, wid: 1.85, wheelR: 0.34, weight: 3, level: 1, service: true,
    name: 'carWagon', want: [11, 16], tip: 0.4, patience: 45, chance: 3,
    colors: [0x8fa67a, 0xd3a15a, 0xb9c4c9, 0x9b5f4a],
  },
  moto: {
    len: 2.2, wid: 0.8, wheelR: 0.33, weight: 2, level: 2,
    name: 'carMoto', want: [2, 4], tip: 0.15, patience: 35, chance: 3, fill: 2.5,
    colors: [0x23202a, 0xa8452f, 0x2f7f86, 0xd2a43c],
  },
  truck: {
    len: 10.5, wid: 2.4, wheelR: 0.5, weight: 2, level: 2,
    name: 'carTruck', want: [30, 45], tip: 0.5, patience: 80, chance: 2, fill: 7,
    colors: [0xb5462f, 0x2f7f86, 0x3d4a66, 0xd2a43c],
  },
  sports: {
    len: 4.2, wid: 1.75, wheelR: 0.33, weight: 1, level: 3, service: true,
    name: 'carSports', want: [9, 13], tip: 0.7, patience: 30, chance: 2,
    colors: [0xc8322b, 0xe8b23a, 0xf1ead8, 0x2f9c95],
  },
  classic: {
    len: 5.4, wid: 1.9, wheelR: 0.37, weight: 1, level: 4, service: true,
    name: 'carClassic', want: [12, 18], tip: 1.0, patience: 50, chance: 2,
    colors: [0x6a2c3a, 0x2c4a3e, 0x3a3f66, 0x8a6a3a],
  },
  vip: {
    len: 6.8, wid: 1.9, wheelR: 0.35, weight: 0, level: 5, service: true,
    name: 'carVip', want: [16, 22], tip: 2.5, patience: 26, chance: 1,
    colors: [0x1d1b22, 0x2a2233, 0xf1ead8],
  },
};
