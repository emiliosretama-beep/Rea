import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Freeze, Sequence, continueRender, delayRender, staticFile } from "remotion";
import type { ReelDatos } from "./tipos";
import { VISUALES } from "./escenas";
import { Marca, Subtitulos, Titular, cargarFuente3D } from "./kit";

/** Carga la fuente del reel antes de dibujar nada (el texto 3D se pinta en un canvas). */
const useFuente = () => {
  const [lista, setLista] = useState(false);
  const [handle] = useState(() => delayRender("Cargando fuente"));
  useEffect(() => {
    const f = new FontFace("ReelFont", `url(${staticFile("fuentes/InterDisplay-Black.otf")})`, { weight: "900" });
    const mono = new FontFace("ReelMono", `url(${staticFile("fuentes/JetBrainsMono-Bold.ttf")})`, { weight: "700" });
    Promise.all([f.load(), mono.load(), cargarFuente3D().catch(() => null)])
      .then(([a, b]) => {
        [a, b].forEach((c) => document.fonts.add(c));
        setLista(true);
        continueRender(handle);
      })
      .catch((e) => {
        console.error("No se pudo cargar la fuente", e);
        setLista(true);
        continueRender(handle);
      });
  }, [handle]);
  return lista;
};

const Visual: React.FC<{ datos: ReelDatos; indice: number }> = ({ datos, indice }) => {
  const e = datos.escenas[indice];
  const Comp = VISUALES[datos.id]?.[e.visual];
  if (!Comp) {
    return (
      <AbsoluteFill style={{ background: "#300", color: "#fff", fontSize: 50, padding: 80, justifyContent: "center" }}>
        Falta el visual "{e.visual}" en src/escenas para el reel "{datos.id}"
      </AbsoluteFill>
    );
  }
  return <Comp frames={e.frames} desde={e.desde} extra={e.extra ?? {}} />;
};

export const Reel: React.FC<ReelDatos> = (datos) => {
  const lista = useFuente();
  if (!lista) return null;
  return (
    <AbsoluteFill style={{ background: "#05060c" }}>
      {datos.escenas.map((e, i) => (
        // premountFor: monta la escena un poco antes para que no haya parpadeo al cortar
        <Sequence key={e.id} from={e.desde} durationInFrames={e.frames} name={e.id} premountFor={15}>
          <Visual datos={datos} indice={i} />
        </Sequence>
      ))}
      {datos.voces.map((v, i) => (
        <Sequence key={"voz" + i} from={v.desde} name={"voz " + (i + 1)}>
          <Audio src={staticFile(v.archivo)} volume={v.volumen} />
        </Sequence>
      ))}
      {datos.sonidos.map((s, i) => (
        <Sequence key={"sfx" + i} from={Math.max(0, s.desde)} name={"sfx " + s.archivo}>
          <Audio src={staticFile(s.archivo)} volume={s.volumen} />
        </Sequence>
      ))}
      {datos.musica ? (
        <Audio
          src={staticFile(datos.musica.archivo)}
          loop
          volume={(f) => {
            const total = datos.duracionFrames;
            const v = datos.musica!.volumen;
            const ent = Math.min(1, f / 20);
            const sal = Math.min(1, (total - f) / 30);
            return v * Math.max(0, Math.min(ent, sal));
          }}
        />
      ) : null}
      {datos.subtitulos === "ninguno" ? null : datos.subtitulos === "cine" ? (
        <Subtitulos palabras={datos.palabras} tamano={64} centroY={1330} acento="#ff8a4c" />
      ) : (
        <Subtitulos palabras={datos.palabras} />
      )}
      <Marca total={datos.duracionFrames} usuario={datos.marca} color={datos.subtitulos === "cine" ? "#ff8a4c" : undefined} />
    </AbsoluteFill>
  );
};

/** Portada: un fotograma de una escena + titular gigante. Se exporta como portada.jpg. */
export const Portada: React.FC<ReelDatos> = (datos) => {
  const lista = useFuente();
  if (!lista) return null;
  const i = Math.max(0, datos.escenas.findIndex((e) => e.id === datos.portada.escena));
  return (
    <AbsoluteFill style={{ background: "#05060c" }}>
      <Freeze frame={datos.portada.frame}>
        <Visual datos={datos} indice={i} />
      </Freeze>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 35%, transparent 70%, rgba(0,0,0,0.5) 100%)" }} />
      {/* desde negativo: en la portada el titular ya esta completo (sin animacion de entrada) */}
      <Titular texto={datos.portada.titulo} desde={-30} y={300} tamano={128} rotacion={-3} />
      {datos.portada.subtitulo ? (
        <Titular texto={datos.portada.subtitulo} desde={-30} y={1380} tamano={78} color="#111" fondo="#ffcc33" rotacion={2} />
      ) : null}
    </AbsoluteFill>
  );
};
