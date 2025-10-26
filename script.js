const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
context.scale(30, 30); // scale for blocks

const scoreElement = document.getElementById("score");
const startBtn = document.getElementById("startGameBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartGameBtn");
const toggleTouchBtn = document.getElementById("toggleTouchBtn");
const toggleFastDropMovmentBtn = document.getElementById("toggleFastDropMovementBtn");

const overlay = document.getElementById("gameOverlay");
const overlayMessage = document.getElementById("overlayMessage");
const startGameBtn = document.getElementById("startGameBtn");
const resumeGameBtn = document.getElementById("resumeGameBtn");
const restartGameBtn = document.getElementById("restartGameBtn");

const ROWS = 20;
const COLS = 10;

const colors = [
  null,
  "#FF6B6B",
  "#6BCB77",
  "#4D96FF",
  "#FFD93D",
  "#FF6F91",
  "#845EC2",
  "#00C9A7",
];

// ======== SOUND (no audio files) =========
function playSound(
  frequency = 440,
  duration = 0.1,
  type = "sine",
  volume = 0.2
) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn("Audio playback not supported:", e);
  }
}

// ======== TETROMINO DATA =========
const tetrominoes = {
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
  ],
  J: [
    [
      [2, 0, 0],
      [2, 2, 2],
      [0, 0, 0],
    ],
    [
      [0, 2, 2],
      [0, 2, 0],
      [0, 2, 0],
    ],
    [
      [0, 0, 0],
      [2, 2, 2],
      [0, 0, 2],
    ],
    [
      [0, 2, 0],
      [0, 2, 0],
      [2, 2, 0],
    ],
  ],
  L: [
    [
      [0, 0, 3],
      [3, 3, 3],
      [0, 0, 0],
    ],
    [
      [0, 3, 0],
      [0, 3, 0],
      [0, 3, 3],
    ],
    [
      [0, 0, 0],
      [3, 3, 3],
      [3, 0, 0],
    ],
    [
      [3, 3, 0],
      [0, 3, 0],
      [0, 3, 0],
    ],
  ],
  O: [
    [
      [4, 4],
      [4, 4],
    ],
  ],
  S: [
    [
      [0, 5, 5],
      [5, 5, 0],
      [0, 0, 0],
    ],
    [
      [0, 5, 0],
      [0, 5, 5],
      [0, 0, 5],
    ],
  ],
  T: [
    [
      [0, 6, 0],
      [6, 6, 6],
      [0, 0, 0],
    ],
    [
      [0, 6, 0],
      [0, 6, 6],
      [0, 6, 0],
    ],
    [
      [0, 0, 0],
      [6, 6, 6],
      [0, 6, 0],
    ],
    [
      [0, 6, 0],
      [6, 6, 0],
      [0, 6, 0],
    ],
  ],
  Z: [
    [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0],
    ],
    [
      [0, 0, 7],
      [0, 7, 7],
      [0, 7, 0],
    ],
  ],
};

let nextPieceType = Object.keys(tetrominoes)[Math.floor(Math.random() * 7)];

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

// Draw blocks (with per-block grid)
function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
        context.strokeStyle = "rgba(255,255,255,0.25)";
        context.lineWidth = 0.05;
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

// Draw faint background grid
function drawGrid() {
  context.strokeStyle = "rgba(255,255,255,0.1)";
  context.lineWidth = 0.02;
  for (let x = 0; x <= COLS; x++) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, ROWS);
    context.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(COLS, y);
    context.stroke();
  }
}

function merge(board, piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) board[y + piece.pos.y][x + piece.pos.x] = value;
    });
  });
}

function collide(board, piece) {
  const m = piece.matrix;
  const o = piece.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) matrix.forEach((row) => row.reverse());
  else matrix.reverse();
}

function sweep() {
  let rowCount = 1;
  let cleared = false;
  outer: for (let y = board.length - 1; y >= 0; y--) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === 0) continue outer;
    }
    const row = board.splice(y, 1)[0].fill(0);
    board.unshift(row);
    score += rowCount * 10;
    rowCount *= 2;
    y++;
    cleared = true;
  }
  if (cleared) playSound(600, 0.15, "triangle", 0.3); // line clear sound
}

function updateScore() {
  scoreElement.innerText = score;
}

