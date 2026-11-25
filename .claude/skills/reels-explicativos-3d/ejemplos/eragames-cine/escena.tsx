// Reel de ejemplo del estilo "escritorio cinematografico": ERAGames.
// Una sola habitacion al atardecer; cada escena es otro plano de camara sobre el mismo decorado.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { PropsEscena } from "../tipos";
import {
  AutoRally,
  CRT,
  CamaraCine,
  ContadorFrames,
  CurvaVisible,
  EscenaCine,
  EtiquetaCodigo,
  EtiquetaPasada,
  HacesDeLuz,
  Habitacion,
  Hoja,
  LenteCamara,
  PantallaPartida,
  Pieza,
  Planta,
  Polvo,
  SolDePersiana,
  Taza,
  Teclado,
  Texto3D,
  TituloMono,
  bezier,
  geo,
  progreso,
  type ModoCine,
} from "../kit";
import * as THREE from "three";

type V3 = [number, number, number];
const NARANJA_ERA = "#f04e23";

/** El mismo cuarto en todas las escenas; se pueden quitar objetos que estorben al plano. */
const Decorado: React.FC<{
  sin?: Array<"teclado" | "taza" | "lente" | "hoja" | "crt">;
  pantalla?: string[];
  velocidadPantalla?: number;
}> = ({ sin = [], pantalla, velocidadPantalla }) => (
  <>
    <SolDePersiana />
    <HacesDeLuz />
    <Polvo />
    <Habitacion />
    {sin.includes("crt") ? null : <CRT lineas={pantalla} velocidad={velocidadPantalla} />}
    {sin.includes("teclado") ? null : <Teclado />}
    {sin.includes("taza") ? null : <Taza />}
    {sin.includes("lente") ? null : <LenteCamara />}
    {sin.includes("hoja") ? null : <Hoja />}
    <Planta />
  </>
);

const aparece = (frame: number, desde: number) => progreso(frame, desde, 8);

// ------------------------------------------------------------ 1. gancho: pantalla partida

