const POLYGON_CHAIN_ID = "0x89";
const COMMISSION_RATE = 0.1;
const PLATFORM_WALLET = "0x000000000000000000000000000000000000dEaD";
const STORAGE_KEY = "son_pixel_market_v2";

const GRID_COLS = 100;
const GRID_ROWS = 60;
const CELL_SIZE = 10;

let currentAccount = null;
let dragStart = null;
let dragCurrent = null;

const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletStatus = document.getElementById("walletStatus");
const pixelCanvas = document.getElementById("pixelCanvas");
const ctx = pixelCanvas.getContext("2d");
const selectionInfo = document.getElementById("selectionInfo");
const stats = document.getElementById("stats");
const mintForm = document.getElementById("mintForm");
const sellForm = document.getElementById("sellForm");
const marketList = document.getElementById("marketList");
const history = document.getElementById("history");
const listingTemplate = document.getElementById("listingTemplate");

const defaultState = { blocks: [], listings: [], transactions: [] };

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : structuredClone(defaultState);
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function overlaps(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function normalizeRect(start, end) {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function getCanvasCell(evt) {
  const rect = pixelCanvas.getBoundingClientRect();
  const scaleX = pixelCanvas.width / rect.width;
  const scaleY = pixelCanvas.height / rect.height;
  const x = Math.floor(((evt.clientX - rect.left) * scaleX) / CELL_SIZE);
  const y = Math.floor(((evt.clientY - rect.top) * scaleY) / CELL_SIZE);
  return {
    x: Math.max(0, Math.min(GRID_COLS - 1, x)),
    y: Math.max(0, Math.min(GRID_ROWS - 1, y)),
  };
}

function selectedRect() {
  if (!dragStart || !dragCurrent) return null;
  return normalizeRect(dragStart, dragCurrent);
}

function drawGrid() {
  const state = loadState();
  ctx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, pixelCanvas.width, pixelCanvas.height);

  state.blocks.forEach((block) => {
    const listing = state.listings.find((l) => l.blockId === block.id);
    if (listing) {
      ctx.fillStyle = "#f59e0b";
    } else if (currentAccount && block.owner.toLowerCase() === currentAccount.toLowerCase()) {
      ctx.fillStyle = "#2563eb";
    } else {
      ctx.fillStyle = "#7c3aed";
    }

    ctx.fillRect(block.x * CELL_SIZE, block.y * CELL_SIZE, block.w * CELL_SIZE, block.h * CELL_SIZE);
  });

  ctx.strokeStyle = "rgba(148,163,184,0.2)";
  for (let x = 0; x <= GRID_COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, GRID_ROWS * CELL_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(GRID_COLS * CELL_SIZE, y * CELL_SIZE);
    ctx.stroke();
  }

  const rect = selectedRect();
  if (rect) {
    ctx.strokeStyle = "#5eead4";
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x * CELL_SIZE, rect.y * CELL_SIZE, rect.w * CELL_SIZE, rect.h * CELL_SIZE);
    ctx.lineWidth = 1;
  }

  const sold = state.blocks.length;
  const total = GRID_COLS * GRID_ROWS;
  const usedPixels = state.blocks.reduce((acc, b) => acc + b.w * b.h, 0);
  stats.textContent = `Toplam ${total} piksel | Ayrılmış ${usedPixels} | Boş ${total - usedPixels} | Blok ${sold}`;
}

async function ensurePolygonNetwork() {
  const currentChain = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChain !== POLYGON_CHAIN_ID) {
    throw new Error("Polygon Mainnet (MATIC) ağına geçin.");
  }
}

async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask bulunamadı.");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  currentAccount = accounts[0];
  await ensurePolygonNetwork();
  walletStatus.textContent = `Bağlı: ${shortAddress(currentAccount)}`;
  render();
}

function mintBlock(name) {
  if (!currentAccount) throw new Error("Önce cüzdan bağlayın.");
  const rect = selectedRect();
  if (!rect) throw new Error("Önce tuvalden alan seçin.");

  const state = loadState();
  if (state.blocks.some((b) => overlaps(b, rect))) {
    throw new Error("Seçili alanın bir kısmı zaten dolu.");
  }

  const id = crypto.randomUUID();
  state.blocks.push({ id, name, owner: currentAccount, ...rect });
  saveState(state);
}

function listSelectedBlock(price) {
  if (!currentAccount) throw new Error("Önce cüzdan bağlayın.");
  const rect = selectedRect();
  if (!rect) throw new Error("Önce tuvalden blok seçin.");

  const state = loadState();
  const block = state.blocks.find((b) => b.x === rect.x && b.y === rect.y && b.w === rect.w && b.h === rect.h);
  if (!block) throw new Error("Bu blok daha önce sahiplenilmemiş.");
  if (block.owner.toLowerCase() !== currentAccount.toLowerCase()) throw new Error("Sadece sahibi satabilir.");
  if (state.listings.some((l) => l.blockId === block.id)) throw new Error("Blok zaten satışta.");
  if (price <= 0) throw new Error("Fiyat 0'dan büyük olmalı.");

  state.listings.push({ blockId: block.id, seller: currentAccount, price: Number(price) });
  saveState(state);
}

