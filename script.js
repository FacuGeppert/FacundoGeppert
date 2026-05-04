const game = new Chess();

const boardEl = document.getElementById("board");
const engineListEl = document.getElementById("engineList");
const engineStatusText = document.getElementById("engineStatusText");
const engineStatusDot = document.getElementById("engineStatusDot");
const turnLabel = document.getElementById("turnLabel");
const gameStatus = document.getElementById("gameStatus");
const playerColorSelect = document.getElementById("playerColorSelect");
const evalText = document.getElementById("evalText");
const evalFill = document.getElementById("evalFill");
const feedbackBox = document.getElementById("feedbackBox");
const bestMoveText = document.getElementById("bestMoveText");
const playedMoveText = document.getElementById("playedMoveText");
const lossText = document.getElementById("lossText");
const moveHistory = document.getElementById("moveHistory");
const newGameBtn = document.getElementById("newGameBtn");
const undoBtn = document.getElementById("undoBtn");
const retryBtn = document.getElementById("retryBtn");
const flipBtn = document.getElementById("flipBtn");
const copyFenBtn = document.getElementById("copyFenBtn");

const pieces = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

const engines = [
  {
    id: "stockfish-browser",
    name: "Stockfish Browser",
    displayName: "Stockfish WebAssembly",
    elo: "3400+",
    type: "NNUE / Alpha-Beta",
    description: "Motor real ejecutado en el navegador. Es el único jugable sin backend en esta versión estática.",
    tags: ["Browser Ready", "Open Source", "Real Engine"],
    available: true,
    depth: 12
  },
  {
    id: "stockfish18",
    name: "Stockfish 18",
    displayName: "Stockfish 18",
    elo: "3650+",
    type: "NNUE / Alpha-Beta",
    description: "Versión top moderna. Para usar esta versión exacta en producción conviene backend o assets propios.",
    tags: ["Server Recommended", "Open Source"],
    available: false
  },
  {
    id: "lc0",
    name: "Leela Chess Zero",
    displayName: "Leela Chess Zero",
    elo: "3500+",
    type: "Red neuronal",
    description: "Motor neural inspirado en AlphaZero. Requiere backend y preferentemente GPU.",
    tags: ["Neural Network", "GPU", "Server Required"],
    available: false
  },
  {
    id: "dragon",
    name: "Komodo Dragon",
    displayName: "Komodo Dragon",
    elo: "3600+",
    type: "Motor UCI comercial",
    description: "Motor comercial fuerte. Requiere licencia y backend para ejecutarlo legalmente.",
    tags: ["Commercial", "License", "Server Required"],
    available: false
  },
  {
    id: "obsidian",
    name: "Obsidian",
    displayName: "Obsidian",
    elo: "3600+",
    type: "Motor UCI moderno",
    description: "Motor muy fuerte para listas de rating. Requiere backend o compilación especial a WASM.",
    tags: ["UCI", "Server Required"],
    available: false
  },
  {
    id: "berserk",
    name: "Berserk",
    displayName: "Berserk",
    elo: "3500+",
    type: "Motor UCI open-source",
    description: "Motor dinámico y agresivo. Requiere backend o una build WebAssembly propia.",
    tags: ["Open Source", "UCI", "Server Required"],
    available: false
  },
  {
    id: "ethereal",
    name: "Ethereal",
    displayName: "Ethereal",
    elo: "3500+",
    type: "Motor UCI",
    description: "Motor técnico y fuerte. Preparado en la interfaz para conectar mediante API.",
    tags: ["UCI", "Server Required"],
    available: false
  },
  {
    id: "torch",
    name: "Torch",
    displayName: "Torch",
    elo: "3600+",
    type: "Motor de élite",
    description: "Motor muy potente, no disponible como ejecución libre en una página estática.",
    tags: ["Elite", "Server Required"],
    available: false
  }
];

let selectedEngineId = "stockfish-browser";
let stockfish = new BrowserStockfishEngine();
let selectedSquare = null;
let flipped = false;
let playerColor = "w";
let lastMoveSquares = [];
let locked = true;
let lastPositionBeforePlayerMove = null;
let currentEval = 0;

function setEngineStatus(text, mode = "neutral") {
  engineStatusText.textContent = text;
  engineStatusDot.className = `status-dot ${mode}`;
}

function renderEngines() {
  engineListEl.innerHTML = "";
  engines.forEach(engine => {
    const card = document.createElement("button");
    card.className = `engine-card ${engine.id === selectedEngineId ? "active" : ""} ${engine.available ? "" : "disabled"}`;
    card.innerHTML = `
      <div class="engine-main">
        <strong>${engine.displayName}</strong>
        <span class="elo">${engine.elo}</span>
      </div>
      <div class="engine-type">${engine.type}</div>
      <p class="engine-desc">${engine.description}</p>
      <div class="engine-tags">
        ${engine.tags.map(tag => `<span class="tag ${engine.available ? "ready" : "locked"}">${tag}</span>`).join("")}
      </div>
    `;
    card.addEventListener("click", () => selectEngine(engine.id));
    engineListEl.appendChild(card);
  });
}

