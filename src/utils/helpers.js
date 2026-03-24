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
