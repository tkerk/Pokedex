export const typeClassMap = {
  fire: 'type-fire',
  water: 'type-water',
  grass: 'type-grass',
  electric: 'type-electric',
  ice: 'type-ice',
  fighting: 'type-fighting',
  poison: 'type-poison',
  ground: 'type-ground',
  flying: 'type-flying',
  psychic: 'type-psychic',
  bug: 'type-bug',
  rock: 'type-rock',
  ghost: 'type-ghost',
  dragon: 'type-dragon',
  dark: 'type-dark',
  steel: 'type-steel',
  fairy: 'type-fairy',
  normal: 'type-normal',
};

export const getTypeClass = (type) => typeClassMap[type] || 'type-normal';

export const padId = (id) => String(id).padStart(3, '0');

export const getArtwork = (pokemon) =>
  pokemon?.sprites?.other?.['official-artwork']?.front_default ||
  pokemon?.sprites?.front_default ||
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon?.id}.png`;

export const getArtworkById = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export const getSpanishText = (entries, fieldName = 'flavor_text') => {
  const entry = entries?.find(e => e.language?.name === 'es');
  if (entry) return entry[fieldName] || entry.flavor_text || entry.name || '';
  const enEntry = entries?.find(e => e.language?.name === 'en');
  if (enEntry) return enEntry[fieldName] || enEntry.flavor_text || enEntry.name || '';
  return '';
};

export const getSpanishGenus = (genera) => {
  const es = genera?.find(g => g.language?.name === 'es');
  if (es) return es.genus;
  const en = genera?.find(g => g.language?.name === 'en');
  return en?.genus || '';
};

export const generationNames = {
  'generation-i': { name: 'Gen I - Kanto', region: 'Kanto' },
  'generation-ii': { name: 'Gen II - Johto', region: 'Johto' },
  'generation-iii': { name: 'Gen III - Hoenn', region: 'Hoenn' },
  'generation-iv': { name: 'Gen IV - Sinnoh', region: 'Sinnoh' },
  'generation-v': { name: 'Gen V - Unova', region: 'Unova' },
  'generation-vi': { name: 'Gen VI - Kalos', region: 'Kalos' },
  'generation-vii': { name: 'Gen VII - Alola', region: 'Alola' },
  'generation-viii': { name: 'Gen VIII - Galar', region: 'Galar' },
  'generation-ix': { name: 'Gen IX - Paldea', region: 'Paldea' },
};

export const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

// ─── Levenshtein Distance ───
export function levenshteinDistance(a, b) {
  const la = a.length;
  const lb = b.length;
  const dp = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));

  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // eliminación
        dp[i][j - 1] + 1,       // inserción
        dp[i - 1][j - 1] + cost // sustitución
      );
    }
  }
  return dp[la][lb];
}

// ─── Fuzzy Search ───
export function fuzzySearch(query, items, nameKey = 'name', threshold = 3, maxResults = 10) {
  const q = query.toLowerCase();

  // Primero buscar coincidencias que contengan el query
  const containsMatches = items.filter(item => {
    const name = (typeof item === 'string' ? item : item[nameKey]).toLowerCase();
    return name.includes(q);
  });

  if (containsMatches.length > 0) {
    return containsMatches.slice(0, maxResults);
  }

  // Si no hay coincidencias exactas, usar Levenshtein
  const scored = items
    .map(item => {
      const name = (typeof item === 'string' ? item : item[nameKey]).toLowerCase();
      const distance = levenshteinDistance(q, name);
      // También considerar distancia parcial (prefijo)
      const partialDistance = levenshteinDistance(q, name.substring(0, q.length));
      const bestDistance = Math.min(distance, partialDistance);
      return { item, distance: bestDistance };
    })
    .filter(s => s.distance <= threshold)
    .sort((a, b) => a.distance - b.distance);

  return scored.slice(0, maxResults).map(s => s.item);
}
