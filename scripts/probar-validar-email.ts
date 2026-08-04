import { esEmailValido, normalizarEmail } from "../src/validar-email.js";

const casos: Array<[string, boolean]> = [
  ["hola@bodasesor.com", true],
  ["  Hola@Bodasesor.COM ", true],
  ["sin-arroba", false],
  ["a@b.c", false],
  ["mal @dominio.com", false],
  ["ok@sub.dominio.mx", true],
  ["", false],
];

let fallos = 0;
for (const [email, esperado] of casos) {
  const ok = esEmailValido(email);
  const norm = email ? normalizarEmail(email) : "";
  if (ok !== esperado) {
    console.error(`FAIL: "${email}" → ${ok}, esperado ${esperado}`);
    fallos += 1;
  } else {
    console.log(`OK: "${email}" → ${ok}${ok ? ` (${norm})` : ""}`);
  }
}

if (fallos > 0) {
  process.exitCode = 1;
} else {
  console.log("validar-email: todos los casos OK");
}
