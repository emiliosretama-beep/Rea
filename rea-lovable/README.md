# Rea Studio

Crea páginas web describiéndolas en un chat. Inspirado en el flujo de los
constructores web con IA, hecho desde cero con identidad propia de **Rea**.

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
| **Inspector Rea**           | Activa el Inspector, haz clic en cualquier elemento y pide un cambio solo para él.                                                                       |
| **Análisis Rea**            | Revisión de SEO, accesibilidad y calidad con puntuación y la **evidencia** (el código exacto) de cada problema. Un botón le pide a la IA que lo arregle. |

## Cómo usarlo

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
├── demo.js          # Generador de plantillas para el modo demo
├── public/
│   ├── index.html   # Interfaz (inicio + editor)
│   ├── styles.css   # Estilos (tema oscuro/claro automático)
│   ├── app.js       # Lógica: proyectos, chat, versiones, Inspector, Análisis
│   └── favicon.svg  # Logo Rea
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
