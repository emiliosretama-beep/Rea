// Libreta del negocio: pestañas de Mejoras y Proveedor.
import { t } from '../core/i18n.js';
import { fmtMoney } from '../game/state.js';
import { UPGRADES, LEVEL_AT, MAX_LEVEL, STAR_PERKS, tiersOf } from '../data/upgrades.js';

export function createNotebook(state, { onOpen, onClose, onBought, onUpgrade, onLegend }) {
  const $ = (id) => document.getElementById(id);
  const fuelBtn = $('btn-buy-fuel');
  const items = [
    { kind: 'soda', btn: $('btn-buy-soda'), have: $('order-soda-have'), msg: 'toastSodaBought' },
    { kind: 'snack', btn: $('btn-buy-snack'), have: $('order-snack-have'), msg: 'toastSnackBought' },
  ];
  const list = $('upgrade-list');
  const tabs = { upgrades: $('tab-upgrades'), supplier: $('tab-supplier'), goal: $('tab-goal') };
  const panes = { upgrades: $('pane-upgrades'), supplier: $('pane-supplier'), goal: $('pane-goal') };

  // Meta final: una fila por requisito
  const goalRows = ['stars', 'upgrades', 'served', 'earned'].map((id) => {
    const row = document.createElement('div');
    row.className = 'goal-row';
    row.innerHTML = '<i class="check">✓</i><b></b><span></span>';
    $('goal-list').append(row);
    return { id, row, name: row.querySelector('b'), val: row.querySelector('span') };
  });
  const perkRows = Object.keys(STAR_PERKS).map((n) => {
    const row = document.createElement('div');
    row.className = 'perk-row';
    row.innerHTML = `<i>${'★'.repeat(Number(n))}</i><span></span>`;
    $('perk-list').append(row);
    return { n: Number(n), row, text: row.querySelector('span') };
  });
  $('btn-legend').addEventListener('click', () => { if (state.legendReady()) { api.close(); onLegend(); } });
  let open = false;
  let tab = 'upgrades';

  // Una fila por mejora (se crean una vez; después solo cambia el texto)
  const rows = UPGRADES.map((u) => {
    const row = document.createElement('div');
    row.className = 'book-row';
    const info = document.createElement('div');
    const name = document.createElement('b');
    const desc = document.createElement('span');
    info.append(name, desc);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.addEventListener('click', () => { if (state.buyUpgrade(u.id)) onUpgrade(u); });
    row.append(info, btn);
    list.append(row);
    return { u, row, name, desc, btn };
  });

  function supplierLabel(btn, can, n, cost) {
    btn.disabled = can === 'full' || can === 'poor';
    btn.textContent = can === 'full' ? t('orderFull')
      : can === 'poor' ? t('orderPoor', { m: fmtMoney(cost) })
        : t(can === 'credit' ? 'orderCredit' : 'orderBuy', { n, m: fmtMoney(cost) });
  }

  function render() {
    if (!open) return;
    for (const k in tabs) {
      tabs[k].classList.toggle('on', k === tab);
      tabs[k].setAttribute('aria-selected', k === tab);
      panes[k].hidden = k !== tab;
    }
    $('book-money').textContent = fmtMoney(state.money);
    if (tab === 'upgrades') {
      const lv = state.level();
      const need = lv < MAX_LEVEL ? LEVEL_AT[lv] - state.upgradeCount() : 0;
      $('book-level').textContent = lv < MAX_LEVEL ? t('levelNext', { l: lv, n: need }) : t('levelMax', { l: lv });
      for (const r of rows) {
        const can = state.canBuyUpgrade(r.u);
        const tiers = tiersOf(r.u), tier = state.tier(r.u.id);
        r.name.textContent = tiers > 1 && tier > 0 ? `${t(`u_${r.u.id}`)} · ${t('tierN', { a: tier, b: tiers })}` : t(`u_${r.u.id}`);
        r.desc.textContent = t(`u_${r.u.id}_d`);
        r.row.classList.toggle('owned', can === 'owned');
        r.row.classList.toggle('locked', can === 'locked' || can === 'needs');
        r.btn.disabled = can !== 'ok';
        r.btn.textContent = can === 'owned' ? t('owned') : can === 'locked' ? t('needLevel', { l: r.u.level })
          : can === 'needs' ? t('needUpgrade', { u: t(`u_${r.u.needs}`) }) : fmtMoney(state.costOf(r.u));
      }
    } else if (tab === 'goal') {
      const checks = state.legendChecks();
      for (const g of goalRows) {
        const c = checks.find((x) => x.id === g.id);
        g.row.classList.toggle('ok', c.ok);
        g.name.textContent = t(`goal_${g.id}`);
        g.val.textContent = g.id === 'earned' ? `${fmtMoney(Math.min(c.have, c.need))} / ${fmtMoney(c.need)}` : `${Math.min(c.have, c.need)} / ${c.need}`;
      }
      $('btn-legend').hidden = !state.legendReady();
      $('goal-done').hidden = !state.legendary;
      const stars = state.stars();
      $('stars-now').textContent = t('starsNow', { n: stars });
      for (const p of perkRows) { p.row.classList.toggle('on', stars >= p.n); p.text.textContent = t(`perk${p.n}`); }
    } else {
      const f = state.fuelOrder();
      $('order-fuel-have').textContent = t('orderHave', { a: `${Math.floor(state.fuel)} ${t('unitGal')}`, b: state.fuelCap() });
      supplierLabel(fuelBtn, state.canBuyFuel(), `${f.gal} ${t('unitGal')}`, f.cost);
      for (const it of items) {
        const o = state.itemOrder(it.kind);
        it.have.textContent = t('orderHave', { a: state.stockOf(it.kind), b: state.itemCap(it.kind) });
        supplierLabel(it.btn, state.canBuyItem(it.kind), o.n, o.cost);
      }
    }
  }
  state.onChange(render);

  fuelBtn.addEventListener('click', () => {
    const n = state.fuelOrder().gal;
    if (state.buyFuel()) onBought('toastFuelBought', { n });
  });
  for (const it of items) {
    it.btn.addEventListener('click', () => {
      const n = state.itemOrder(it.kind).n;
      if (state.buyItem(it.kind)) onBought(it.msg, { n });
    });
  }
  for (const k in tabs) tabs[k].addEventListener('click', () => { tab = k; render(); });

  const api = {
    get isOpen() { return open; },
    open(which) {
      if (which) tab = which;
      open = true;
      document.body.classList.add('booking');
      render();
      onOpen();
    },
    close() { if (!open) return; open = false; document.body.classList.remove('booking'); onClose(); },
    render,
  };
  $('btn-book-close').addEventListener('click', api.close);
  return api;
}
