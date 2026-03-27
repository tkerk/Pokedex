<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authStore } from '@/stores/authStore';
import { io } from 'socket.io-client';
import { Loader2, Zap, ShieldAlert, LogOut } from 'lucide-vue-next';
import { getArtworkById } from '@/utils/helpers';

const route = useRoute();
const router = useRouter();
const battleId = route.params.id;

const socket = ref(null);
const battleState = ref(null);
const logs = ref([]);
const matchOver = ref(false);
const matchWinner = ref(null);
const actionPending = ref(false);
const connectionError = ref('');

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
// Extraer host de API_URL para socket.io
const SOCKET_URL = API_URL.replace('/api', '');

const logContainer = ref(null);

// Computed para entender quien es quien
const myId = computed(() => authStore.user?.id);
const opponentId = computed(() => {
  if (!battleState.value) return null;
  return battleState.value.challengerId === myId.value 
    ? battleState.value.opponentId 
    : battleState.value.challengerId;
});

const myTeam = computed(() => {
  if (!battleState.value || !myId.value) return [];
  return battleState.value.teams[myId.value] || [];
});

const oppTeam = computed(() => {
  if (!battleState.value || !opponentId.value) return [];
  return battleState.value.teams[opponentId.value] || [];
});

const myActivePkmn = computed(() => {
  if (!battleState.value || !myId.value || myTeam.value.length === 0) return null;
  const idx = battleState.value.activePokemonIndex[myId.value];
  return myTeam.value[idx];
});

const oppActivePkmn = computed(() => {
  if (!battleState.value || !opponentId.value || oppTeam.value.length === 0) return null;
  const idx = battleState.value.activePokemonIndex[opponentId.value];
  return oppTeam.value[idx];
});

// UI State
const showSwitchMenu = ref(false);

onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.push('/login');
    return;
  }

  const token = localStorage.getItem('poke_token');
  socket.value = io(SOCKET_URL, {
    auth: { token }
  });

  socket.value.on('connect', () => {
    console.log('[Battle] Conectado al socket');
    socket.value.emit('join_battle', { battleId });
  });

  socket.value.on('battle_joined', () => {
    logs.value.push({ message: 'Conectando a la arena de batalla...', type: 'system' });
  });

  socket.value.on('battle_start', (state) => {
    battleState.value = state;
    logs.value.push({ message: '¡LA BATALLA HA COMENZADO!', type: 'system-major' });
  });

  socket.value.on('battle_sync', (state) => {
    battleState.value = state;
    logs.value.push({ message: 'Reconectado a la batalla.', type: 'system' });
  });

  socket.value.on('turn_result', ({ log, state, matchOver: isOver, winner }) => {
    battleState.value = state;
    log.forEach(l => {
      logs.value.push({
        message: l.message,
        damage: l.damage,
        crit: l.crit,
        player: l.player,
        type: l.message === 'MATCH_OVER' ? 'system-major' : 'action'
      });
    });
    
    actionPending.value = false;
    showSwitchMenu.value = false;

    if (isOver) {
      matchOver.value = true;
      matchWinner.value = winner;
    } else {
      // Forzar abrir menú de cambio si mi pokemon se debilitó
      if (myActivePkmn.value?.fainted) {
        showSwitchMenu.value = true;
      }
    }
    
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    });
  });

  socket.value.on('battle_error', (data) => {
    connectionError.value = data.message;
    socket.value.disconnect();
  });
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});

const attack = (moveIndex) => {
  if (actionPending.value || matchOver.value) return;
  actionPending.value = true;
  socket.value.emit('battle_action', {
    battleId,
    actionType: 'attack',
    moveIndex
  });
  logs.value.push({ message: 'Esperando al oponente...', type: 'pending' });
};

const switchPokemon = (switchIndex) => {
  if (actionPending.value || matchOver.value) return;
  const pkmn = myTeam.value[switchIndex];
  if (pkmn.fainted || switchIndex === battleState.value.activePokemonIndex[myId.value]) return;
  
  actionPending.value = true;
  socket.value.emit('battle_action', {
    battleId,
    actionType: 'switch',
    switchIndex
  });
  showSwitchMenu.value = false;
  logs.value.push({ message: 'Esperando al oponente...', type: 'pending' });
};

const quitBattle = () => {
  router.push('/friends');
};
</script>

