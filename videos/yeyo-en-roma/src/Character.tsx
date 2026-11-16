import React from 'react';

// Personaje caricatura genérico (no es la cara real del cantante).
// wave: ángulo del brazo derecho; step: fase de caminata (-1..1); bounce: px hacia arriba
export const Cantante: React.FC<{
  wave?: number;
  step?: number;
  bounce?: number;
  sentado?: boolean;
  style?: React.CSSProperties;
}> = ({wave = 0, step = 0, bounce = 0, sentado = false, style}) => {
  const piernaI = step * 14;
  const piernaD = -step * 14;
  return (
    <svg viewBox="0 0 200 380" style={{overflow: 'visible', ...style}}>
      <g style={{translate: `0px ${-bounce}px`}}>
        {/* sombra */}
        <ellipse cx="100" cy="372" rx="60" ry="10" fill="rgba(0,0,0,0.25)" />
        {/* piernas */}
        {!sentado && (
          <>
            <g style={{rotate: `${piernaI}deg`, transformOrigin: '82px 250px'}}>
              <rect x="70" y="245" width="26" height="105" rx="10" fill="#2f4d7a" />
              <path d="M62 345 h40 l6 22 h-52 z" fill="#5a3418" />
            </g>
            <g style={{rotate: `${piernaD}deg`, transformOrigin: '118px 250px'}}>
              <rect x="104" y="245" width="26" height="105" rx="10" fill="#2f4d7a" />
              <path d="M98 345 h40 l6 22 h-52 z" fill="#5a3418" />
            </g>
          </>
        )}
        {/* cinturón */}
        <rect x="66" y="235" width="68" height="16" rx="4" fill="#3b2412" />
        <rect x="91" y="236" width="18" height="14" rx="3" fill="#e8c15a" />
        {/* brazo izquierdo */}
        <rect x="38" y="140" width="26" height="100" rx="13" fill="#3d6aa8" />
        <circle cx="51" cy="244" r="13" fill="#c98a5a" />
        {/* torso chamarra */}
        <path d="M56 130 Q100 112 144 130 L140 240 L60 240 Z" fill="#4a7bc0" />
        <path d="M88 124 L100 190 L112 124 Z" fill="#f4f0e6" />
        <path d="M60 130 L88 124 L96 170 Z M140 130 L112 124 L104 170 Z" fill="#3d6aa8" />
        <circle cx="100" cy="200" r="3" fill="#e8c15a" />
        <circle cx="100" cy="220" r="3" fill="#e8c15a" />
        {/* brazo derecho (saluda) */}
        <g style={{rotate: `${-wave}deg`, transformOrigin: '150px 145px'}}>
          <rect x="137" y="140" width="26" height="100" rx="13" fill="#3d6aa8" />
          <circle cx="150" cy="244" r="13" fill="#c98a5a" />
        </g>
        {/* cuello y cabeza */}
        <rect x="88" y="98" width="24" height="26" fill="#b97a4c" />
        <ellipse cx="100" cy="78" rx="36" ry="40" fill="#c98a5a" />
        <ellipse cx="64" cy="82" rx="7" ry="10" fill="#b97a4c" />
        <ellipse cx="136" cy="82" rx="7" ry="10" fill="#b97a4c" />
        {/* cara */}
        <circle cx="86" cy="76" r="5" fill="#2a1a10" />
        <circle cx="114" cy="76" r="5" fill="#2a1a10" />
        <circle cx="88" cy="74" r="1.6" fill="#fff" />
        <circle cx="116" cy="74" r="1.6" fill="#fff" />
        <path d="M78 64 q8 -5 16 0 M106 64 q8 -5 16 0" stroke="#2a1a10" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M84 96 q16 14 32 0" stroke="#7a2a1a" strokeWidth="4" fill="#fff" strokeLinecap="round" />
        <path d="M100 80 q-4 8 2 10" stroke="#a5683e" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* sombrero */}
        <ellipse cx="100" cy="46" rx="78" ry="14" fill="#d9b26f" />
        <path d="M66 46 Q64 6 100 4 Q136 6 134 46 Z" fill="#e6c27e" />
        <path d="M100 6 L100 30" stroke="#c49a55" strokeWidth="4" />
        <rect x="66" y="36" width="68" height="9" fill="#5a3418" />
        <ellipse cx="100" cy="47" rx="78" ry="14" fill="none" stroke="#c49a55" strokeWidth="3" />
      </g>
    </svg>
  );
};
