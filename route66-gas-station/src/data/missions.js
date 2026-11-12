// Misiones en cadena. Cada una escucha un evento del juego y cuenta hasta "n".
//  on: evento que suma · if: condición · resetOn: evento que reinicia la cuenta
//  strict: si el evento llega y no cumple "if", la cuenta vuelve a cero (rachas)
//  unit: 'money' (suma dinero) o 'time' (suma segundos mientras se cumple "if")
export const MISSIONS = [
  { id: 'serve3', text: 'mServe', n: 3, on: 'served', money: 2, rep: 2 },
  { id: 'litter4', text: 'mLitter', n: 4, on: 'litter', money: 1.5, rep: 2 },
  { id: 'perfect1', text: 'mPerfect', n: 1, on: 'served', if: (d) => d.quality === 'perfect', money: 2, rep: 2 },
  { id: 'soda3', text: 'mSoda', n: 3, on: 'served', if: (d) => d.soda, money: 3, rep: 2 },
  { id: 'order1', text: 'mOrder', n: 1, on: 'order', money: 2, rep: 1 },
  { id: 'streak5', text: 'mStreak', n: 5, on: 'served', resetOn: 'angry', money: 5, rep: 3 },
  { id: 'earn25', text: 'mEarn', n: 25, on: 'earn', unit: 'money', money: 5, rep: 2 },
  { id: 'rep65', text: 'mHoldRep', n: 60, on: 'tick', unit: 'time', if: (d, s) => s.rep >= 65, strict: true, money: 8, rep: 3 },
  { id: 'perfect3', text: 'mPerfectRow', n: 3, on: 'served', if: (d) => d.quality === 'perfect', strict: true, money: 6, rep: 3 },
  { id: 'serve15', text: 'mServe', n: 15, on: 'served', money: 10, rep: 4 },
];

// Cuando se acaba la cadena, esta se repite (la Etapa 4 agrega más misiones)
export const LOOP_MISSION = { id: 'loop', text: 'mServe', n: 10, on: 'served', money: 6, rep: 2 };
