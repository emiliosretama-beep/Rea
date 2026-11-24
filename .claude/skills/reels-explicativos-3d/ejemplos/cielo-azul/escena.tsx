// Reel de ejemplo: "¿Por que el cielo es azul y el atardecer naranja?"
// Cada visual recibe { frames, extra } y usa SOLO useCurrentFrame para animar.
// Coordenadas: la camara a z=10 ve ~4 x 7.3 unidades. Los subtitulos ocupan la franja
// de y≈-1 (pantalla 1240 px), asi que lo importante va de y=0 hacia arriba.
import React from "react";
import { interpolate, interpolateColors, useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { PropsEscena } from "../tipos";
import {
  Atmosfera,
  Brillo,
  Camara,
  Escena3D,
  Etiqueta3D,
  FONDOS,
  Flecha,
  Globo,
  Onda,
  Particulas,
  Rayo,
  Titular,
  azar,
  progreso,
  rebote,
} from "../kit";

type V3 = [number, number, number];
const ARCOIRIS = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#5e5ce6"];
const AZUL = "#3d8bff";

// ------------------------------------------------------------ piezas compartidas

/** Sol con nucleo, corona y halo. `calor` 0 = blanco-amarillo, 1 = naranja de atardecer. */
const Sol: React.FC<{ posicion: V3; radio?: number; calor?: number }> = ({ posicion, radio = 0.6, calor = 0 }) => {
  const nucleo = interpolateColors(calor, [0, 1], ["#fff6d6", "#ffb15c"]);
  const halo = interpolateColors(calor, [0, 1], ["#ffe9a8", "#ff6a1f"]);
  return (
    <group position={posicion}>
      <mesh>
        <sphereGeometry args={[radio, 48, 48]} />
        <meshBasicMaterial color={nucleo} toneMapped={false} />
      </mesh>
      <Brillo color={halo} tamano={radio * 6} opacidad={0.9} />
      <Brillo color={halo} tamano={radio * 14} opacidad={0.35} />
    </group>
  );
};

/** Horizonte curvo (un planeta enorme) con brillo de atmosfera en el borde. */
const Horizonte: React.FC<{ calor: number }> = ({ calor }) => (
  <group position={[0, -31.2, -6]}>
    <mesh>
      <sphereGeometry args={[30, 128, 64]} />
      <meshStandardMaterial color={interpolateColors(calor, [0, 1], ["#16324f", "#1a0f22"])} roughness={0.9} />
    </mesh>
    <Atmosfera radio={31.2} radioInterior={30} color={interpolateColors(calor, [0, 1], ["#8fd0ff", "#ff7a2e"])} fuerza={1.5} />
  </group>
);

// ------------------------------------------------------------ 1. gancho

const Gancho: React.FC<PropsEscena> = ({ frames }) => {
  const frame = useCurrentFrame();
  const calor = progreso(frame, frames * 0.25, frames * 0.6);
  const fondo = {
    arriba: interpolateColors(calor, [0, 1], [FONDOS.cielo.arriba, FONDOS.atardecer.arriba]),
    abajo: interpolateColors(calor, [0, 1], [FONDOS.cielo.abajo, FONDOS.atardecer.abajo]),
    brillo: interpolateColors(calor, [0, 1], ["#ffffff", "#ffd27a"]),
  };
  const ySol = interpolate(calor, [0, 1], [2.6, 0.15]);
  return (
    <Escena3D
      frames={frames}
      fondo={fondo}
      bloom={1.1}
      fundido={false}
      frente={<Titular texto="¿Por qué?" desde={2} y={330} tamano={150} />}
    >
      <Camara tipo="dolly" desde={[0, 0.4, 11]} hasta={[0, 0.6, 9]} mira={[0, 0.6, 0]} frames={frames} />
      <Sol posicion={[0.6, ySol, -4]} radio={0.7} calor={calor} />
      <Horizonte calor={calor} />
      <Particulas cantidad={70} radio={0.014} zona={[9, 9, 4]} centro={[0, 1, -1]} colores={["#ffffff", "#ffe2b8"]} brillo={0.9} opacidad={0.8} />
    </Escena3D>
  );
};

// ------------------------------------------------------------ 2. la luz blanca es todos los colores

const BORDE_PRISMA = new THREE.CylinderGeometry(0.95, 0.95, 1.6, 3);

const Prisma: React.FC<{ posicion: V3; giro: number; escala: number }> = ({ posicion, giro, escala }) => (
  <group position={posicion} rotation={[Math.PI / 2, giro, 0]} scale={escala}>
    <mesh>
      <cylinderGeometry args={[0.95, 0.95, 1.6, 3]} />
      <meshPhysicalMaterial color="#cfe8ff" emissive="#20406a" roughness={0.05} metalness={0} transparent opacity={0.5} clearcoat={1} />
    </mesh>
    <lineSegments>
      <edgesGeometry args={[BORDE_PRISMA]} />
      <lineBasicMaterial color="#ffffff" toneMapped={false} />
    </lineSegments>
  </group>
);

const LuzBlanca: React.FC<PropsEscena> = ({ frames }) => {
  const frame = useCurrentFrame();
  const centro: V3 = [0, 1.0, 0];
  const entra = progreso(frame, 4, 18);
  return (
    <Escena3D frames={frames} fondo={FONDOS.noche} bloom={1.2}>
      <Camara tipo="orbita" radio={10} altura={1.2} vueltas={0.05} anguloInicial={-0.12} mira={[0, 0.8, 0]} frames={frames} />
      <Prisma posicion={centro} giro={Math.PI / 6 + Math.sin(frame / 50) * 0.08} escala={rebote(frame, 0, 14) * 0.9} />
      <Rayo desde={[-4.5, 1.6, 0]} hasta={[-0.35, 1.05, 0]} grosor={0.07} progreso={entra} />
      {ARCOIRIS.map((c, i) => {
        const p = progreso(frame, 20 + i * 3, 22);
        const y = 1.45 - i * 0.32;
        return <Rayo key={c} desde={[0.35, 0.95, 0]} hasta={[4.6, y, 0]} color={c} grosor={0.05} progreso={p} intensidad={3} />;
      })}
      <Etiqueta3D texto="LUZ BLANCA" posicion={[-0.9, 2.55, 0]} alto={0.36} opacidad={progreso(frame, 8, 10)} />
      <Etiqueta3D texto="= TODOS LOS COLORES" posicion={[0.3, 3.1, 0]} alto={0.36} color="#ffd60a" opacidad={progreso(frame, 40, 10)} />
      <Particulas cantidad={60} radio={0.015} zona={[10, 10, 6]} colores={["#9fb6ff"]} brillo={0.8} opacidad={0.7} />
    </Escena3D>
  );
};

// ------------------------------------------------------------ 3. cada color es una onda

const Ondas: React.FC<PropsEscena> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Escena3D frames={frames} fondo={FONDOS.estudio} bloom={1.0}>
      <Camara tipo="grua" desde={[-1.2, 1.4, 9.5]} hasta={[1.2, 1.1, 8.5]} miraDesde={[0, 0.75, 0]} frames={frames} />
      <Onda desde={[-2.6, 2.5, 0]} hasta={[2.6, 2.5, 0]} longitud={0.42} amplitud={0.26} color={AZUL} grosor={0.055} progreso={progreso(frame, 4, 26)} />
      <Onda desde={[-2.6, 1.0, 0]} hasta={[2.6, 1.0, 0]} longitud={1.35} amplitud={0.34} color="#ff4d3d" grosor={0.055} progreso={progreso(frame, 26, 26)} />
      <Etiqueta3D texto="AZUL · ONDA CORTA" posicion={[0, 3.2, 0]} alto={0.34} color="#9cc4ff" opacidad={progreso(frame, 10, 10)} />
      <Etiqueta3D texto="ROJO · ONDA LARGA" posicion={[0, 0.3, 0]} alto={0.34} color="#ffb0a6" opacidad={progreso(frame, 34, 10)} />
    </Escena3D>
  );
};