function createPiece(type) {
  return {
    matrix: cloneMatrix(tetrominoes[type][0]),
    pos: { x: 3, y: 0 },
    type: type,
    rotation: 0,
  };
}

function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

function spawnPiece() {
  const pieceType = nextPieceType;
  piece = createPiece(pieceType);
  nextPieceType = Object.keys(tetrominoes)[Math.floor(Math.random() * 7)];
  fastDrop = false;

  // Game over detection
  if (collide(board, piece)) {
    running = false;
     showOverlay("💀 Game Over", false, false, true);
  }
}

let board = createMatrix(COLS, ROWS);
let piece = createPiece("T");
let nextDrop = Date.now();
let dropInterval = 1000;
let score = 0;
let fastDrop = false;
let running = false;

function draw() {
  context.fillStyle = "rgba(0,0,0,0.1)";
  context.fillRect(0, 0, COLS, ROWS);
  drawGrid();
  drawMatrix(board, { x: 0, y: 0 });
  drawMatrix(piece.matrix, piece.pos);
}

function drawNext() {
  const nextCanvas = document.getElementById("next");
  if (!nextCanvas) return; // safety
  const nextCtx = nextCanvas.getContext("2d");

  nextCtx.setTransform(1, 0, 0, 1, 0, 0);
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

  nextCtx.scale(20, 20); // scale for preview

  const matrix = tetrominoes[nextPieceType][0];
  const offsetX = 2 - Math.floor(matrix[0].length / 2);
  const offsetY = 2 - Math.floor(matrix.length / 2);

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        nextCtx.fillStyle = colors[value];
        nextCtx.fillRect(x + offsetX, y + offsetY, 1, 1);
        nextCtx.strokeStyle = "rgba(255,255,255,0.3)";
        nextCtx.lineWidth = 0.05;
        nextCtx.strokeRect(x + offsetX, y + offsetY, 1, 1);
      }
    });
  });
}

function update() {
  if (!running) return;
  const now = Date.now();
  const interval = fastDrop ? 50 : dropInterval;

  if (now - nextDrop > interval) {
    piece.pos.y++;
    if (collide(board, piece)) {
      piece.pos.y--;
      merge(board, piece);
      sweep();
      playSound(200, 0.08, "square", 0.2); // landing sound
      spawnPiece();
      fastDrop = false;
    }
    nextDrop = now;
  }

  draw();
  updateScore();
  drawNext();
  requestAnimationFrame(update);
}

// ======== BUTTON CONTROLS =========
startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";

  pauseBtn.style.display = "inline-block";
  restartBtn.style.display = "inline-block";
  toggleTouchBtn.style.display = "inline-block";
  toggleFastDropMovmentBtn.style.display = "inline-block";

  
  if (!running) {
    running = true;

    hideOverlay();
    update();
  }
});

pauseBtn.addEventListener("click", () => {
  
  running = !running;
  if (running) {
     hideOverlay();
    update();
  }else showOverlay("⏸ Game Paused", false, true, true);
});

restartBtn.addEventListener("click", () => {
  board = createMatrix(COLS, ROWS);
  score = 0;
  updateScore();
  spawnPiece();
  running = true;
  hideOverlay();

  update();
});

// ======== KEYBOARD CONTROLS =========
document.addEventListener("keydown", (event) => {
  if (!running) return;
  if (event.key === "ArrowLeft") {
    piece.pos.x--;
    if (collide(board, piece)) piece.pos.x++;
  } else if (event.key === "ArrowRight") {
    piece.pos.x++;
    if (collide(board, piece)) piece.pos.x--;
  } else if (event.key === "ArrowDown") {
    fastDrop = true;
  } else if (event.key === "ArrowUp") {
    rotate(piece.matrix, 1);
    if (collide(board, piece)) rotate(piece.matrix, -1);
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === "ArrowDown") fastDrop = false;
});

// ======== TOUCH CONTROLS (switchable) =========
let useNewTouchControls = true; // 🔁 set false to use old version
let canMoveWhileFastDrop = false; 

let touchStartX = 0,
  touchStartY = 0,
  touchEndX = 0,
  touchEndY = 0,
  touchStartTime = 0,
  lastMoveX = 0,
  xMoved = false;

