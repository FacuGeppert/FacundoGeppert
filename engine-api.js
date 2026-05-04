class BrowserStockfishEngine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.busy = false;
    this.currentResolve = null;
    this.currentReject = null;
    this.lastScore = 0;
    this.lastMate = null;
    this.currentFen = null;
    this.messageLog = [];
  }

  async init() {
    if (this.ready) return true;

    // GitHub Pages no permite crear Workers directamente desde algunos CDN
    // por CORS. Usamos un worker local del repo que importa Stockfish.
    await this.tryCreateWorker("stockfish-worker.js");
    this.ready = true;
    return true;
  }

  tryCreateWorker(url) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Timeout cargando Stockfish. Probá recargar la página."));
        }
      }, 12000);

      const worker = new Worker(url);
      this.worker = worker;

      worker.onerror = (event) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(event.message || "Error cargando worker local de Stockfish."));
        }
      };

      worker.onmessage = (event) => {
        const line = typeof event.data === "string" ? event.data : String(event.data);

        if (line.startsWith("error ") && !settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(line.replace("error ", "")));
          return;
        }

        this.handleMessage(line);

        if (!settled && line.includes("uciok")) {
          settled = true;
          clearTimeout(timeout);
          worker.postMessage("isready");
          worker.postMessage("setoption name Skill Level value 20");
          worker.postMessage("setoption name MultiPV value 1");
          resolve(true);
        }
      };

      worker.postMessage("uci");
    });
  }

  handleMessage(line) {
    this.messageLog.push(line);
    if (this.messageLog.length > 80) this.messageLog.shift();

    if (line.startsWith("info") && line.includes(" score ")) {
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);
      if (cpMatch) {
        this.lastScore = Number(cpMatch[1]) / 100;
        this.lastMate = null;
      }
      if (mateMatch) {
        this.lastMate = Number(mateMatch[1]);
        this.lastScore = this.lastMate > 0 ? 99 : -99;
      }
    }

    if (line.startsWith("bestmove") && this.currentResolve) {
      const parts = line.split(/\s+/);
      const bestMove = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
      const whiteEval = this.scoreToWhitePerspective(this.lastScore, this.currentFen);
      const result = {
        bestMove,
        eval: whiteEval,
        mate: this.lastMate,
        raw: line
      };

      const resolve = this.currentResolve;
      this.currentResolve = null;
      this.currentReject = null;
      this.busy = false;
      resolve(result);
    }
  }

  scoreToWhitePerspective(score, fen) {
    const activeColor = fen.split(" ")[1];
    return activeColor === "w" ? score : -score;
  }

  analyzePosition(fen, depth = 12) {
    return this.search(fen, depth);
  }

  getBestMove(fen, depth = 12) {
    return this.search(fen, depth);
  }

  search(fen, depth = 12) {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.ready) {
        reject(new Error("Stockfish no está disponible."));
        return;
      }
      if (this.busy) {
        reject(new Error("Stockfish está ocupado. Esperá a que termine el análisis."));
        return;
      }

      this.busy = true;
      this.currentResolve = resolve;
      this.currentReject = reject;
      this.currentFen = fen;
      this.lastScore = 0;
      this.lastMate = null;

      const timeout = setTimeout(() => {
        if (this.currentReject) {
          this.currentReject(new Error("Stockfish tardó demasiado en responder."));
          this.currentResolve = null;
          this.currentReject = null;
          this.busy = false;
          try { this.worker.postMessage("stop"); } catch (_) {}
        }
      }, 15000);

      const originalResolve = this.currentResolve;
      this.currentResolve = (value) => {
        clearTimeout(timeout);
        originalResolve(value);
      };

      this.worker.postMessage("ucinewgame");
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }
}

class RemoteEngineApi {
  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async analyze(engineId, fen, depth = 12) {
    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engineId, fen, depth })
    });
    if (!response.ok) throw new Error("Error en /api/analyze");
    return response.json();
  }

  async move(engineId, fen, depth = 12) {
    const response = await fetch(`${this.baseUrl}/api/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engineId, fen, depth })
    });
    if (!response.ok) throw new Error("Error en /api/move");
    return response.json();
  }
}
