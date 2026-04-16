const headlineElement = document.getElementById('headline');
const metaElement = document.getElementById('meta');
const connectionStatusElement = document.getElementById('connection-status');
const gameStateElement = document.getElementById('game-state');
const playerNameElement = document.getElementById('player-name');
const heroNameElement = document.getElementById('hero-name');
const gameTimeElement = document.getElementById('game-time');
const dotaStatusElement = document.getElementById('dota-status');
const gsiStatusElement = document.getElementById('gsi-status');
const dataStatusElement = document.getElementById('data-status');

function formatTime(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    return 'n/a';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function renderState(state) {
  const summary = state?.summary || {};
  const connected = Boolean(state?.connected);
  const system = state?.system || {};

  if (headlineElement) {
    headlineElement.textContent = connected ? 'GSI Live' : 'HelloWorld';
  }

  if (metaElement) {
    const version = window.dotapartner?.version || 'unknown';
    metaElement.textContent = connected
      ? `Latest payload received · v${version}`
      : `Overlay prototype is running · v${version}`;
  }

  if (connectionStatusElement) {
    connectionStatusElement.textContent = connected ? 'GSI Connected' : 'Waiting for GSI';
  }

  if (gameStateElement) {
    gameStateElement.textContent = `State: ${summary.gameState || 'waiting'}`;
  }

  if (playerNameElement) {
    playerNameElement.textContent = summary.playerName || 'unknown';
  }

  if (heroNameElement) {
    heroNameElement.textContent = summary.heroName || 'unknown';
  }

  if (gameTimeElement) {
    gameTimeElement.textContent = formatTime(summary.gameTime);
  }

  if (dotaStatusElement) {
    dotaStatusElement.textContent = system.dotaRunning ? 'running' : 'not running';
  }

  if (gsiStatusElement) {
    const port = system.gsiPort || 3001;
    gsiStatusElement.textContent = system.gsiListening
      ? `listening on ${port}`
      : 'not listening';
  }

  if (dataStatusElement) {
    dataStatusElement.textContent = system.hasData ? 'data received' : 'no data';
  }
}

renderState(null);

if (window.dotapartner?.onGSIUpdate) {
  window.dotapartner.onGSIUpdate((state) => {
    renderState(state);
  });
}