function selectEngine(id) {
  selectedEngineId = id;
  const engine = engines.find(e => e.id === id);
  renderEngines();

  if (!engine.available) {
    locked = true;
    setEngineStatus(`${engine.displayName} requiere backend/API`, "error");
    feedbackBox.className = "feedback-box blunder";
    feedbackBox.textContent = `Este motor está en la interfaz, pero no puede ejecutarse en GitHub Pages sin backend. Para jugar de verdad ahora, seleccioná Stockfish WebAssembly.`;
  } else {
    locked = false;
    setEngineStatus("Stockfish listo", "ready");
    feedbackBox.className = "feedback-box neutral";
    feedbackBox.textContent = "Motor real seleccionado. Hacé tu movimiento.";
  }
  renderBoard();
}

async function initApp() {
  renderEngines();
  renderBoard();
  try {
    setEngineStatus("Cargando Stockfish real...", "thinking");
    await stockfish.init();
    locked = false;
    setEngineStatus("Stockfish listo", "ready");
    feedbackBox.textContent = "Stockfish real cargado correctamente. Ya podés jugar.";
  } catch (error) {
    locked = true;
    setEngineStatus("Stockfish no pudo cargar", "error");
    feedbackBox.className = "feedback-box blunder";
    feedbackBox.textContent = "No se pudo cargar Stockfish desde CDN. Revisá tu conexión o abrí la web desde un servidor/GitHub Pages, no con doble clic.";
  }
}

function renderBoard() {
  boardEl.innerHTML = "";
  const state = game.board();
  const rankIndexes = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const fileIndexes = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  for (const rankIndex of rankIndexes) {
    for (const fileIndex of fileIndexes) {
      const squareName = indexToSquare(fileIndex, rankIndex);
      const piece = game.get(squareName);
      const square = document.createElement("div");
      const isLight = (fileIndex + rankIndex) % 2 !== 0;
      square.className = `square ${isLight ? "light" : "dark"}`;

      if (selectedSquare === squareName) square.classList.add("selected");
      if (lastMoveSquares.includes(squareName)) square.classList.add("last-move");
      if (selectedSquare && isLegalTarget(selectedSquare, squareName)) {
        square.classList.add(piece ? "capture" : "legal");
      }

      if (piece && game.in_check() && piece.type === "k" && piece.color === game.turn()) {
        square.classList.add("check");
      }

      if (piece) {
        const symbolKey = piece.color === "w" ? piece.type.toUpperCase() : piece.type;
        const span = document.createElement("span");
        span.className = `piece ${piece.color === "w" ? "white-piece" : "black-piece"}`;
        span.textContent = pieces[symbolKey];
        square.appendChild(span);
      }

      square.addEventListener("click", () => handleSquareClick(squareName));
      boardEl.appendChild(square);
    }
  }
  updateGameInfo();
}

function indexToSquare(fileIndex, rankIndex) {
  return "abcdefgh"[fileIndex] + (8 - rankIndex);
}

function isHumanTurn() {
  return game.turn() === playerColor;
}

function handleSquareClick(squareName) {
  if (locked || game.game_over() || !isHumanTurn()) return;
  const piece = game.get(squareName);

  if (!selectedSquare) {
    if (piece && piece.color === playerColor) {
      selectedSquare = squareName;
      renderBoard();
    }
    return;
  }

  if (piece && piece.color === playerColor && squareName !== selectedSquare) {
    selectedSquare = squareName;
    renderBoard();
    return;
  }

  attemptPlayerMove(selectedSquare, squareName);
}

function isLegalTarget(from, to) {
  return game.moves({ square: from, verbose: true }).some(m => m.to === to);
}

async function attemptPlayerMove(from, to) {
  const fenBefore = game.fen();
  const move = game.move({ from, to, promotion: "q" });
  if (!move) {
    selectedSquare = null;
    renderBoard();
    return;
  }

  lastPositionBeforePlayerMove = fenBefore;
  lastMoveSquares = [move.from, move.to];
  selectedSquare = null;
  locked = true;
  renderBoard();

  try {
    setEngineStatus("Analizando tu jugada...", "thinking");
    feedbackBox.className = "feedback-box neutral";
    feedbackBox.textContent = "Analizando tu jugada con Stockfish...";

    const engine = engines.find(e => e.id === selectedEngineId);
    const before = await stockfish.analyzePosition(fenBefore, engine.depth);
    const after = await stockfish.analyzePosition(game.fen(), engine.depth);
    currentEval = after.eval;
    showMoveFeedback(before, after, move);

    if (!game.game_over()) {
      await makeEngineMove();
    }
  } catch (error) {
    setEngineStatus("Error analizando", "error");
    feedbackBox.className = "feedback-box blunder";
    feedbackBox.textContent = `Error del motor: ${error.message}`;
  } finally {
    locked = false;
    renderBoard();
  }
}