canvas.addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  touchStartX = t.screenX;
  touchStartY = t.screenY;
  lastMoveX = t.screenX;
  touchStartTime = Date.now();
  xMoved = false;
});

canvas.addEventListener("touchmove", (e) => {
  if (!useNewTouchControls) return; // ⏩ old mode doesn't use drag move

  const t = e.changedTouches[0];
  const dx = t.screenX - lastMoveX;
  const dy = t.screenY - touchStartY;
  xMoved = false;
  // horizontal drag: move every 30px of movement
  if (Math.abs(dx) > 30 && (!fastDrop || canMoveWhileFastDrop)) {
    if (dx > 0) {
      piece.pos.x++;
      if (collide(board, piece)) piece.pos.x--;
    } else {
      piece.pos.x--;
      if (collide(board, piece)) piece.pos.x++;
    }
    lastMoveX = t.screenX;
    xMoved = true;
  }

  // // vertical drag down: fast drop
  // if (dy > 40) fastDrop = true;
});

canvas.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  touchEndX = t.screenX;
  touchEndY = t.screenY;
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  const dt = Date.now() - touchStartTime;

  if (useNewTouchControls) {
    // --- NEW touch controls ---
    // // swipe down
    // if (dx < 30 && dy > 30) {
    //   fastDrop = true;
    //   setTimeout(() => (fastDrop = false), 1000);
    // }
  } else {
    // --- OLD touch controls ---
    if (Math.abs(dx) > Math.abs(dy) && (!fastDrop || canMoveWhileFastDrop)) {
      if (dx > 30) {
        piece.pos.x++;
        if (collide(board, piece)) piece.pos.x--;
        xMoved = true;
      } else if (dx < -30) {
        piece.pos.x--;
        if (collide(board, piece)) piece.pos.x++;
        xMoved = true;
      }
    } else {
      if (dy > 30) {
        fastDrop = true;
        setTimeout(() => (fastDrop = false), 1000);
      }
    }
  }
  // swipe down
  if (Math.abs(dx) < 30 && dy > 30 && !fastDrop) {
    fastDrop = true;
    setTimeout(() => (fastDrop = false), 1000);
  }
  // tap to rotate (same as old)
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 200) {
    if (fastDrop) fastDrop = false;
    else {
      rotate(piece.matrix, 1);
      if (collide(board, piece)) rotate(piece.matrix, -1);
    }
  }
  //  if (fastDrop) fastDrop = false;
  // if (useNewTouchControls) fastDrop = false;
});

canvas.addEventListener("touchcancel", () => (fastDrop = false));

// ======== TOUCH CONTROL TOGGLE BUTTON =========

toggleTouchBtn.addEventListener("click", () => {
  useNewTouchControls = !useNewTouchControls;
  toggleTouchBtn.textContent = useNewTouchControls ? "👆" : "🧭";

  // Optional: give quick feedback
  toggleTouchBtn.style.background = "rgba(0,255,100,0.3)";
  setTimeout(() => {
    toggleTouchBtn.style.background = "rgba(255,255,255,0.2)";
  }, 300);
});

toggleFastDropMovmentBtn.addEventListener("click", () => {
  canMoveWhileFastDrop = !canMoveWhileFastDrop;
  toggleFastDropMovmentBtn.textContent = canMoveWhileFastDrop ? "✅" : "🚫";

  // Optional: give quick feedback
  toggleFastDropMovmentBtn.style.background = "rgba(0,255,100,0.3)";
  setTimeout(() => {
    toggleFastDropMovmentBtn.style.background = "rgba(255,255,255,0.2)";
  }, 300);
});




document.addEventListener(
  "touchend",
  (e) => {
    if (e.detail > 1) {
      e.preventDefault(); // prevents double-tap zoom
    }
  },
  { passive: false }
);

function showOverlay(message, showStart = false, showResume = false, showRestart = false) {
  overlay.classList.remove("hidden");
  overlayMessage.textContent = message;
  startGameBtn.style.display = showStart ? "inline-block" : "none";
  resumeGameBtn.style.display = showResume ? "inline-block" : "none";
  restartGameBtn.style.display = showRestart ? "inline-block" : "none";
}

function hideOverlay() {
  overlay.classList.add("hidden");
}
resumeGameBtn.addEventListener("click", () => {
  gameState = "playing";
  running = true;
  hideOverlay();
  update();
});