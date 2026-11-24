/* =========================================================================
   cifrar_pacote.mjs — tranca o pacote com a senha da mesa
   Uso:  node ferramentas/cifrar_pacote.mjs "senha da mesa" [dados/pacote.json]
   Gera assets/mesa/pacote.bin (AES-256-GCM sobre o JSON em gzip) e
   assets/mesa/pacote.meta.json (sal, iv, iterações e id da versão).
   Sem a senha o .bin não serve para nada; o pacote.json continua fora do git.
   ========================================================================= */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { webcrypto as crypto } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [senha, origem = 'dados/pacote.json'] = process.argv.slice(2);
if (!senha) {
  console.error('Uso: node ferramentas/cifrar_pacote.mjs "senha da mesa" [dados/pacote.json]');
  process.exit(1);
}

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'assets', 'mesa');
const ITERACOES = 600_000;

const texto = readFileSync(join(raiz, origem));
const dados = JSON.parse(texto);
if (dados.formato !== 'mesa-roshar/pacote') throw new Error('Isso não é um pacote da Mesa de Roshar.');

const gz = gzipSync(texto, { level: 9 });
const sal = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));

const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
const chave = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACOES },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
);
const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, gz));
const id = Buffer.from(await crypto.subtle.digest('SHA-256', cifrado)).toString('hex').slice(0, 16);

mkdirSync(destino, { recursive: true });
writeFileSync(join(destino, 'pacote.bin'), cifrado);
writeFileSync(join(destino, 'pacote.meta.json'), JSON.stringify({
  formato: 'mesa-roshar/cifrado',
  versao: 1,
  id,
  iteracoes: ITERACOES,
  sal: Buffer.from(sal).toString('base64'),
  iv: Buffer.from(iv).toString('base64'),
  bytes: cifrado.length,
}, null, 2) + '\n');

console.log(`pacote cifrado: ${(cifrado.length / 1048576).toFixed(2)} MB (de ${(texto.length / 1048576).toFixed(2)} MB), id ${id}`);
