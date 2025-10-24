const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
context.scale(30, 30); // scale for blocks

const scoreElement = document.getElementById("score");

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

// Tetromino shapes
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

// ✅ Draw blocks + per-block outline
function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);

        // Outline (visible grid on blocks)
        context.strokeStyle = "rgba(255,255,255,0.25)";
        context.lineWidth = 0.05;
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

// ✅ Background grid overlay
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
  outer: for (let y = board.length - 1; y >= 0; y--) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === 0) continue outer;
    }
    const row = board.splice(y, 1)[0].fill(0);
    board.unshift(row);
    score += rowCount * 10;
    playSound(600, 0.15, "triangle", 0.3); // ✅ line clear sound
    rowCount *= 2;
    y++;
  }
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
}

let board = createMatrix(COLS, ROWS);
let piece = createPiece("T");
let nextDrop = Date.now();
let dropInterval = 1000;
let score = 0;
let fastDrop = false;

function draw() {
  context.fillStyle = "rgba(0,0,0,0.1)";
  context.fillRect(0, 0, COLS, ROWS);

  drawGrid(); // background grid
  drawMatrix(board, { x: 0, y: 0 });
  drawMatrix(piece.matrix, piece.pos); // piece also has outlines now
}

function drawNext() {
  const nextCanvas = document.getElementById("next");
  const nextCtx = nextCanvas.getContext("2d");

  nextCtx.setTransform(1, 0, 0, 1, 0, 0);
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

  nextCtx.scale(20, 20);
  const matrix = tetrominoes[nextPieceType][0];
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        nextCtx.fillStyle = colors[value];
        nextCtx.fillRect(x + 0.5, y + 0.5, 1, 1);
        nextCtx.strokeStyle = "rgba(255,255,255,0.3)";
        nextCtx.lineWidth = 0.05;
        nextCtx.strokeRect(x + 0.5, y + 0.5, 1, 1);
      }
    });
  });
}

function update() {
  const now = Date.now();
  const interval = fastDrop ? 50 : dropInterval;

  if (now - nextDrop > interval) {
    piece.pos.y++;
    if (collide(board, piece)) {
      piece.pos.y--;
      merge(board, piece);
      sweep();
      playSound(200, 0.08, "square", 0.2); // falling block sound
      spawnPiece();
      fastDrop = false;
    }

    nextDrop = now;
  }

  draw();
  updateScore();
  requestAnimationFrame(update);
  drawNext();
}

// Controls
document.addEventListener("keydown", (event) => {
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

// Touch controls
let touchStartX = 0,
  touchEndX = 0,
  touchStartY = 0,
  touchEndY = 0;

canvas.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
});

canvas.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 30) {
      piece.pos.x++;
      if (collide(board, piece)) piece.pos.x--;
    } else if (dx < -30) {
      piece.pos.x--;
      if (collide(board, piece)) piece.pos.x++;
    }
  } else {
    if (dy > 30) {
      fastDrop = true;
      setTimeout(() => (fastDrop = false), 1000);
    } else if (dy < -30) {
      rotate(piece.matrix, 1);
      if (collide(board, piece)) rotate(piece.matrix, -1);
    }
  }
});

canvas.addEventListener("touchcancel", () => {
  fastDrop = false;
});

update();

// Simple sound generator using Web Audio API
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
