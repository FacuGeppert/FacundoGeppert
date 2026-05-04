/*
  Worker local para GitHub Pages.
  Importante: cargar un worker directo desde otro dominio suele fallar por CORS.
  Por eso este archivo vive en tu repo y desde acá importa Stockfish desde CDN.
*/
try {
  importScripts("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");
} catch (firstError) {
  try {
    importScripts("https://cdn.jsdelivr.net/npm/stockfish.wasm@0.10.0/stockfish.js");
  } catch (secondError) {
    self.postMessage("error No se pudo importar Stockfish desde CDN");
  }
}
