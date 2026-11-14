// Conserje contratado: camina hasta la basura (rodeando los edificios con una búsqueda de camino),
// la recoge y sigue con la siguiente. Entre turnos espera junto a la cafetería.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { buildPerson } from './people.js';
import { box, cyl, merge, vertexMat } from './geo.js';

const SPEED = 1.5;
const PICK_TIME = 0.9;
const HOME = { x: 9.4, z: -25.6 };
const PAD = 0.6; // distancia que guarda con las paredes

// Cuadrícula de 1 m sobre todo el terreno cercado
const GX0 = -38, GZ0 = -40, CELL = 1, GW = 77, GH = 34;

// obstacles: rectángulos { minX, maxX, minZ, maxZ } que hay que rodear
export function createJanitor(scene, litter, obstacles, speedMult = () => 1) {
  const person = buildPerson(0x6f8fb8);
  // Escoba en la mano
  const broom = new THREE.Mesh(merge([
    cyl(0.025, 0.025, 1.5, 6, PAL.wood, 0, 0, 0),
    box(0.4, 0.14, 0.08, 0xc9a24a, 0, -0.78, 0),
  ]), vertexMat);
  broom.position.set(0.36, 0.95, 0.15);
  broom.rotation.x = 0.35;
  person.root.add(broom);
  person.root.visible = false;
  scene.add(person.root);

  const me = {
    x: HOME.x, z: HOME.z, yaw: 0, walkT: 0, pickT: 0, active: false,
    target: null, path: null, pathFor: '',
    route: null, blocking: false, // los autos frenan por él si camina o está recogiendo
  };

  // ----- Mapa de celdas bloqueadas -----
  const blocked = new Uint8Array(GW * GH);
  for (let gz = 0; gz < GH; gz++) {
    for (let gx = 0; gx < GW; gx++) {
      const x = GX0 + gx * CELL + 0.5, z = GZ0 + gz * CELL + 0.5;
      for (const r of obstacles) {
        if (x > r.minX - PAD && x < r.maxX + PAD && z > r.minZ - PAD && z < r.maxZ + PAD) { blocked[gz * GW + gx] = 1; break; }
      }
    }
  }
  const cellOf = (x, z) => [
    Math.max(0, Math.min(GW - 1, Math.floor((x - GX0) / CELL))),
    Math.max(0, Math.min(GH - 1, Math.floor((z - GZ0) / CELL))),
  ];
  const center = (i) => [GX0 + (i % GW) * CELL + 0.5, GZ0 + Math.floor(i / GW) * CELL + 0.5];

  // ¿Se puede ir en línea recta de A a B sin pisar celdas bloqueadas?
  function clear(ax, az, bx, bz) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.4);
    for (let k = 1; k < n; k++) {
      const [gx, gz] = cellOf(ax + (bx - ax) * (k / n), az + (bz - az) * (k / n));
      if (blocked[gz * GW + gx]) return false;
    }
    return true;
  }

  // A* sobre la cuadrícula. Devuelve los puntos del camino ya suavizado (solo las vueltas necesarias).
  function findPath(tx, tz) {
    if (clear(me.x, me.z, tx, tz)) return [[tx, tz]];
    const [sx, sz] = cellOf(me.x, me.z), [ex, ez] = cellOf(tx, tz);
    const start = sz * GW + sx, goal = ez * GW + ex;
    const g = new Float32Array(GW * GH).fill(Infinity);
    const from = new Int32Array(GW * GH).fill(-1);
    const inOpen = new Uint8Array(GW * GH);
    const open = [start];
    g[start] = 0; inOpen[start] = 1;
    const h = (i) => Math.hypot((i % GW) - ex, Math.floor(i / GW) - ez);
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (g[open[k]] + h(open[k]) < g[open[bi]] + h(open[bi])) bi = k;
      const cur = open[bi];
      open[bi] = open[open.length - 1]; open.pop(); inOpen[cur] = 0;
      if (cur === goal) break;
      const cx = cur % GW, cz = Math.floor(cur / GW);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= GW || nz >= GH) continue;
          const ni = nz * GW + nx;
          // La celda de inicio y la de la basura se permiten aunque estén pegadas a una pared
          if (blocked[ni] && ni !== goal) continue;
          if (dx && dz && (blocked[cz * GW + nx] || blocked[nz * GW + cx])) continue; // no cortar esquinas
          const ng = g[cur] + (dx && dz ? 1.414 : 1);
          if (ng < g[ni]) {
            g[ni] = ng; from[ni] = cur;
            if (!inOpen[ni]) { inOpen[ni] = 1; open.push(ni); }
          }
        }
      }
    }
    if (goal !== start && from[goal] < 0) return null; // no hay camino
    const cells = [];
    for (let i = goal; i !== -1 && i !== start; i = from[i]) cells.push(i);
    cells.reverse();
    const pts = cells.map(center);
    if (pts.length) pts[pts.length - 1] = [tx, tz];
    else pts.push([tx, tz]);
    // Suavizar: desde cada punto, saltar al más lejano que se vea en línea recta
    const out = [];
    let ax = me.x, az = me.z, k = 0;
    while (k < pts.length) {
      let far = k;
      for (let j = pts.length - 1; j > k; j--) if (clear(ax, az, pts[j][0], pts[j][1])) { far = j; break; }
      out.push(pts[far]);
      [ax, az] = pts[far];
      k = far + 1;
    }
    return out;
  }

  function chooseTarget() {
    let best = null, bestD = Infinity;
    for (const s of litter.activeSpots()) {
      const d = Math.hypot(s.x - me.x, s.z - me.z);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  return {
    walker: me,
    enable() { me.active = true; person.root.visible = true; },
    update(dt) {
      if (!me.active) return;
      // Recogiendo
      if (me.pickT > 0) {
        me.pickT -= dt;
        person.pose(null, 0, false, Math.sin(Math.min(1, (PICK_TIME - me.pickT) / PICK_TIME) * Math.PI));
        if (me.pickT <= 0) { if (me.target) litter.pick(me.target.i); me.target = null; me.blocking = false; me.path = null; }
        return;
      }
      if (!me.target || !litter.isActive(me.target.i)) { me.target = chooseTarget(); me.path = null; }
      const tx = me.target ? me.target.x : HOME.x, tz = me.target ? me.target.z : HOME.z;
      const key = `${tx},${tz}`;
      if (!me.path || me.pathFor !== key) { me.path = findPath(tx, tz) || [[tx, tz]]; me.pathFor = key; }

      const [wx, wz] = me.path[0];
      const dx = wx - me.x, dz = wz - me.z, d = Math.hypot(dx, dz);
      const lastPoint = me.path.length === 1;
      const reach = lastPoint ? (me.target ? 0.55 : 0.05) : 0.15;
      if (d <= reach) {
        if (!lastPoint) me.path.shift();
        else {
          me.route = null;
          if (me.target) { me.pickT = PICK_TIME; me.blocking = true; } else person.pose(null);
        }
      } else {
        const step = Math.min(d, SPEED * speedMult() * dt);
        me.x += (dx / d) * step; me.z += (dz / d) * step;
        me.yaw = Math.atan2(dx, dz);
        me.walkT += dt;
        me.route = true;
        person.pose(me.walkT);
      }
      // Seguro: si por algo la posición se volviera inválida, regresa a su lugar en vez de desaparecer
      if (!Number.isFinite(me.x) || !Number.isFinite(me.z)) { me.x = HOME.x; me.z = HOME.z; me.target = null; me.path = null; }
      person.root.position.set(me.x, 0.08, me.z);
      person.root.rotation.y = me.yaw;
    },
  };
}