// ------------------------------------------------------------ 4. el aire desvia el azul

const Molecula: React.FC<{ posicion: V3; color: string; giro: number }> = ({ posicion, color, giro }) => (
  <group position={posicion} rotation={[giro * 0.7, giro, 0]}>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.11, 0, 0]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshPhysicalMaterial color={color} roughness={0.25} clearcoat={1} />
      </mesh>
    ))}
  </group>
);

const Choque: React.FC<PropsEscena> = ({ frames }) => {
  const frame = useCurrentFrame();
  const centro: V3 = [0, 1.0, 0];
  const moleculas = Array.from({ length: 16 }, (_, i) => {
    const r = (k: number) => azar(i * 11.3 + k);
    const p: V3 = [(r(1) - 0.5) * 4.2, 1.0 + (r(2) - 0.5) * 3.4, (r(3) - 0.5) * 2];
    return { p, color: i % 4 === 0 ? "#ff8a80" : "#b9c7ff", giro: frame * 0.02 + r(4) * 6 };
  });
  const golpe = 22;
  return (
    <Escena3D frames={frames} fondo={FONDOS.laboratorio} bloom={1.25}>
      <Camara tipo="orbita" radio={9} altura={1.6} vueltas={0.08} anguloInicial={0.1} mira={[0, 1, 0]} frames={frames} />
      {moleculas.map((m, i) => (
        <Molecula key={i} posicion={m.p} color={m.color} giro={m.giro} />
      ))}
      <Rayo desde={[-4.5, 1.0, 0]} hasta={centro} grosor={0.07} progreso={progreso(frame, 0, golpe)} />
      {/* el rojo sigue casi recto */}
      <Rayo desde={centro} hasta={[4.5, 0.85, 0]} color="#ff5a3c" grosor={0.06} progreso={progreso(frame, golpe, 24)} intensidad={3} />
      {/* el azul sale disparado en todas direcciones */}
      {Array.from({ length: 7 }, (_, i) => {
        const ang = (i / 7) * Math.PI * 2 + 0.4;
        const largo = 1.5 + azar(i) * 0.6;
        const fin: V3 = [centro[0] + Math.cos(ang) * largo, centro[1] + Math.sin(ang) * largo, Math.sin(ang * 2) * 0.6];
        return <Flecha key={i} desde={centro} hasta={fin} color={AZUL} grosor={0.05} progreso={progreso(frame, golpe + 4 + i * 2, 16)} brillo={2.2} />;
      })}
      <Particulas
        cantidad={140}
        radio={0.035}
        colores={[AZUL, "#7fb2ff", "#8f7bff"]}
        brillo={1.6}
        posicion={(i, f, r) => {
          const inicio = golpe + r(1) * (frames - golpe);
          const t = Math.max(0, f - inicio);
          if (t <= 0) return [99, 99, 99];
          const dir = [r(2) - 0.5, r(3) - 0.5, r(4) - 0.5];
          const n = Math.hypot(dir[0], dir[1], dir[2]) || 1;
          const d = t * 0.07;
          return [centro[0] + (dir[0] / n) * d, centro[1] + (dir[1] / n) * d, centro[2] + (dir[2] / n) * d];
        }}
      />
      <Brillo posicion={centro} color="#cfe2ff" tamano={1.6 * progreso(frame, golpe - 2, 6)} />
      <Etiqueta3D texto="N₂" posicion={[moleculas[1].p[0], moleculas[1].p[1] + 0.4, moleculas[1].p[2]]} alto={0.32} opacidad={progreso(frame, 6, 10)} />
      <Etiqueta3D texto="O₂" posicion={[moleculas[4].p[0], moleculas[4].p[1] + 0.4, moleculas[4].p[2]]} alto={0.32} opacidad={progreso(frame, 10, 10)} />
    </Escena3D>
  );
};

