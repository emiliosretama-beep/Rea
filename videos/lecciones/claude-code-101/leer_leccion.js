// Uso: NODE_PATH=/home/user/artemnovitckii/claude-animation-skills/kit/node_modules node leer_leccion.js <url de la lección>
// Imprime el texto de la lección con la pestaña "Transcripción" abierta.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 60000 });
  const tab = p.getByRole('tab', { name: /Transcripci/ }).or(p.getByText('Transcripción', { exact: true })).first();
  await tab.click().catch(e => console.log('noclick', e.message));
  await p.waitForTimeout(3000);
  console.log((await p.locator('main').innerText().catch(() => p.innerText('body'))));
  await b.close();
})();