async function makeEngineMove() {
  setEngineStatus("Stockfish pensando...", "thinking");
  const engine = engines.find(e => e.id === selectedEngineId);
  const result = await stockfish.getBestMove(game.fen(), engine.depth);
  if (!result.bestMove) return;

  const move = game.move({
    from: result.bestMove.slice(0, 2),
    to: result.bestMove.slice(2, 4),
    promotion: result.bestMove.slice(4, 5) || "q"
  });

  if (move) {
    lastMoveSquares = [move.from, move.to];
    currentEval = result.eval;
    updateEval(result.eval);
    setEngineStatus("Stockfish listo", "ready");
  }
}

function showMoveFeedback(before, after, move) {
  const player = move.color;
  let loss = player === "w" ? before.eval - after.eval : after.eval - before.eval;
  loss = Math.max(0, loss);
  const category = classifyLoss(loss);

  feedbackBox.className = `feedback-box ${category.className}`;
  feedbackBox.textContent = category.message(bestMoveToSan(before.bestMove), loss);
  bestMoveText.textContent = bestMoveToSan(before.bestMove);
  playedMoveText.textContent = move.san;
  lossText.textContent = loss < 0.05 ? "0.00" : loss.toFixed(2);
  updateEval(after.eval);
}

function classifyLoss(loss) {
  if (loss < 0.18) return { className: "excellent", message: () => "Excelente jugada. Stockfish no ve una pérdida importante de ventaja." };
  if (loss < 0.45) return { className: "good", message: () => "Buena jugada. La posición sigue siendo sólida." };
  if (loss < 0.95) return { className: "inaccuracy", message: (best, loss) => `Imprecisión. Perdiste aproximadamente ${loss.toFixed(2)} puntos. Stockfish prefería: ${best}.` };
  if (loss < 1.8) return { className: "mistake", message: (best, loss) => `Error. La jugada empeora bastante la posición (${loss.toFixed(2)}). Mejor era: ${best}.` };
  return { className: "blunder", message: (best, loss) => `Grave error / blunder. Perdiste aproximadamente ${loss.toFixed(2)} puntos. Stockfish recomienda: ${best}.` };
}

function bestMoveToSan(uci) {
  if (!uci) return "—";
  const clone = new Chess(lastPositionBeforePlayerMove || game.fen());
  const move = clone.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci.slice(4,5) || "q" });
  return move ? move.san : uci;
}

function updateEval(value) {
  evalText.textContent = value > 90 ? "+M" : value < -90 ? "-M" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  const clamped = Math.max(-5, Math.min(5, value));
  const percent = 50 + clamped * 8;
  evalFill.style.width = `${percent}%`;
}

function updateGameInfo() {
  turnLabel.textContent = game.turn() === "w" ? "Blancas" : "Negras";
  if (game.in_checkmate()) gameStatus.textContent = "Jaque mate";
  else if (game.in_draw()) gameStatus.textContent = "Tablas";
  else if (game.in_check()) gameStatus.textContent = "Jaque";
  else gameStatus.textContent = "Partida en curso";

  moveHistory.innerHTML = "";
  const history = game.history();
  for (let i = 0; i < history.length; i += 2) {
    const li = document.createElement("li");
    li.textContent = `${history[i] || ""} ${history[i + 1] || ""}`;
    moveHistory.appendChild(li);
  }
}

function undoPair() {
  if (locked) return;
  if (game.history().length === 0) return;
  game.undo();
  if (game.history().length > 0 && game.turn() !== playerColor) game.undo();
  selectedSquare = null;
  lastMoveSquares = [];
  feedbackBox.className = "feedback-box neutral";
  feedbackBox.textContent = "Movimiento retrocedido. Podés jugar otra vez.";
  renderBoard();
}

function retryMove() {
  if (locked) return;
  if (lastPositionBeforePlayerMove) {
    game.load(lastPositionBeforePlayerMove);
    selectedSquare = null;
    lastMoveSquares = [];
    feedbackBox.className = "feedback-box inaccuracy";
    feedbackBox.textContent = "Reintentá desde la posición anterior a tu última jugada.";
    renderBoard();
  }
}

async function startNewGame() {
  game.reset();
  selectedSquare = null;
  lastMoveSquares = [];
  lastPositionBeforePlayerMove = null;
  currentEval = 0;
  updateEval(0);
  bestMoveText.textContent = "—";
  playedMoveText.textContent = "—";
  lossText.textContent = "—";
  feedbackBox.className = "feedback-box neutral";
  feedbackBox.textContent = "Nueva partida iniciada.";
  renderBoard();

  if (playerColor === "b" && !locked) {
    locked = true;
    try { await makeEngineMove(); } finally { locked = false; renderBoard(); }
  }
}

newGameBtn.addEventListener("click", startNewGame);
undoBtn.addEventListener("click", undoPair);
retryBtn.addEventListener("click", retryMove);
flipBtn.addEventListener("click", () => { flipped = !flipped; renderBoard(); });
playerColorSelect.addEventListener("change", async (e) => {
  playerColor = e.target.value;
  flipped = playerColor === "b";
  await startNewGame();
});
copyFenBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(game.fen());
    copyFenBtn.textContent = "Copiado";
    setTimeout(() => copyFenBtn.textContent = "Copiar FEN", 1000);
  } catch (_) {
    alert(game.fen());
  }
});

initApp();
