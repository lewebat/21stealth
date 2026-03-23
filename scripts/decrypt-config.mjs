/**
 * decrypt-config.mjs — decrypt or re-encrypt a 21stealth config file
 *
 * Usage:
 *   node scripts/decrypt-config.mjs decrypt <input.json> <output.json> <password>
 *   node scripts/decrypt-config.mjs encrypt <input.json> <output.json> <password>
 */

import { readFileSync, writeFileSync } from 'fs'
import { webcrypto } from 'crypto'

const { subtle, getRandomValues } = webcrypto

function toBase64(buf) {
  return Buffer.from(buf).toString('base64')
}

function fromBase64(s) {
  return new Uint8Array(Buffer.from(s, 'base64'))
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const raw = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function decrypt(inputPath, outputPath, password) {
  const parsed = JSON.parse(readFileSync(inputPath, 'utf8'))
  if (parsed['21stealth'] !== true) {
    console.error('File is not encrypted — already plain JSON.')
    process.exit(1)
  }
  const key = await deriveKey(password, fromBase64(parsed.salt))
  let plaintext
  try {
    plaintext = await subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parsed.iv) },
      key,
      fromBase64(parsed.data)
    )
  } catch {
    console.error('Decryption failed — wrong password?')
    process.exit(1)
  }
  const json = new TextDecoder().decode(plaintext)
  writeFileSync(outputPath, JSON.stringify(JSON.parse(json), null, 2), 'utf8')
  console.log(`Decrypted → ${outputPath}`)
}

async function encrypt(inputPath, outputPath, password) {
  const json = readFileSync(inputPath, 'utf8')
  JSON.parse(json) // validate
  const salt = getRandomValues(new Uint8Array(16))
  const iv   = getRandomValues(new Uint8Array(12))
  const key  = await deriveKey(password, salt)
  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(json)
  )
  const file = { '21stealth': true, v: 1, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(ciphertext) }
  writeFileSync(outputPath, JSON.stringify(file), 'utf8')
  console.log(`Encrypted → ${outputPath}`)
}

const [,, cmd, input, output, password] = process.argv

if (!cmd || !input || !output || !password) {
  console.log('Usage:')
  console.log('  node scripts/decrypt-config.mjs decrypt <input.json> <output.json> <password>')
  console.log('  node scripts/decrypt-config.mjs encrypt <input.json> <output.json> <password>')
  process.exit(1)
}

if (cmd === 'decrypt') await decrypt(input, output, password)
else if (cmd === 'encrypt') await encrypt(input, output, password)
else { console.error('Unknown command:', cmd); process.exit(1) }
