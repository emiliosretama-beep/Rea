// Conserje contratado: camina hasta la basura (rodeando los edificios), la recoge y sigue con la siguiente.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { buildPerson } from './people.js';
import { box, cyl, merge, vertexMat } from './geo.js';

const SPEED = 1.5;
const PICK_TIME = 0.9;
const HOME = { x: 9.4, z: -25.6 }; // junto a la cafetería, entre turnos

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

  const me = { x: HOME.x, z: HOME.z, route: null, blocking: false, target: null, pickT: 0, walkT: 0, yaw: 0, active: false };
  const PAD = 0.7;

  // Si la línea recta cruza un edificio, primero va a la esquina más conveniente
  function crosses(r, ax, az, bx, bz) {
    const minX = r.minX - PAD, maxX = r.maxX + PAD, minZ = r.minZ - PAD, maxZ = r.maxZ + PAD;
    for (let k = 0; k <= 20; k++) {
      const t = k / 20, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (x > minX && x < maxX && z > minZ && z < maxZ) return true;
    }
    return false;
  }
  function nextWaypoint(tx, tz) {
    for (const r of obstacles) {
      if (!crosses(r, me.x, me.z, tx, tz)) continue;
      const P = PAD + 0.1;
      const corners = [[r.minX - P, r.minZ - P], [r.maxX + P, r.minZ - P], [r.minX - P, r.maxZ + P], [r.maxX + P, r.maxZ + P]];
      let best = null, bestD = Infinity;
      for (const [cx, cz] of corners) {
        if (crosses(r, me.x, me.z, cx, cz)) continue;
        const d = Math.hypot(cx - me.x, cz - me.z) + Math.hypot(tx - cx, tz - cz);
        if (d < bestD) { bestD = d; best = [cx, cz]; }
      }
      if (best) return best;
    }
    return [tx, tz];
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
        if (me.pickT <= 0) { if (me.target) litter.pick(me.target.i); me.target = null; me.blocking = false; }
        return;
      }
      if (!me.target || !litter.isActive(me.target.i)) me.target = chooseTarget();
      const tx = me.target ? me.target.x : HOME.x, tz = me.target ? me.target.z : HOME.z;
      const [wx, wz] = nextWaypoint(tx, tz);
      const dx = wx - me.x, dz = wz - me.z, d = Math.hypot(dx, dz);
      const reach = me.target ? 0.55 : 0.05;
      if (wx === tx && wz === tz && d <= reach) {
        me.route = null;
        if (me.target) { me.pickT = PICK_TIME; me.blocking = true; }
        else person.pose(null);
      } else {
        const step = Math.min(d, SPEED * speedMult() * dt);
        me.x += (dx / d) * step; me.z += (dz / d) * step;
        me.yaw = Math.atan2(dx, dz);
        me.walkT += dt;
        me.route = true;
        person.pose(me.walkT);
      }
      person.root.position.set(me.x, 0.08, me.z);
      person.root.rotation.y = me.yaw;
    },
  };
}
