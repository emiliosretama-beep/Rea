import {useMemo} from 'react';
import * as THREE from 'three';
import {useTexture} from '@react-three/drei';
import {staticFile} from 'remotion';

// Texturas PBR de Poly Haven (CC0). Se clonan para que cada uso tenga su propio "repeat".
export const usePBR = (id: string, rx: number, ry = rx, color?: string) => {
  const t = useTexture({
    map: staticFile(`tex/${id}_diff.jpg`),
    normalMap: staticFile(`tex/${id}_nor.jpg`),
    roughnessMap: staticFile(`tex/${id}_rough.jpg`),
  });
  return useMemo(() => {
    const out: Record<string, THREE.Texture> = {};
    for (const [k, tex] of Object.entries(t)) {
      const c = tex.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(rx, ry);
      c.anisotropy = 8;
      if (k === 'map') c.colorSpace = THREE.SRGBColorSpace;
      c.needsUpdate = true;
      out[k] = c;
    }
    return new THREE.MeshStandardMaterial({...out, color: color ?? '#ffffff', side: THREE.DoubleSide});
  }, [t, rx, ry, color]);
};
