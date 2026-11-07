// Convierte el archivo .env en env.cloudrun.yaml para publicar en Google Cloud Run:
//   npm run env:cloudrun
//   gcloud run deploy colorlink --source . --env-vars-file env.cloudrun.yaml ...
// Omite valores de ejemplo (TU_...) y variables que Cloud Run maneja por su cuenta.
import fs from 'node:fs';
import dotenv from 'dotenv';

const OMITIR = new Set(['PORT', 'NODE_ENV']);
const env = dotenv.parse(fs.readFileSync('.env'));

const lineas = [];
const pendientes = [];
for (const [clave, valor] of Object.entries(env)) {
  if (OMITIR.has(clave)) continue;
  if (!valor || /^(TU_|MY_|YOUR_)/i.test(valor) || valor.includes('<TU_')) {
    pendientes.push(clave);
    continue;
  }
  lineas.push(`${clave}: ${JSON.stringify(valor)}`);
}

fs.writeFileSync('env.cloudrun.yaml', lineas.join('\n') + '\n');
console.log(`env.cloudrun.yaml creado con ${lineas.length} variables.`);
if (pendientes.length) console.log(`Sin valor (no se incluyen): ${pendientes.join(', ')}`);
console.log('Recuerda: APP_URL debe ser la URL pública que te dé Cloud Run.');
