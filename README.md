# Cartagena en conversación

Dashboard ejecutivo de escucha social sobre siete figuras políticas de Cartagena, con foco en Wilson Toncel.
React + Vite + TypeScript + Tailwind + Recharts, publicado en GitHub Pages.

## Uso rápido

```bash
npm install
npm run data      # depura los Excel de la carpeta superior → public/data/base.json
npm run dev       # http://localhost:5173/cartagena-en-conversacion/
npm test          # pruebas de depuración, datos reales e interfaz
npm run build     # sitio estático en dist/
```

El Excel original (`D:\ESCUCHA SOCIAL\*.xlsx`) solo se lee; nunca se modifica.

## Cómo se depura la base

| Paso | Regla |
|---|---|
| Duplicados | Se elimina un registro solo si repite el `id` de Brand24 (se conserva la primera captura). Textos largos idénticos en el mismo hilo, del mismo autor y en menos de 1 h se apartan como *copia probable* (revisable). |
| Atribución | **Propia**: publicada por la cuenta de la figura. **Espontánea**: un tercero la nombra en su texto. **Contexto**: comentario en un hilo sobre la figura que no la nombra. Solo propia y espontánea son menciones directas. |
| Homónimos | Se excluye a Armando Benedetti, a Campo Elías Teherán Dix (exalcalde fallecido) y los comentaristas llamados "Óscar Torres Cartagena". Quedan pendientes el apellido "Benedetti" suelto, los "Campo Elías" sin identidad verificable y lo atribuido solo por palabra clave. |
| Óscar Torres | Cada mención se marca como institucional (ANI, vías, peajes), política/electoral u otra. |
| Sentimiento | Reglas en español con negaciones, ironía básica, respuestas a sondeos ("Bejarano", "Ninguno") y destinatario de la crítica (figuras, ciudad, gobierno nacional, otro). Las notas de medios solo se polarizan con señales fuertes. |
| Temas | Seguridad, movilidad, infraestructura, salud, empleo y economía, servicios públicos, gestión pública, elecciones, deporte y cultura, medio ambiente. |

Las correcciones manuales se hacen en **Sentimientos y evidencias → Revisar**, se guardan en el navegador
y se exportan/importan como JSON. Las revisiones iniciales del equipo están en `src/data/revisiones-base.json`.

## Actualizar con nuevos Excel

* **Desde el sitio:** *Importar Excel* → agregar (deduplica por id) o reemplazar. Se procesa en el navegador y queda guardado en ese equipo.
* **Para todos:** copie el Excel en `D:\ESCUCHA SOCIAL`, ejecute `npm run data`, pruebe y publique (`git push`).

## Publicar en GitHub Pages

1. Cree el repositorio vacío `cartagena-en-conversacion` en https://github.com/new (cuenta u organización `CaracolCo`).
2. En esta carpeta:
   ```bash
   git remote add origin https://github.com/CaracolCo/cartagena-en-conversacion.git
   git push -u origin main
   ```
3. En GitHub: *Settings → Pages → Source: GitHub Actions*.
4. El flujo `.github/workflows/deploy.yml` ejecuta pruebas, compila y publica en
   `https://caracolco.github.io/cartagena-en-conversacion/`.

> En cuentas gratuitas, GitHub Pages exige repositorio **público**, así que `public/data/base.json` queda visible.
> Por eso `npm run data` publica a comentaristas y cuentas particulares con un seudónimo (`Usuario 3f9a1c`, con una sal
> aleatoria que no se guarda) y vacía los comentarios que solo etiquetan a otra persona. Se conservan los nombres de las cuentas
> de las figuras y de los medios, los textos y los enlaces al original (en X y TikTok el enlace incluye el usuario).
> Una prueba falla si aparece un nombre particular en la base publicada.

## Alcance

Mide conversación digital registrada por Brand24. No mide audiencias de prensa, radio o TV, no infiere intención de voto
y no genera recomendaciones electorales.