<template>
  <div class="battle-arena">
    <!-- Overlay Error -->
    <div v-if="connectionError" class="modal-overlay">
      <div class="modal-content text-center">
        <ShieldAlert :size="48" style="color:#ef4444; margin:0 auto 1rem;" />
        <h2 style="color:#ef4444; text-transform:uppercase; margin-bottom:1rem;">Error de Conexión</h2>
        <p style="margin-bottom:1.5rem; font-size:0.9rem;">{{ connectionError }}</p>
        <button @click="quitBattle" class="auth-btn">VOLVER A AMIGOS</button>
      </div>
    </div>

    <!-- Pantalla de Carga Inicial -->
    <div v-else-if="!battleState" class="loader-wrapper" style="height: 100vh;">
      <Loader2 :size="64" class="spin" style="color:var(--neon-green);" />
      <p style="margin-top:1rem; font-weight:700; letter-spacing:0.1em; color:var(--neon-green);">ESPERANDO AL OPONENTE...</p>
    </div>

    <!-- Arena Principal -->
    <template v-else>
      <div class="arena-top">
        <button @click="quitBattle" class="btn-quit"><LogOut :size="16" /> SALIR</button>
        <span class="battle-title neon-text-blue">VS</span>
      </div>

      <!-- Oponente (Arriba) -->
      <div class="fighter-box opponent-box">
        <div class="stats-card">
          <p class="fighter-name">{{ oppActivePkmn?.name }}</p>
          <div class="hp-bar-bg">
            <div class="hp-bar-fill" :style="{ width: oppActivePkmn ? (oppActivePkmn.hp / oppActivePkmn.maxHp * 100) + '%' : '0%', background: oppActivePkmn?.hp > 50 ? '#22c55e' : (oppActivePkmn?.hp > 20 ? '#eab308' : '#ef4444') }"></div>
          </div>
          <p class="hp-text">{{ oppActivePkmn?.hp }} / {{ oppActivePkmn?.maxHp }}</p>
        </div>
        <div class="sprite-container">
          <img v-if="oppActivePkmn" :src="getArtworkById(oppActivePkmn?.id)" class="pokemon-sprite drop-shadow-red" />
        </div>
      </div>

      <!-- Jugador (Abajo) -->
      <div class="fighter-box player-box">
        <div class="sprite-container">
          <!-- TODO: Idealmente usar sprite de espalda si estuviera disponible, usamos artwork -->
          <img v-if="myActivePkmn" :src="getArtworkById(myActivePkmn?.id)" class="pokemon-sprite drop-shadow-green" />
        </div>
        <div class="stats-card">
          <p class="fighter-name">{{ myActivePkmn?.name }}</p>
          <div class="hp-bar-bg">
            <div class="hp-bar-fill" :style="{ width: myActivePkmn ? (myActivePkmn.hp / myActivePkmn.maxHp * 100) + '%' : '0%', background: myActivePkmn?.hp > 50 ? '#22c55e' : (myActivePkmn?.hp > 20 ? '#eab308' : '#ef4444') }"></div>
          </div>
          <p class="hp-text">{{ myActivePkmn?.hp }} / {{ myActivePkmn?.maxHp }}</p>
        </div>
      </div>

      <!-- Battle Log -->
      <div class="battle-log" ref="logContainer">
        <div v-for="(log, i) in logs" :key="i" :class="['log-entry', `log-${log.type}`]">
          <span v-if="log.type === 'system-major'">⚡ {{ log.message }} ⚡</span>
          <span v-else-if="log.type === 'pending'" style="color:var(--neon-green); font-style:italic;">⏳ {{ log.message }}</span>
          <span v-else>
            <strong v-if="log.player === myId" style="color:var(--neon-green);">[TÚ]</strong>
            <strong v-if="log.player === opponentId" style="color:var(--neon-red);">[OP]</strong>
            {{ log.message }}
            <span v-if="log.damage" style="color:#ef4444; font-weight:700;">(-{{log.damage}} HP)</span>
            <span v-if="log.crit" style="color:#eab308; font-weight:800; text-transform:uppercase;">¡Golpe Crítico!</span>
          </span>
        </div>
      </div>

      <!-- Match Over Screen -->
      <div v-if="matchOver" class="controls-panel text-center">
        <h2 :class="matchWinner === myId ? 'neon-text-green' : 'neon-text-red'" style="margin-bottom:1rem; font-size:1.5rem;">
          {{ matchWinner === myId ? '¡HAS GANADO!' : 'HAS PERDIDO...' }}
        </h2>
        <button @click="quitBattle" class="auth-btn" style="max-width:200px; margin:0 auto;">VOLVER AL MENÚ</button>
      </div>

      <!-- Controls Panel -->
      <div v-else class="controls-panel">
        <div v-if="actionPending" class="text-center" style="padding:2rem 0; color:var(--neon-green);">
          <Loader2 :size="32" class="spin" style="margin: 0 auto 0.5rem;" />
          <p style="font-size:0.8rem; letter-spacing:0.1em; font-weight:700;">ESPERANDO TURNO...</p>
        </div>

        <div v-else-if="showSwitchMenu">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <p style="font-size:0.8rem; font-weight:700; color:var(--neon-blue);">ELEGIR POKÉMON</p>
            <button v-if="!myActivePkmn?.fainted" @click="showSwitchMenu = false" style="color:#ef4444; background:transparent; border:none; font-size:0.7rem; cursor:pointer;">CANCELAR</button>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
            <button 
              v-for="(p, i) in myTeam" :key="i"
              @click="switchPokemon(i)"
              :disabled="p.fainted || i === battleState.activePokemonIndex[myId]"
              class="switch-btn"
              :class="{'is-active': i === battleState.activePokemonIndex[myId], 'is-fainted': p.fainted}"
            >
              <img :src="getArtworkById(p.id)" style="width:30px; height:30px;" />
              <div style="text-align:left;">
                <p style="font-size:0.6rem; font-weight:700; text-transform:uppercase;">{{ p.name }}</p>
                <div class="hp-bar-bg" style="height:3px; margin-top:2px;">
                  <div class="hp-bar-fill" :style="{ width: (p.hp / p.maxHp * 100) + '%', background: p.hp > 0 ? '#22c55e' : '#ef4444' }"></div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div v-else-if="myActivePkmn && !myActivePkmn.fainted">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.8rem;">
            <button 
              v-for="(move, i) in myActivePkmn.moves" :key="i"
              @click="attack(i)"
              class="attack-btn"
            >
              <Zap :size="14" style="color:var(--neon-yellow); margin-right:4px;" />
              {{ move.name ? move.name.replace('-', ' ') : 'ATAQUE BASE' }}
            </button>
          </div>
          <button @click="showSwitchMenu = true" class="pagination__btn" style="width:100%; border-color:var(--neon-blue); color:var(--neon-blue);">
            CAMBIAR POKÉMON
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.battle-arena {
  min-height: 100vh; background: #000;
  display: flex; flex-direction: column; overflow: hidden;
  background-image: radial-gradient(circle at center, rgba(34,197,94,0.1) 0%, #000 70%);
}

.arena-top {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem; position: relative; z-index: 10;
}
.btn-quit {
  background: rgba(239, 68, 68, 0.1); color: #ef4444;
  border: 1px solid #ef4444; padding: 0.4rem 0.8rem; border-radius: 4px;
  font-size: 0.65rem; font-weight: 700; display:flex; align-items:center; gap:0.3rem;
  cursor: pointer;
}
.battle-title { font-size: 1.5rem; font-weight: 900; letter-spacing: 0.2em; text-align:center; flex-grow:1; }

.fighter-box { 
  display: flex; justify-content: space-between; align-items: flex-end; 
  padding: 0 1.5rem; margin-bottom: 2rem;
}
.opponent-box { margin-top: 1rem; align-items: flex-start; }
.player-box { margin-top: auto; margin-bottom: 1rem; flex-direction: row-reverse; }

.stats-card {
  background: rgba(0,0,0,0.7); border: 2px solid var(--border-dim);
  padding: 0.8rem; border-radius: 0.5rem; width: 150px;
  box-shadow: 0 0 15px rgba(0,0,0,0.5);
  transition: all 0.3s ease;
}
.opponent-box .stats-card { border-color: var(--neon-red); }
.player-box .stats-card { border-color: var(--neon-green); }

.fighter-name { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.3rem; letter-spacing:0.05em; }
.hp-bar-bg { background: #333; height: 6px; border-radius: 3px; position: relative; overflow: hidden; margin-bottom: 0.2rem; }
.hp-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease-out, background 0.3s; }
.hp-text { font-size: 0.6rem; text-align: right; font-family: monospace; color: #aaa; }

.sprite-container { width: 120px; height: 120px; display: flex; justify-content: center; align-items: center; }
.pokemon-sprite { max-width: 100%; max-height: 100%; object-fit: contain; transform-origin: bottom center; animation: float 3s ease-in-out infinite; }
.drop-shadow-red { filter: drop-shadow(0 0 10px rgba(239,68,68,0.5)); }
.drop-shadow-green { filter: drop-shadow(0 0 10px rgba(34,197,94,0.5)); }

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
}

.battle-log {
  background: rgba(0,0,0,0.8); border-top: 1px solid var(--border-dim);
  border-bottom: 1px solid var(--border-dim); height: 150px; overflow-y: auto;
  padding: 0.8rem; font-family: monospace; font-size: 0.75rem; 
  display: flex; flex-direction: column; gap: 0.4rem;
}
.log-entry { padding: 0.2rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1); line-height: 1.4; color: #ddd; }
.log-system { color: var(--neon-blue); }
.log-system-major { color: var(--neon-purple); font-weight: 800; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.85rem;}

.controls-panel {
  background: #111; padding: 1.5rem; flex-shrink: 0; min-height: 200px;
  border-top: 2px solid var(--border-dim);
}

.attack-btn {
  background: transparent; border: 2px solid var(--neon-green); color: #fff;
  padding: 0.8rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 800;
  text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; box-shadow: 0 0 10px rgba(34,197,94,0.1) inset;
}
.attack-btn:active { transform: scale(0.95); background: rgba(34,197,94,0.2); }

.switch-btn {
  background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 0.5rem;
  border-radius: 0.5rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: 0.2s;
}
.switch-btn:hover:not(:disabled) { border-color: var(--neon-blue); background: rgba(0, 255, 255, 0.1); }
.switch-btn.is-active { border-color: var(--neon-green); cursor: default; opacity: 0.8; }
.switch-btn.is-fainted { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }

.modal-overlay {
  position: fixed; top:0; left:0; width:100vw; height:100vh;
  background: rgba(0,0,0,0.9); z-index: 2000;
  display: flex; justify-content: center; align-items: center; padding: 1rem;
}
.modal-content {
  background: #111; border: 2px solid var(--neon-red); 
  border-radius: 0.5rem; padding: 2rem; width: 100%; max-width: 400px;
}
</style>