async function sendMatic(from, to, amountMatic) {
  const valueHex = ethers.utils.hexValue(ethers.utils.parseEther(String(amountMatic)));
  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from, to, value: valueHex }],
  });
}

async function buyListing(blockId) {
  if (!currentAccount) throw new Error("Önce cüzdan bağlayın.");
  await ensurePolygonNetwork();

  const state = loadState();
  const listing = state.listings.find((l) => l.blockId === blockId);
  if (!listing) throw new Error("İlan bulunamadı.");

  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) throw new Error("Blok bulunamadı.");

  const total = Number(listing.price);
  const commission = Number((total * COMMISSION_RATE).toFixed(6));
  const sellerPayout = Number((total - commission).toFixed(6));

  const commissionTx = await sendMatic(currentAccount, PLATFORM_WALLET, commission);
  const sellerTx = await sendMatic(currentAccount, listing.seller, sellerPayout);

  block.owner = currentAccount;
  state.listings = state.listings.filter((l) => l.blockId !== blockId);
  state.transactions.push({
    blockId,
    blockName: block.name,
    buyer: currentAccount,
    seller: listing.seller,
    total,
    commission,
    sellerPayout,
    commissionTx,
    sellerTx,
    at: new Date().toISOString(),
  });
  saveState(state);
}

function renderMarketAndHistory() {
  const state = loadState();
  marketList.innerHTML = "";

  if (!state.listings.length) {
    marketList.innerHTML = '<p class="muted">Aktif ilan yok.</p>';
  } else {
    state.listings.forEach((listing) => {
      const block = state.blocks.find((b) => b.id === listing.blockId);
      if (!block) return;
      const item = listingTemplate.content.cloneNode(true);
      item.querySelector(".name").textContent = block.name;
      item.querySelector(".meta").textContent = `Koordinat: (${block.x},${block.y}) ${block.w}x${block.h} | Satıcı: ${shortAddress(listing.seller)}`;
      item.querySelector(".price").textContent = `Fiyat: ${listing.price} MATIC (Komisyon: ${(listing.price * COMMISSION_RATE).toFixed(4)} MATIC)`;
      item.querySelector(".buyBtn").addEventListener("click", async () => {
        try {
          await buyListing(listing.blockId);
          render();
          alert("Satın alma tamamlandı.");
        } catch (error) {
          alert(error.message || "Satın alma başarısız.");
        }
      });
      marketList.appendChild(item);
    });
  }

  if (!state.transactions.length) {
    history.innerHTML = '<p class="muted">İşlem geçmişi boş.</p>';
  } else {
    history.innerHTML = state.transactions
      .slice()
      .reverse()
      .map((tx) => `<div class="listing"><strong>${tx.blockName}</strong><p>${tx.total} MATIC | komisyon ${tx.commission}</p></div>`)
      .join("");
  }
}

function renderSelectionInfo() {
  const rect = selectedRect();
  if (!rect) {
    selectionInfo.textContent = "Tuvalde sürükleyip bir dikdörtgen seç.";
    return;
  }
  selectionInfo.textContent = `Seçim: x=${rect.x}, y=${rect.y}, genişlik=${rect.w}, yükseklik=${rect.h}, piksel=${rect.w * rect.h}`;
}

function render() {
  renderSelectionInfo();
  drawGrid();
  renderMarketAndHistory();
}

pixelCanvas.addEventListener("mousedown", (evt) => {
  dragStart = getCanvasCell(evt);
  dragCurrent = dragStart;
  render();
});

pixelCanvas.addEventListener("mousemove", (evt) => {
  if (!dragStart) return;
  dragCurrent = getCanvasCell(evt);
  render();
});

window.addEventListener("mouseup", () => {
  if (!dragStart) return;
  render();
});

connectWalletBtn.addEventListener("click", async () => {
  try {
    await connectWallet();
  } catch (error) {
    alert(error.message || "Cüzdan bağlanamadı.");
  }
});

mintForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const name = document.getElementById("blockName").value.trim();
    mintBlock(name);
    mintForm.reset();
    render();
  } catch (error) {
    alert(error.message || "Blok sahiplenilemedi.");
  }
});

sellForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const price = Number(document.getElementById("sellPrice").value);
    listSelectedBlock(price);
    sellForm.reset();
    render();
  } catch (error) {
    alert(error.message || "İlan verilemedi.");
  }
});

if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    currentAccount = accounts[0] || null;
    walletStatus.textContent = currentAccount ? `Bağlı: ${shortAddress(currentAccount)}` : "Bağlı değil";
    render();
  });
}

render();
