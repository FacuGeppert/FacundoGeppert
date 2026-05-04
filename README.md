# Chess Engine Arena

Página estática para GitHub Pages: interfaz moderna para jugar ajedrez contra Stockfish en navegador.

## Cómo probar localmente

No abras `index.html` con doble clic. Usá servidor local:

```bash
python -m http.server 5500
```

Después entrá a:

```text
http://localhost:5500
```

## Cómo subir a GitHub Pages

1. Creá un repositorio.
2. Subí todos estos archivos en la raíz del repo:
   - `index.html`
   - `style.css`
   - `script.js`
   - `engine-api.js`
   - `stockfish-worker.js`
   - `.nojekyll`
3. Andá a `Settings > Pages`.
4. Elegí `Deploy from a branch`.
5. Rama `main` y carpeta `/root`.

## Importante sobre motores

- `Stockfish WebAssembly` es el motor jugable en la versión estática.
- Los demás motores aparecen como perfiles, pero requieren backend/API real.
- Esta versión no usa movimientos random como motor principal.
- Si Stockfish no carga, la app muestra error en lugar de fingir que juega bien.

## Por qué existe `stockfish-worker.js`

GitHub Pages y varios navegadores bloquean Workers cargados directamente desde otro dominio. Por eso la app crea un worker local y desde ahí importa Stockfish desde CDN.