// ------------------------------------------------------------ 5. el azul llega desde todo el cielo

const CentroGlobo: V3 = [0, 0.9, 0];

const CieloAzul: React.FC<PropsEscena> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Escena3D frames={frames} fondo={FONDOS.noche} bloom={1.1}>
      <Camara tipo="orbita" radio={8.5} altura={1.2} vueltas={0.08} mira={CentroGlobo} frames={frames} />
      <Sol posicion={[7, 2.4, -6]} radio={0.5} />
      <Globo radio={1.55} posicion={CentroGlobo} giro={frame * 0.006} atmosfera="#5aaeff" grosorAtmosfera={0.14} />
      <Rayo desde={[6, 2.2, -5]} hasta={[1.4, 1.2, 0]} grosor={0.05} progreso={progreso(frame, 0, 20)} />
      <Particulas
        cantidad={220}
        radio={0.028}
        colores={[AZUL, "#8fc6ff"]}
        brillo={1.6}
        posicion={(i, f, r) => {
          // fotones azules rebotando dentro de la capa de aire
          const lat = (r(1) - 0.5) * Math.PI;
          const lon = r(2) * Math.PI * 2 + f * 0.01 * (0.3 + r(3));
          const rad = 1.6 + r(4) * 0.22 + Math.sin(f * 0.15 + r(5) * 6) * 0.03;
          return [
            CentroGlobo[0] + Math.cos(lat) * Math.cos(lon) * rad,
            CentroGlobo[1] + Math.sin(lat) * rad,
            CentroGlobo[2] + Math.cos(lat) * Math.sin(lon) * rad,
          ];
        }}
      />
      <Etiqueta3D texto="EL AZUL REBOTA EN TODO EL CIELO" posicion={[0, 3.05, 0]} alto={0.22} opacidad={progreso(frame, 14, 12)} />
    </Escena3D>
  );
};

// ------------------------------------------------------------ 6. al atardecer la luz cruza ~40 veces mas aire

