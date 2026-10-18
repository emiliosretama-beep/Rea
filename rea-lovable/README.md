# ERA Studio

Crea páginas web describiéndolas en un chat. Inspirado en el flujo de los
constructores web con IA, hecho desde cero con identidad propia de **ERA Studio**.

## Qué incluye

| Función                     | Descripción                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio con prompt           | Describe tu web o usa una plantilla rápida (restaurante, videojuego, portafolio, tienda, gimnasio).                                                      |
| Chat + vista previa en vivo | La página se va dibujando mientras la IA escribe el código.                                                                                              |
| Iteración                   | Pide cambios en el chat; la IA modifica la versión actual sin rehacerla.                                                                                 |
| Vista por dispositivo       | Escritorio, tableta y móvil.                                                                                                                             |
| Editor de código            | Ver, copiar y editar el HTML a mano (se guarda como versión nueva).                                                                                      |
| Historial de versiones      | Vuelve a cualquier versión anterior con un clic.                                                                                                         |
| Proyectos                   | Se guardan en tu navegador con miniatura.                                                                                                                |
| Exportar                    | Descarga un `.html` listo para subir a cualquier hosting, o ábrelo en otra pestaña.                                                                      |
| **Inspector ERA**           | Activa el Inspector, haz clic en cualquier elemento y pide un cambio solo para él.                                                                       |
| **Análisis ERA**            | Revisión de SEO, accesibilidad y calidad con puntuación y la **evidencia** (el código exacto) de cada problema. Un botón le pide a la IA que lo arregle. |

## Versión online

Abre <https://claude.ai/artifact/Rmc1e7R2W8YoAvtNt3BGR7> desde cualquier
navegador o el celular. No necesita API key: usa la cuenta de Claude de quien
la abre (la primera vez pide permiso). Es privada hasta que la compartas desde
el menú Compartir.

Para regenerarla después de cambiar la app: `npm run build:online` crea
`online/era-studio.html` a partir de los mismos archivos de `public/`.

## Cómo usarlo en tu computadora

Requisitos: Node.js 22.9 o superior.

```bash
cd rea-lovable
npm install
cp .env.example .env   # y pega tu ANTHROPIC_API_KEY dentro
npm start
```

Abre <http://localhost:5173>.

Sin API key funciona en **modo demo**: genera webs con plantillas y entiende
cambios simples (colores, tema claro/oscuro, esquinas). Con API key usa
Claude (`claude-opus-5-5`) y acepta cualquier petición.

## Estructura

```
rea-lovable/
├── server.js        # Servidor HTTP + llamada a Claude en streaming (SSE)
├── public/
│   ├── index.html   # Interfaz (inicio + editor)
│   ├── styles.css   # Estilos (tema oscuro/claro automático)
│   ├── app.js       # Lógica: proyectos, chat, versiones, Inspector, Análisis
│   ├── backend.js   # De dónde sale la IA: servidor local, claude.ai o demo
│   ├── prompt.js    # Instrucciones para la IA (compartidas)
│   ├── demo.js      # Plantillas del modo demo
│   └── favicon.svg  # Logo ERA Studio (el sol que sale es una E)
├── scripts/build-online.mjs  # Arma la versión online en un solo HTML
├── online/rea-studio.html    # Versión online generada
└── .env.example
```

## Notas

- La API key solo vive en el servidor (`.env`), nunca se envía al navegador.
- La vista previa corre en un iframe aislado (`sandbox`), así que el código
  generado no puede tocar la app.
- Los proyectos se guardan en `localStorage`: son de ese navegador. Descarga
  tus webs para tener copia.
- Cada petición a la IA consume créditos de tu cuenta de Anthropic; las webs
  grandes y las ediciones repetidas cuestan más.
