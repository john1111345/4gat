const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const gateCounter = document.getElementById('gateCounter');
const healthCounter = document.getElementById('healthCounter');

const keys = {};

const world = {
  started: false,
  gameOver: false,
  won: false,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 18,
  speed: 230,
  hp: 100,
  maxHp: 100,
  invuln: 0,
};

const portal = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 42,
  active: false,
};

const gatePositions = [
  { x: 110, y: 110 },
  { x: canvas.width - 110, y: 110 },
  { x: 110, y: canvas.height - 110 },
  { x: canvas.width - 110, y: canvas.height - 110 },
];

const gates = gatePositions.map((point) => ({
  ...point,
  radius: 18,
  collected: false,
}));

const enemies = [];
const starField = [];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function initStars() {
  starField.length = 0;
  for (let i = 0; i < 120; i += 1) {
    starField.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: randomBetween(1, 2.5),
      alpha: randomBetween(0.3, 1),
    });
  }
}

function createEnemies() {
  enemies.length = 0;
  for (let i = 0; i < 10; i += 1) {
    enemies.push({
      x: randomBetween(60, canvas.width - 60),
      y: randomBetween(60, canvas.height - 60),
      radius: 14,
      speed: randomBetween(55, 110),
      hue: i % 2 === 0 ? 12 : 210,
    });
  }
}

function resetGame() {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.hp = player.maxHp;
  player.invuln = 0;

  gates.forEach((gate) => {
    gate.collected = false;
  });

  portal.active = false;
  world.gameOver = false;
  world.won = false;
  createEnemies();
  updateHud();
}

function updateHud() {
  const collected = gates.filter((gate) => gate.collected).length;
  gateCounter.textContent = `Gates: ${collected} / ${gates.length}`;
  healthCounter.textContent = `Health: ${Math.max(0, Math.ceil(player.hp))}`;
}

function showOverlay(title, text, buttonText, listHtml) {
  overlay.classList.add('visible');
  overlay.querySelector('h1').textContent = title;
  overlay.querySelector('p').textContent = text;
  overlay.querySelector('ul').innerHTML = listHtml;
  startButton.textContent = buttonText;
}

function startGame() {
  world.started = true;
  resetGame();
  overlay.classList.remove('visible');
}

function endGame() {
  world.started = false;
  world.gameOver = true;
  showOverlay(
    'Mission Failed',
    'The drones got you. Try another run.',
    'Retry Mission',
    '<li>Move: WASD or Arrow Keys</li><li>Goal: Gather all 4 gates</li><li>Win: Reach the center portal</li>'
  );
}

function winGame() {
  world.started = false;
  world.won = true;
  showOverlay(
    '4GAT Cleared',
    'You secured all four gates and escaped the arena.',
    'Play Again',
    '<li>Try a faster run</li><li>Keep moving around the drones</li><li>Press retry to play again</li>'
  );
}

function handleInput() {
  if (!world.started) return;

  let dx = 0;
  let dy = 0;

  if (keys.a || keys.arrowleft) dx -= 1;
  if (keys.d || keys.arrowright) dx += 1;
  if (keys.w || keys.arrowup) dy -= 1;
  if (keys.s || keys.arrowdown) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy) || 1;
    const moveX = (dx / length) * player.speed;
    const moveY = (dy / length) * player.speed;
    player.x += moveX / 60;
    player.y += moveY / 60;
  }

  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist > 0) {
      enemy.x += (dx / dist) * enemy.speed * dt;
      enemy.y += (dy / dist) * enemy.speed * dt;
    }

    if (dist < player.radius + enemy.radius + 4 && player.invuln <= 0) {
      player.hp -= 12;
      player.invuln = 0.9;
      if (player.hp <= 0) {
        player.hp = 0;
        endGame();
      }
    }
  }

  if (player.invuln > 0) {
    player.invuln = Math.max(0, player.invuln - dt);
  }
}

function updateCollectibles() {
  for (const gate of gates) {
    if (gate.collected) continue;

    const dist = Math.hypot(player.x - gate.x, player.y - gate.y);
    if (dist < player.radius + gate.radius) {
      gate.collected = true;
    }
  }

  const collectedCount = gates.filter((gate) => gate.collected).length;
  portal.active = collectedCount === gates.length;

  if (portal.active) {
    const distToPortal = Math.hypot(player.x - portal.x, player.y - portal.y);
    if (distToPortal < player.radius + portal.radius) {
      winGame();
    }
  }

  updateHud();
}

function drawBackground() {
  ctx.fillStyle = '#071320';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of starField) {
    ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(126, 249, 255, 0.16)';
  ctx.lineWidth = 1;

  for (let x = 0; x < canvas.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.fillStyle = '#7ef9ff';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  if (player.invuln > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGate(gate) {
  if (gate.collected) return;

  const pulse = 1 + Math.sin(Date.now() / 160) * 0.12;
  ctx.save();
  ctx.translate(gate.x, gate.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#7cf7b0';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(18, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(-18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPortal() {
  if (!portal.active) return;

  ctx.strokeStyle = '#ffb86c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(portal.x, portal.y, portal.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,184,108,0.18)';
  ctx.beginPath();
  ctx.arc(portal.x, portal.y, portal.radius - 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.fillStyle = `hsla(${enemy.hue}, 90%, 62%, 0.95)`;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStatusText() {
  if (!world.started) return;

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Secure all 4 gates', 30, canvas.height - 28);

  if (portal.active) {
    ctx.fillStyle = '#ffb86c';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Portal online — reach the center!', 30, canvas.height - 52);
  }
}

function render() {
  drawBackground();

  if (portal.active) {
    drawPortal();
  }

  for (const gate of gates) {
    drawGate(gate);
  }

  drawEnemies();
  drawPlayer();
  drawStatusText();
}

let lastTimestamp = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000 || 0.016, 0.033);
  lastTimestamp = timestamp;

  if (world.started && !world.gameOver && !world.won) {
    handleInput();
    updateEnemies(dt);
    updateCollectibles();
  }

  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

startButton.addEventListener('click', () => {
  startGame();
});

function initGame() {
  initStars();
  resetGame();
  updateHud();
  render();
  requestAnimationFrame(gameLoop);
}

showOverlay(
  '4GAT',
  'Collect all four energy gates, dodge the drones, and reach the portal.',
  'Start Mission',
  '<li>Move: WASD or Arrow Keys</li><li>Goal: Gather 4 gates</li><li>Win: Activate the portal at the center</li>'
);

initGame();
