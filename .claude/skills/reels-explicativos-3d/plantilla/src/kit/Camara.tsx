import React from "react";
import { useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import { Easing, interpolate } from "remotion";
import { respira } from "./tiempo";

type V3 = [number, number, number];

export type MovimientoCamara =
  | { tipo: "fija"; posicion: V3; mira?: V3 }
  | { tipo: "orbita"; radio: number; altura?: number; vueltas?: number; anguloInicial?: number; mira?: V3 }
  | { tipo: "dolly"; desde: V3; hasta: V3; mira?: V3 } // acercar o alejar en linea recta
  | { tipo: "grua"; desde: V3; hasta: V3; miraDesde?: V3; miraHasta?: V3 }; // mueve tambien el punto que mira

type Props = MovimientoCamara & {
  frames: number;
  /** Movimiento de "camara en mano" muy leve (0 = nada). */
  pulso?: number;
  /** Curva del movimiento. Por defecto acelera y frena suave. */
  curva?: (t: number) => number;
};

const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * Mueve la camara por fotograma. Se aplica durante el render (no en un efecto) para que
 * el fotograma que se graba ya tenga la camara en su sitio.
 */
export const Camara: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const curva = props.curva ?? Easing.inOut(Easing.cubic);
  const t = interpolate(frame, [0, Math.max(1, props.frames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: curva,
  });

  let pos: V3 = [0, 0, 10];
  let mira: V3 = [0, 0, 0];
  switch (props.tipo) {
    case "fija":
      pos = props.posicion;
      mira = props.mira ?? [0, 0, 0];
      break;
    case "orbita": {
      // la orbita va lineal para que no se note el frenazo
      const lineal = frame / Math.max(1, props.frames);
      const ang = (props.anguloInicial ?? 0) + lineal * (props.vueltas ?? 0.15) * Math.PI * 2;
      pos = [Math.sin(ang) * props.radio, props.altura ?? 0, Math.cos(ang) * props.radio];
      mira = props.mira ?? [0, 0, 0];
      break;
    }
    case "dolly":
      pos = lerp3(props.desde, props.hasta, t);
      mira = props.mira ?? [0, 0, 0];
      break;
    case "grua":
      pos = lerp3(props.desde, props.hasta, t);
      mira = lerp3(props.miraDesde ?? [0, 0, 0], props.miraHasta ?? props.miraDesde ?? [0, 0, 0], t);
      break;
  }
  const p = props.pulso ?? 0.04;
  camera.position.set(pos[0] + respira(frame, 97, p), pos[1] + respira(frame + 30, 131, p), pos[2]);
  camera.lookAt(mira[0], mira[1], mira[2]);
  camera.updateMatrixWorld();
  return null;
};
