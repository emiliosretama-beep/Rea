// Mejoras de la estación. level: nivel necesario para comprarla.
// Los efectos viven en game/state.js y game/customers.js; lo visual en world/upgrades3d.js.
//  costs: si la mejora tiene varios niveles (se compra varias veces), el precio de cada uno
export const UPGRADES = [
  { id: 'storage', level: 1, cost: 12, costs: [12, 60] },
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
  // Mejoras por niveles: el dinero siempre tiene en qué usarse
  { id: 'fastPumps', level: 2, cost: 30, costs: [30, 60, 110] },
  { id: 'training', level: 3, cost: 40, costs: [40, 80, 130], needs: 'helper' },
  { id: 'premium', level: 3, cost: 35, costs: [35, 70, 120], needs: 'shop' },
];

// Cuántos niveles tiene una mejora
export const tiersOf = (u) => (u.costs ? u.costs.length : 1);

// Estrellas de reputación: reputación mínima para 1, 2, 3, 4 y 5 estrellas
export const STAR_AT = [0, 25, 45, 65, 82];
// Ventaja que da cada estrella (mientras la mantengas)
export const STAR_PERKS = { 2: 'perk2', 3: 'perk3', 4: 'perk4', 5: 'perk5' };

// Meta final: "Parada legendaria de la Ruta 66"
export const LEGEND = { stars: 5, served: 150, earned: 600 };

// Mejoras compradas necesarias para estar en el nivel 1, 2, 3, 4 y 5
export const LEVEL_AT = [0, 2, 4, 7, 11];
export const MAX_LEVEL = LEVEL_AT.length;
