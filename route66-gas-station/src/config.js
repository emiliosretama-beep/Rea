// Constantes generales del juego. Cambiar números aquí, no en la lógica.
export const CFG = {
  version: 'DEV 0.1 · Etapa 1',
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

  // Zona caminable (la carretera queda fuera: limite en el acotamiento)
  bounds: { minX: -48, maxX: 48, minZ: -58, maxZ: -6.6 },

  // Carretera: corre a lo largo del eje X, centrada en z = 0
  road: { width: 10, length: 640, laneZ: 2.5 },

  debugFps: true,
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
