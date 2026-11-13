// Mejoras de la estación. level: nivel necesario para comprarla.
// Los efectos viven en game/state.js y game/customers.js; lo visual en world/upgrades3d.js.
export const UPGRADES = [
  { id: 'storage', level: 1, cost: 12 },
  { id: 'pump2', level: 1, cost: 25 },
  { id: 'neon', level: 1, cost: 25 },
  { id: 'parking', level: 2, cost: 30 },
  { id: 'janitor', level: 2, cost: 35 },
  { id: 'shop', level: 2, cost: 35 },
  { id: 'helper', level: 3, cost: 50 },
  { id: 'cafe', level: 3, cost: 55 },
  { id: 'carwash', level: 4, cost: 70 },
  { id: 'garage', level: 4, cost: 85 },
  // Personal: hacen solos una parte del trabajo. needs: mejora que tiene que existir antes
  { id: 'cashier', level: 3, cost: 45 },
  { id: 'barista', level: 4, cost: 40, needs: 'cafe' },
  { id: 'mechanic', level: 4, cost: 65, needs: 'garage' },
];

// Mejoras compradas necesarias para estar en el nivel 1, 2, 3, 4 y 5
export const LEVEL_AT = [0, 2, 4, 7, 10];
export const MAX_LEVEL = LEVEL_AT.length;