const Gancho: React.FC<PropsEscena> = ({ frames, desde }) => {
  const frame = useCurrentFrame();
  // mitad y mitad casi todo el plano; al final la linea barre y queda el render final
  const corte = interpolate(frame, [0, frames - 22, frames - 4], [0.48, 0.56, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const escena = (modo: ModoCine) => (
    <EscenaCine frames={frames} modo={modo} mm={35} enfoque={1.9} apertura={0.0022} fundido={false}>
      <CamaraCine desde={[0.08, 0.52, 1.62]} hasta={[0.02, 0.5, 1.48]} mira={[0, 0.32, -0.25]} frames={frames} />
      <Decorado pantalla={["> esto no es", "  una grabacion"]} velocidadPantalla={1.6} />
      <AutoRally posicion={[0.14, 0, 0.0]} rotacionY={0.55} />
      <Texto3D texto="ESTO NO ES" tamano={0.075} posicion={[0.05, 0.66, -0.5]} color="#f4efe6" />
      <Texto3D texto="UNA GRABACIÓN." tamano={0.075} posicion={[0.05, 0.55, -0.5]} color={NARANJA_ERA} />
      <EtiquetaCodigo texto="crt.glass({ r: 0.011 })" ancla={[-0.25, 0.26, -0.13]} posicion={[-0.17, 0.43, 0.05]} alto={0.024} opacidad={aparece(frame, 4)} />
      <EtiquetaCodigo texto="car.drift({ angle: 32 })" ancla={[0.16, 0.08, 0.0]} posicion={[0.17, 0.2, 0.3]} alto={0.022} opacidad={aparece(frame, 9)} />
      <EtiquetaCodigo texto="keyboard({ keys: 87 })" ancla={[-0.3, 0.03, 0.16]} posicion={[-0.13, 0.07, 0.5]} alto={0.02} opacidad={aparece(frame, 14)} />
      <EtiquetaCodigo texto="camera.push(0.4)" ancla={[0.48, 0.06, 0.2]} posicion={[0.24, 0.33, 0.45]} alto={0.02} opacidad={aparece(frame, 19)} />
    </EscenaCine>
  );
  return (
    <>
      <PantallaPartida corte={corte} escena={escena} />
      {corte < 0.98 ? <EtiquetaPasada texto="FRAME 0001 · PASS: WIRE" x={60} y={250} /> : null}
      {corte < 0.98 ? <EtiquetaPasada texto="PASS: BEAUTY" x={790} y={250} /> : null}
      <ContadorFrames inicio={desde} />
    </>
  );
};

// ------------------------------------------------------------ 2. modelo: el auto pasa de lineas a terminado

const Modelo: React.FC<PropsEscena> = ({ frames, desde }) => {
  const frame = useCurrentFrame();
  const corte = interpolate(frame, [8, frames - 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });
  const giro = 0.3 + frame * 0.012; // tornamesa lenta
  const escena = (modo: ModoCine) => (
    <EscenaCine frames={frames} modo={modo} mm={50} enfoque={0.62} apertura={0.012} fundido={false}>
      <CamaraCine desde={[0.5, 0.24, 0.62]} hasta={[0.42, 0.21, 0.52]} mira={[0.12, 0.05, -0.02]} frames={frames} deriva={0.004} />
      <Decorado sin={["crt"]} />
      <AutoRally posicion={[0.12, 0, -0.02]} rotacionY={giro} />
      <EtiquetaCodigo texto="car.body({ polys: 412 })" ancla={[0.12, 0.1, -0.02]} posicion={[0.1, 0.17, 0.08]} alto={0.011} opacidad={aparece(frame, 6)} />
      <EtiquetaCodigo texto="wheels({ n: 4 })" ancla={[0.15, 0.03, 0.04]} posicion={[0.27, 0.035, 0.18]} alto={0.01} opacidad={aparece(frame, 16)} />
      <EtiquetaCodigo texto={`paint("${NARANJA_ERA}")`} ancla={[0.1, 0.06, -0.05]} posicion={[0.1, 0.115, 0.17]} alto={0.01} opacidad={aparece(frame, 26)} />
    </EscenaCine>
  );
  return (
    <>
      <PantallaPartida corte={corte} escena={escena} />
      <TituloMono texto="MODELO" indice="01 /" desde={2} />
      <ContadorFrames inicio={desde} />
    </>
  );
};

// ------------------------------------------------------------ 3. camara: lente junto a la taza, fondo muy desenfocado

const Camara: React.FC<PropsEscena> = ({ frames, desde }) => {
  const frame = useCurrentFrame();
  // el foco "respira" un poco al principio, como un foquista real
  const enfoque = interpolate(frame, [0, 20], [0.75, 0.47], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <>
      <EscenaCine frames={frames} mm={50} enfoque={enfoque} apertura={0.03} desenfoqueMax={0.02}>
        <CamaraCine desde={[0.72, 0.09, 0.66]} hasta={[0.66, 0.1, 0.58]} mira={[0.44, 0.05, 0.16]} frames={frames} deriva={0.003} />
        <Decorado />
        <AutoRally posicion={[0.12, 0, -0.02]} rotacionY={0.55} />
        <EtiquetaCodigo texto="lens({ mm: 50, f: 1.8 })" ancla={[0.47, 0.08, 0.2]} posicion={[0.53, 0.115, 0.3]} alto={0.011} opacidad={aparece(frame, 10)} />
      </EscenaCine>
      <TituloMono texto="CÁMARA" indice="02 /" desde={2} />
      <ContadorFrames inicio={desde} />
    </>
  );
};

// ------------------------------------------------------------ 4. luz: rayas de sol en la pared con el "codigo" escrito

const texCodigoPared = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 160;
    const g = c.getContext("2d")!;
    g.font = "700 84px ReelMono, monospace";
    g.fillStyle = "rgba(24,12,6,0.95)";
    g.fillText('sun.through("blinds")', 20, 110);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();

const Luz: React.FC<PropsEscena> = ({ frames, desde }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <EscenaCine frames={frames} mm={35} enfoque={1.25} apertura={0.006}>
        <CamaraCine desde={[0.18, 0.9, 1.0]} hasta={[0.06, 0.93, 0.9]} mira={[-0.1, 0.86, -0.6]} frames={frames} />
        <Decorado pantalla={["> haz un juego de rally 3D", "  sun.through('blinds')", "  camera.orbit(35)"]} velocidadPantalla={1.4} />
        <AutoRally posicion={[0.14, 0, 0.0]} rotacionY={0.55} />
        <Pieza
          geo={geo("cartel-pared", () => new THREE.PlaneGeometry(0.56, 0.0875))}
          posicion={[-0.08, 0.86, -0.615]}
          color="#ffffff"
          mapa={texCodigoPared()}
          transparente
          opacidad={progreso(frame, 6, 14)}
          sombras={false}
        />
      </EscenaCine>
      <TituloMono texto="LUZ" indice="03 /" desde={2} />
      <ContadorFrames inicio={desde} />
    </>
  );
};

// ------------------------------------------------------------ 5. movimiento: drift sobre una curva bezier visible

const CURVA = bezier([-0.4, 0.002, 0.32], [0.38, 0.002, 0.45], [-0.25, 0.002, -0.12], [0.32, 0.002, -0.26]);
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

const Movimiento: React.FC<PropsEscena> = ({ frames, desde }) => {
  const frame = useCurrentFrame();
  const t = EASE(Math.min(1, Math.max(0, (frame - 8) / (frames - 22))));
  const pos = CURVA.getPointAt(t);
  const tan = CURVA.getTangentAt(t);
  const rumbo = Math.atan2(-tan.z, tan.x);
  // derrape: el auto apunta "por dentro" de la curva, mas fuerte a media curva
  const derrape = Math.sin(t * Math.PI) * 0.55;
  const etiqueta: V3 = [pos.x * 0.8 + 0.03, 0.2, pos.z + 0.05];
  return (
    <>
      <EscenaCine frames={frames} mm={35} enfoque={1.15} apertura={0.005}>
        <CamaraCine desde={[0.08, 1.28, 1.28]} hasta={[-0.04, 1.22, 1.14]} mira={[-0.03, 0.0, 0.04]} frames={frames} />
        <Decorado sin={["teclado", "taza", "lente"]} />
        <CurvaVisible curva={CURVA} progreso={progreso(frame, 0, 14)} />
        <AutoRally posicion={[pos.x, 0, pos.z]} rotacionY={rumbo + derrape} giroRuedas={frame * 0.6} />
        <EtiquetaCodigo texto="EASE(.2,.8,.2,1)" ancla={[pos.x, 0.08, pos.z]} posicion={etiqueta} alto={0.03} color="#ff8a4c" opacidad={aparece(frame, 10)} />
      </EscenaCine>
      <TituloMono texto="MOVIMIENTO" indice="04 /" desde={2} />
      <ContadorFrames inicio={desde} />
    </>
  );
};

// ------------------------------------------------------------ 6. cierre: letras 3D gruesas en la mesa, bajo las rayas de sol

const Cierre: React.FC<PropsEscena> = ({ frames, desde }) => {
  const frame = useCurrentFrame();
  const sube = (desde: number) => interpolate(frame, [desde, desde + 14], [-0.16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) });
  return (
    <>
      <EscenaCine frames={frames} mm={35} enfoque={1.3} apertura={0.004}>
        <CamaraCine desde={[0.02, 0.32, 1.45]} hasta={[0.0, 0.27, 1.2]} mira={[0, 0.03, -0.1]} frames={frames} />
        <Decorado sin={["teclado"]} pantalla={["> npm run jugar", "  ERAGames listo :)"]} velocidadPantalla={1.6} />
        <Texto3D texto="JUÉGALO GRATIS" tamano={0.055} fondo={0.04} posicion={[0.0, 0.17 + sube(4), -0.12]} color="#f2ece2" />
        <Texto3D texto="ERAGames" tamano={0.11} fondo={0.06} posicion={[0.0, 0.0 + sube(12), 0.0]} color={NARANJA_ERA} rugosidad={0.35} />
        <AutoRally posicion={[0.3, 0, -0.3]} rotacionY={2.7} />
      </EscenaCine>
      <ContadorFrames inicio={desde} />
    </>
  );
};

export default {
  gancho: Gancho,
  modelo: Modelo,
  camara: Camara,
  luz: Luz,
  movimiento: Movimiento,
  cierre: Cierre,
};
