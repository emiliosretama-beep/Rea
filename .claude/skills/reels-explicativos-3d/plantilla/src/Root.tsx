import React from "react";
import { Composition, Still } from "remotion";
import { Reel, Portada } from "./Reel";
import type { ReelDatos } from "./tipos";
import ejemplo from "../public/reel/datos.json";

// Los datos reales llegan con --props=public/reel/datos.json (los escribe hacer_reel.py).
const porDefecto = ejemplo as unknown as ReelDatos;

export const Root: React.FC = () => (
  <>
    <Composition
      id="Reel"
      component={Reel}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={300}
      defaultProps={porDefecto}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(1, props.duracionFrames),
        fps: props.fps,
        width: props.ancho,
        height: props.alto,
      })}
    />
    <Still id="Portada" component={Portada} width={1080} height={1920} defaultProps={porDefecto} />
  </>
);
