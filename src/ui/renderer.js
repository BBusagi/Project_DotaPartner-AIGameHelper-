const headlineElement = document.getElementById('headline');
const metaElement = document.getElementById('meta');
const connectionStatusElement = document.getElementById('connection-status');
const gameStateElement = document.getElementById('game-state');
const compactPrimaryElement = document.getElementById('compact-primary');
const compactSecondaryElement = document.getElementById('compact-secondary');
const playerNameElement = document.getElementById('player-name');
const heroNameElement = document.getElementById('hero-name');
const gameTimeElement = document.getElementById('game-time');
const dotaStatusElement = document.getElementById('dota-status');
const gsiStatusElement = document.getElementById('gsi-status');
const dataStatusElement = document.getElementById('data-status');
const hintElement = document.getElementById('hint');

const debugMode = window.dotapartner?.debugMode === true;
document.body.classList.toggle('debug-mode', debugMode);

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
  const dotaRunning = Boolean(system.dotaRunning);
  const gsiListening = Boolean(system.gsiListening);
  const hasData = Boolean(system.hasData);
  const heroName = summary.heroName || 'unknown';
  const playerName = summary.playerName || 'unknown';
  const gameState = summary.gameState || 'waiting';
  const gameTime = formatTime(summary.gameTime);

  let headlineText = 'HelloWorld';
  let metaText = `Overlay prototype is running · v${window.dotapartner?.version || 'unknown'}`;
  let primaryStatusText = 'Overlay Ready';
  let secondaryStatusText = 'Waiting for Dota';
  let compactPrimaryText = 'Overlay ready';
  let compactSecondaryText = 'Start Dota 2 to continue';

  if (!dotaRunning) {
    headlineText = 'Waiting for Dota';
    metaText = `Overlay ready · v${window.dotapartner?.version || 'unknown'}`;
    primaryStatusText = 'Step 1 · Launch Dota';
    secondaryStatusText = 'Overlay Ready';
    compactPrimaryText = 'Start Dota 2';
    compactSecondaryText = 'GSI and match data will appear after the game launches.';
  } else if (dotaRunning && !gsiListening) {
    headlineText = 'GSI Offline';
    metaText = `Dota detected · v${window.dotapartner?.version || 'unknown'}`;
    primaryStatusText = 'Check Port 3001';
    secondaryStatusText = 'Dota Running';
    compactPrimaryText = 'Dota is running';
    compactSecondaryText = 'Local GSI listener is not available. Check if another process is using port 3001.';
  } else if (dotaRunning && gsiListening && !hasData) {
    headlineText = 'Dota Detected';
    metaText = `Waiting for first payload · v${window.dotapartner?.version || 'unknown'}`;
    primaryStatusText = 'Step 2 · Waiting for Data';
    secondaryStatusText = 'GSI Listening';
    compactPrimaryText = 'Enter a match or hero demo';
    compactSecondaryText = 'Dota is running and GSI is ready. Waiting for game state data.';
  } else if (hasData) {
    headlineText = 'GSI Live';
    metaText = `Latest payload received · v${window.dotapartner?.version || 'unknown'}`;
    primaryStatusText = 'Step 3 · Live';
    secondaryStatusText = `State: ${gameState}`;
    compactPrimaryText = `${heroName} · ${gameTime}`;
    compactSecondaryText = `${playerName} · ${gameState}`;
  }

  if (headlineElement) {
    headlineElement.textContent = headlineText;
  }

  if (metaElement) {
    metaElement.textContent = metaText;
  }

  if (connectionStatusElement) {
    connectionStatusElement.textContent = primaryStatusText;
  }

  if (gameStateElement) {
    gameStateElement.textContent = secondaryStatusText;
  }

  if (compactPrimaryElement) {
    compactPrimaryElement.textContent = compactPrimaryText;
  }

  if (compactSecondaryElement) {
    compactSecondaryElement.textContent = compactSecondaryText;
  }

  if (playerNameElement) {
    playerNameElement.textContent = playerName;
  }

  if (heroNameElement) {
    heroNameElement.textContent = heroName;
  }

  if (gameTimeElement) {
    gameTimeElement.textContent = gameTime;
  }

  if (dotaStatusElement) {
    dotaStatusElement.textContent = dotaRunning ? 'running' : 'not running';
  }

  if (gsiStatusElement) {
    const port = system.gsiPort || 3001;
    gsiStatusElement.textContent = gsiListening
      ? `listening on ${port}`
      : 'not listening';
  }

  if (dataStatusElement) {
    dataStatusElement.textContent = hasData ? 'data received' : 'no data';
  }

  if (hintElement) {
    hintElement.textContent = debugMode
      ? 'Press Ctrl+Shift+Q to quit'
      : 'Run with --debugmodel to show full diagnostics';
  }
}

renderState(null);

if (window.dotapartner?.onGSIUpdate) {
  window.dotapartner.onGSIUpdate((state) => {
    renderState(state);
  });
}
