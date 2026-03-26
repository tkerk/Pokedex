const POKEAPI = 'https://pokeapi.co/api/v2';

export const pokeService = {
  // ──── Lista paginada ────
  async getPokemonList(limit = 20, offset = 0) {
    const res = await fetch(`${POKEAPI}/pokemon?limit=${limit}&offset=${offset}`);
    const data = await res.json();
    const detailed = await Promise.all(
      data.results.map(async (p) => {
        const r = await fetch(p.url);
        return r.json();
      })
    );
    return { results: detailed, count: data.count };
  },

  // ──── Buscar por nombre o id ────
  async searchPokemon(query) {
    const res = await fetch(`${POKEAPI}/pokemon/${query.toLowerCase()}`);
    if (!res.ok) return null;
    return res.json();
  },

  // ──── Detalles completos ────
  async getPokemonDetail(id) {
    const res = await fetch(`${POKEAPI}/pokemon/${id}`);
    return res.json();
  },

  // ──── Especie (color, habitat, generation, descripciones) ────
  async getSpecies(id) {
    const res = await fetch(`${POKEAPI}/pokemon-species/${id}`);
    return res.json();
  },

  // ──── Cadena evolutiva ────
  async getEvolutionChain(url) {
    const res = await fetch(url);
    const data = await res.json();
    return this.parseEvolutionChain(data.chain);
  },

  parseEvolutionChain(chain) {
    const evolutions = [];
    let current = chain;

    while (current) {
      const id = current.species.url.split('/').filter(Boolean).pop();
      evolutions.push({
        name: current.species.name,
        id: parseInt(id),
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      });
      current = current.evolves_to.length > 0 ? current.evolves_to[0] : null;
    }

    return evolutions;
  },

  // ──── Tipos ────
  async getTypes() {
    const res = await fetch(`${POKEAPI}/type`);
    const data = await res.json();
    return data.results.filter(t => t.name !== 'unknown' && t.name !== 'shadow');
  },

  // ──── Pokémon por tipo ────
  async getPokemonByType(type) {
    const res = await fetch(`${POKEAPI}/type/${type}`);
    const data = await res.json();
    return data.pokemon.map(p => p.pokemon);
  },

  // ──── Generaciones ────
  async getGenerations() {
    const res = await fetch(`${POKEAPI}/generation`);
    const data = await res.json();
    return data.results;
  },

  // ──── Pokémon por generación ────
  async getPokemonByGeneration(genId) {
    const res = await fetch(`${POKEAPI}/generation/${genId}`);
    const data = await res.json();
    return data.pokemon_species;
  },

  // ──── Regiones ────
  async getRegions() {
    const res = await fetch(`${POKEAPI}/region`);
    const data = await res.json();
    return data.results;
  },

  // ──── Habilidad detalle ────
  async getAbility(url) {
    const res = await fetch(url);
    return res.json();
  },

  // ──── Artwork URL helper ────
  getArtwork(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  },
};
