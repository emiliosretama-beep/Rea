// Ventana del proveedor: pedir gasolina y refrescos.
import { t } from '../core/i18n.js';
import { BAL } from '../config.js';
import { fmtMoney } from '../game/state.js';

export function createOrderPanel(state, { onOpen, onClose, onBought }) {
  const $ = (id) => document.getElementById(id);
  const fuelBtn = $('btn-buy-fuel'), sodaBtn = $('btn-buy-soda');
  let open = false;

  function label(btn, can, n, cost) {
    btn.disabled = can === 'full' || can === 'poor';
    btn.textContent = can === 'full' ? t('orderFull')
      : can === 'poor' ? t('orderPoor', { m: fmtMoney(cost) })
        : t(can === 'credit' ? 'orderCredit' : 'orderBuy', { n, m: fmtMoney(cost) });
  }
  function render() {
    if (!open) return;
    const f = state.fuelOrder(), s = state.sodaOrder();
    $('order-fuel-have').textContent = t('orderHave', { a: `${Math.floor(state.fuel)} ${t('unitGal')}`, b: BAL.fuelCap });
    $('order-soda-have').textContent = t('orderHave', { a: state.sodas, b: BAL.sodaCap });
    label(fuelBtn, state.canBuyFuel(), `${f.gal} ${t('unitGal')}`, f.cost);
    label(sodaBtn, state.canBuySodas(), s.n, s.cost);
  }
  state.onChange(render);

  fuelBtn.addEventListener('click', () => {
    const n = state.fuelOrder().gal;
    if (state.buyFuel()) onBought('toastFuelBought', { n });
  });
  sodaBtn.addEventListener('click', () => {
    const n = state.sodaOrder().n;
    if (state.buySodas()) onBought('toastSodaBought', { n });
  });

  const api = {
    get isOpen() { return open; },
    open() { open = true; document.body.classList.add('ordering'); render(); onOpen(); $('btn-order-close').focus(); },
    close() { if (!open) return; open = false; document.body.classList.remove('ordering'); onClose(); },
    render,
  };
  $('btn-order-close').addEventListener('click', api.close);
  return api;
}
