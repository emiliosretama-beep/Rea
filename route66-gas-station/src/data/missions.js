// Misiones en cadena. Cada una escucha un evento del juego y cuenta hasta "n".
//  on: evento que suma · if: condición · resetOn: evento que reinicia la cuenta
//  strict: si el evento llega y no cumple "if", la cuenta vuelve a cero (rachas)
//  unit: 'money' (suma dinero) o 'time' (suma segundos mientras se cumple "if")
//  value: en vez de contar eventos, el avance se lee del estado
export const MISSIONS = [
  // Restauración inicial
  { id: 'boards', text: 'mBoards', n: 6, value: (s) => s.boards, money: 2, rep: 0 },
  { id: 'power', text: 'mPower', n: 1, value: (s) => (s.power ? 1 : 0), money: 3, rep: 0 },
  { id: 'cleanup', text: 'mCleanup', n: 16, value: (s) => s.litterPicked, money: 5, rep: 5 },
  { id: 'open', text: 'mOpen', n: 1, value: (s) => (s.open ? 1 : 0), money: 0, rep: 5 },
  // Primeros clientes
  { id: 'serve3', text: 'mServe', n: 3, on: 'served', money: 2, rep: 2 },
  { id: 'buy1', text: 'mBuyFirst', n: 1, value: (s) => s.upgradeCount(), money: 3, rep: 1 },
  { id: 'perfect1', text: 'mPerfect', n: 1, on: 'served', if: (d) => d.quality === 'perfect', money: 2, rep: 2 },
  { id: 'sale2', text: 'mSale', n: 2, on: 'sale', money: 3, rep: 2 },
  { id: 'soda5', text: 'mSoda', n: 5, on: 'soldSoda', money: 3, rep: 2 },
  { id: 'order1', text: 'mOrder', n: 1, on: 'order', money: 2, rep: 1 },
  { id: 'level2', text: 'mLevel', n: 2, value: (s) => s.level(), money: 5, rep: 2 },
  { id: 'truck1', text: 'mTruck', n: 1, on: 'served', if: (d) => d.typeId === 'truck', money: 4, rep: 2 },
  { id: 'streak5', text: 'mStreak', n: 5, on: 'served', resetOn: 'angry', money: 5, rep: 3 },
  { id: 'litter4', text: 'mLitter', n: 4, on: 'litter', money: 2, rep: 2 },
  { id: 'earn40', text: 'mEarn', n: 40, on: 'earn', unit: 'money', money: 6, rep: 2 },
  { id: 'level3', text: 'mLevel', n: 3, value: (s) => s.level(), money: 8, rep: 3 },
  { id: 'rep65', text: 'mHoldRep', n: 60, on: 'tick', unit: 'time', if: (d, s) => s.rep >= 65, strict: true, money: 8, rep: 3 },
  { id: 'perfect3', text: 'mPerfectRow', n: 3, on: 'served', if: (d) => d.quality === 'perfect', strict: true, money: 8, rep: 3 },
  { id: 'level4', text: 'mLevel', n: 4, value: (s) => s.level(), money: 12, rep: 3 },
  { id: 'service4', text: 'mService', n: 4, on: 'service', money: 10, rep: 3 },
  { id: 'level5', text: 'mLevel', n: 5, value: (s) => s.level(), money: 15, rep: 4 },
  { id: 'vip1', text: 'mVip', n: 1, on: 'served', if: (d) => d.typeId === 'vip', money: 15, rep: 5 },
  { id: 'all', text: 'mAll', n: 10, value: (s) => s.upgradeCount(), money: 25, rep: 5 },
];

// Cuando se acaba la cadena, esta se repite
export const LOOP_MISSION = { id: 'loop', text: 'mServe', n: 10, on: 'served', money: 6, rep: 2 };
