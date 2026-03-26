/**
 * Calcula la distancia de Levenshtein entre dos cadenas.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshteinDistance(a, b) {
  const la = a.length;
  const lb = b.length;

  // Caso base: si una cadena está vacía
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Usar solo 2 filas en vez de la matriz completa (optimización de memoria)
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // eliminación
        curr[j - 1] + 1,   // inserción
        prev[j - 1] + cost  // sustitución
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Búsqueda fuzzy usando distancia de Levenshtein.
 * También prioriza coincidencias por prefijo y substring.
 *
 * @param {string} query — texto a buscar
 * @param {Array} list — lista de items
 * @param {Object} options
 * @param {string} options.key — campo del objeto a comparar (default: 'name')
 * @param {number} options.maxDistance — distancia máxima aceptable (default: 3)
 * @param {number} options.limit — máximo de resultados (default: 10)
 * @returns {Array} — items ordenados por relevancia
 */
export function fuzzySearch(query, list, options = {}) {
  const {
    key = 'name',
    maxDistance = 3,
    limit = 10,
  } = options;

  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = [];

  for (const item of list) {
    const name = (typeof item === 'string' ? item : item[key] || '').toLowerCase();

    // Coincidencia exacta → prioridad máxima
    if (name === q) {
      scored.push({ item, score: -3 });
      continue;
    }

    // Coincidencia por prefijo → prioridad alta
    if (name.startsWith(q)) {
      scored.push({ item, score: -2 });
      continue;
    }

    // Contiene el query como substring → prioridad media
    if (name.includes(q)) {
      scored.push({ item, score: -1 });
      continue;
    }

    // Distancia de Levenshtein
    const dist = levenshteinDistance(q, name);

    // Distancia normalizada por la longitud más larga
    const maxLen = Math.max(q.length, name.length);
    const normalizedDist = dist / maxLen;

    // Aceptar solo si la distancia es razonable
    if (dist <= maxDistance || normalizedDist <= 0.45) {
      scored.push({ item, score: dist });
    }
  }

  // Ordenar: menor score = más relevante
  scored.sort((a, b) => a.score - b.score);

  return scored.slice(0, limit).map(s => s.item);
}
