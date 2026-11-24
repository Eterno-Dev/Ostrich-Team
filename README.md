# Ostrich Team — Tablero de Proyectos

Tablero Kanban colaborativo para gestionar propuestas de videojuegos con acceso por clave cifrada (AES-256-GCM) y sincronizacion mediante repositorio privado de GitHub.

## Uso rapido en local

Sirve la carpeta raiz con cualquier servidor estatico (por ejemplo `npx serve .` o `python -m http.server 8080`) y abre `http://localhost:8080`.

- **Modo Demo/Local**: funciona de serie guardando los cambios en el navegador.

## Conectar con repositorio privado de GitHub (Doble Repositorio)

1. Crea un repositorio **privado** en GitHub (ej. `ostrich-team-data`) inicializado con un archivo `README.md` en la rama `main`.
2. Genera un **Fine-Grained Personal Access Token** en GitHub:
   - *Repository access*: `Only select repositories` -> selecciona `ostrich-team-data`.
   - *Permissions -> Repository permissions -> Contents*: `Read and write`.
3. Abre `src/html/setup.html` en tu navegador:
   - Introduce usuario/organizacion, nombre del repo privado, el token y la clave del equipo.
   - Pulsa **Probar conexion** y luego **Generar boveda cifrada**.
   - Descarga o copia el resultado en `src/js/vault.js`.
4. Sube este proyecto a tu repositorio publico y activa **GitHub Pages** desde la rama `main` (carpeta raiz `/`).

## Estructura

```text
.
├── index.html
├── README.md
└── src/
    ├── html/setup.html
    ├── css/
    ├── js/
    └── assets/images/{png,jpg,svg}/
```
