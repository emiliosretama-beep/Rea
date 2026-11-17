import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Fuente local (Montserrat Black, licencia OFL). Va dentro de public/fonts,
// así el render no depende de internet. loadFont espera a que cargue antes
// de capturar cada cuadro.
export const FUENTE = 'Montserrat Black';

loadFont({
  family: FUENTE,
  url: staticFile('fonts/montserrat-latin-900-normal.woff2'),
  weight: '900',
  format: 'woff2',
});
