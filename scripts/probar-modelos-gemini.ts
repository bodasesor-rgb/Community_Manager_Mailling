/**
 * Verifica que el sistema use un solo modelo de texto y un solo Imagen.
 * Ejecutar: npx tsx scripts/probar-modelos-gemini.ts
 */
import {
  candidatosImagenLlm,
  candidatosImagenPredict,
  candidatosTexto,
  modeloImagenActivo,
  modeloTextoActivo,
} from "../src/gemini/probe.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Sin env especiales
delete process.env.GEMINI_MODEL;
delete process.env.IMAGEN_MODEL;
delete process.env.GEMINI_IMAGE_FALLBACK;
delete process.env.GEMINI_IMAGE_MODEL;

assert(modeloTextoActivo() === "gemini-3.1-flash-lite", "texto default");
assert(candidatosTexto().length === 1, "texto sin cascada");
assert(candidatosTexto()[0] === "gemini-3.1-flash-lite", "solo flash-lite");

assert(
  modeloImagenActivo() === "imagen-4.0-fast-generate-001",
  "imagen default 4 fast",
);
assert(candidatosImagenPredict().length === 1, "imagen sin cascada");
assert(candidatosImagenLlm().length === 0, "Nano Banana apagado");

// Remap de modelos caros / viejos
process.env.GEMINI_MODEL = "gemini-3.6-flash";
assert(modeloTextoActivo() === "gemini-3.1-flash-lite", "remap 3.6→lite");
process.env.GEMINI_MODEL = "gemini-2.5-flash-image";
assert(modeloTextoActivo() === "gemini-3.1-flash-lite", "remap banana→lite");

process.env.IMAGEN_MODEL = "imagen-3.0-generate-002";
assert(
  modeloImagenActivo() === "imagen-4.0-fast-generate-001",
  "remap imagen3→4",
);

process.env.GEMINI_IMAGE_FALLBACK = "1";
process.env.GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
assert(candidatosImagenLlm().length === 1, "fallback solo con flag");

console.log("OK: un texto (flash-lite) + un imagen-4; Nano Banana off por defecto.");
