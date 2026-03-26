import { fuzzySearch } from '@/utils/levenshtein';

const POKEAPI = 'https://pokeapi.co/api/v2';

// ──── Caché de todos los nombres de Pokémon ────
let allPokemonCache = null;
let cachePromise = null;

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

  // ──── Buscar por nombre o id (exacto) ────
  async searchPokemon(query) {
    const res = await fetch(`${POKEAPI}/pokemon/${query.toLowerCase()}`);
    if (!res.ok) return null;
    return res.json();
  },

  // ──── Lista completa de Pokémon (cacheada) ────
  async getAllPokemonNames() {
    if (allPokemonCache) return allPokemonCache;

    // Evitar múltiples fetches simultáneos
    if (cachePromise) return cachePromise;

    cachePromise = (async () => {
      try {
        const res = await fetch(`${POKEAPI}/pokemon?limit=1302&offset=0`);
        const data = await res.json();
        allPokemonCache = data.results.map((p) => {
          const id = parseInt(p.url.split('/').filter(Boolean).pop());
          return { name: p.name, id, url: p.url };
        });
        return allPokemonCache;
      } catch (e) {
        cachePromise = null;
        throw e;
      }
    })();

    return cachePromise;
  },

  // ──── Búsqueda fuzzy con Levenshtein ────
  async searchPokemonFuzzy(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // Si es un número, buscar directamente por ID
    if (/^\d+$/.test(q)) {
      try {
        const result = await this.searchPokemon(q);
        return result ? [result] : [];
      } catch { return []; }
    }

    // Cargar la lista completa
    const allNames = await this.getAllPokemonNames();

    // Búsqueda fuzzy con Levenshtein
    const matches = fuzzySearch(q, allNames, {
      key: 'name',
      maxDistance: 3,
      limit: 8,
    });

    if (matches.length === 0) return [];

    // Cargar detalles de los mejores resultados
    const details = await Promise.all(
      matches.map(async (m) => {
        try {
          const res = await fetch(`${POKEAPI}/pokemon/${m.id}`);
          if (!res.ok) return null;
          return res.json();
        } catch { return null; }
      })
    );

    return details.filter(Boolean);
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