const Atardecer: React.FC<PropsEscena> = ({ frames }) => {
  const frame = useCurrentFrame();
  const R = 1.25;
  const cima: V3 = [CentroGlobo[0], CentroGlobo[1] + R, 0];
  const pasos = 10;
  const largoHaz = progreso(frame, 18, 40);
  return (
    <Escena3D frames={frames} fondo={FONDOS.atardecer} bloom={1.2}>
      <Camara tipo="grua" desde={[0, 1.5, 10.5]} hasta={[0.5, 1.9, 9]} miraDesde={[0, 1.4, 0]} miraHasta={[0.4, 1.7, 0]} frames={frames} />
      <Globo radio={R} posicion={CentroGlobo} giro={0.8} atmosfera="#ff9a4a" grosorAtmosfera={0.22} />
      <Sol posicion={[7.5, cima[1] + 0.1, -3]} radio={0.55} calor={0.8} />
      {/* tu, mirando el atardecer */}
      <mesh position={[cima[0], cima[1] + 0.08, 0]}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <Etiqueta3D texto="TÚ" posicion={[cima[0] - 0.55, cima[1] + 0.2, 0]} alto={0.24} opacidad={progreso(frame, 4, 10)} />
      {/* mediodia: camino corto y vertical */}
      <Rayo desde={[0, 5, 0]} hasta={[cima[0], cima[1] + 0.1, 0]} grosor={0.035} progreso={progreso(frame, 2, 14)} intensidad={1} />
      <Etiqueta3D texto="MEDIODÍA: POCO AIRE" posicion={[-0.4, 3.75, 0]} alto={0.22} opacidad={progreso(frame, 8, 10)} />
      {/* atardecer: entra de lado, el color pasa de blanco a naranja por el camino */}
      {Array.from({ length: pasos }, (_, i) => {
        const a = i / pasos;
        const b = (i + 1) / pasos;
        const x0 = 4.8 - a * 4.7;
        const x1 = 4.8 - b * 4.7;
        const visible = Math.min(1, Math.max(0, (largoHaz - a) * pasos));
        const color = interpolateColors(a, [0, 0.5, 1], ["#ffffff", "#ffd27a", "#ff6a1f"]);
        return <Rayo key={i} desde={[x0, cima[1] + 0.1, 0]} hasta={[x1, cima[1] + 0.1, 0]} color={color} grosor={0.07} progreso={visible} intensidad={1.8} />;
      })}
      <Particulas
        cantidad={90}
        radio={0.03}
        colores={[AZUL, "#8fc6ff"]}
        brillo={1.6}
        posicion={(i, f, r) => {
          // el azul se va "cayendo" del haz a lo largo del camino
          const x = 4.6 - r(1) * 4.4;
          const nace = 18 + ((4.8 - x) / 4.7) * 40;
          const t = Math.max(0, f - nace);
          if (t <= 0) return [99, 99, 99];
          return [x + (r(2) - 0.5) * t * 0.03, cima[1] + 0.1 + (r(3) - 0.35) * t * 0.05, (r(4) - 0.5) * t * 0.05];
        }}
      />
      <Etiqueta3D texto="ATARDECER: ≈ 40 VECES MÁS AIRE" posicion={[0.55, cima[1] + 0.8, 0]} alto={0.22} color="#ffd27a" opacidad={progreso(frame, 40, 12)} />
    </Escena3D>
  );
};

// ------------------------------------------------------------ 7. cierre

const Cierre: React.FC<PropsEscena> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Escena3D
      frames={frames}
      fondo={FONDOS.atardecer}
      bloom={1.2}
      frente={<Titular texto="Sígueme para más porqués" desde={Math.round(frames * 0.45)} y={330} tamano={96} color="#111" fondo="#ffcc33" />}
    >
      <Camara tipo="dolly" desde={[0, 0.7, 9.5]} hasta={[0, 0.5, 8]} mira={[0, 0.5, 0]} frames={frames} />
      <Sol posicion={[0, interpolate(frame, [0, frames], [0.55, 0.05]), -4]} radio={0.85} calor={1} />
      <Horizonte calor={1} />
      <Particulas cantidad={70} radio={0.016} zona={[9, 9, 4]} centro={[0, 1, -1]} colores={["#ffd8a8", "#ff9a5a"]} brillo={1} modo="flotar" />
    </Escena3D>
  );
};

// El archivo de escenas de cada reel exporta por defecto { nombreDelVisual: Componente }.
export default {
  gancho: Gancho,
  "luz-blanca": LuzBlanca,
  ondas: Ondas,
  choque: Choque,
  "cielo-azul": CieloAzul,
  atardecer: Atardecer,
  cierre: Cierre,
};
