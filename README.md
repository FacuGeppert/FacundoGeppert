# Chess Engine Arena

Página web estática para jugar ajedrez contra un motor real de Stockfish en navegador y mostrar perfiles de otros motores de élite preparados para backend.

## Archivos

- `index.html`: estructura de la página.
- `style.css`: diseño moderno y responsive.
- `script.js`: tablero, movimientos, análisis, selector de motores y controles.
- `engine-api.js`: conexión con Stockfish en navegador y plantilla para backend/API.
- `.nojekyll`: evita que GitHub Pages procese la web con Jekyll.

## Cómo probar localmente

No abras `index.html` con doble clic. Usá un servidor local:

```bash
python -m http.server 5500
```

Después abrí:

```text
http://localhost:5500
```

## Cómo subir a GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir estos archivos a la raíz del repositorio.
3. Ir a Settings > Pages.
4. En Source elegir "Deploy from a branch".
5. Elegir branch `main` y carpeta `/root`.
6. Guardar.

Tu web debería quedar en:

```text
https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/
```

## Qué es real y qué requiere backend

- Stockfish WebAssembly: intenta ejecutarse en el navegador usando CDN. Es el motor jugable en esta versión.
- Leela, Komodo Dragon, Obsidian, Berserk, Ethereal, Torch y versiones exactas modernas: están representados en la interfaz, pero requieren backend/API, GPU, licencia o compilación especial.

La web no usa movimientos random como motor principal. Si Stockfish no carga, muestra error.
