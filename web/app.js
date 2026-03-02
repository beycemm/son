const POLYGON_CHAIN_ID = "0x89";
const COMMISSION_RATE = 0.10;
// TODO: kendi cüzdan adresinle değiştir
const PLATFORM_WALLET = "0x000000000000000000000000000000000000dEaD";
const STORAGE_KEY = "son_marketplace_data";

let currentAccount = null;

const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletStatus = document.getElementById("walletStatus");
const createAreaForm = document.getElementById("createAreaForm");
const sellAreaForm = document.getElementById("sellAreaForm");
const marketGrid = document.getElementById("marketGrid");
const txHistory = document.getElementById("txHistory");

const defaultState = { areas: [], listings: [], transactions: [] };

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

async function ensurePolygonNetwork() {
  const currentChain = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChain !== POLYGON_CHAIN_ID) {
    throw new Error("Lütfen MetaMask ağını Polygon Mainnet (MATIC) yapın.");
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask bulunamadı.");
    return;
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  currentAccount = accounts[0];
  await ensurePolygonNetwork();
  walletStatus.textContent = `Bağlı: ${shortAddress(currentAccount)}`;
  render();
}

function createArea(owner, areaName) {
  const state = loadState();
  if (state.areas.some((a) => a.name === areaName)) {
    throw new Error("Bu alan adı zaten mevcut.");
  }
  state.areas.push({ name: areaName, owner });
  saveState(state);
}

function listAreaForSale(owner, areaName, price) {
  const state = loadState();
  const area = state.areas.find((a) => a.name === areaName);
  if (!area) throw new Error("Alan bulunamadı.");
  if (area.owner.toLowerCase() !== owner.toLowerCase()) throw new Error("Alanın sahibi değilsiniz.");
  if (price <= 0) throw new Error("Fiyat 0'dan büyük olmalı.");
  if (state.listings.some((l) => l.areaName === areaName)) throw new Error("Alan zaten satışta.");

  state.listings.push({ areaName, seller: owner, price: Number(price) });
  saveState(state);
}

async function sendMatic(from, to, amountMatic) {
  const valueHex = ethers.utils.hexValue(ethers.utils.parseEther(String(amountMatic)));
  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from, to, value: valueHex }],
  });
}

async function buyArea(areaName) {
  if (!currentAccount) throw new Error("Önce cüzdan bağlayın.");
  await ensurePolygonNetwork();

  const state = loadState();
  const listing = state.listings.find((l) => l.areaName === areaName);
  if (!listing) throw new Error("İlan bulunamadı.");

  const total = Number(listing.price);
  const commission = Number((total * COMMISSION_RATE).toFixed(6));
  const sellerPayout = Number((total - commission).toFixed(6));

  const commissionTx = await sendMatic(currentAccount, PLATFORM_WALLET, commission);
  const sellerTx = await sendMatic(currentAccount, listing.seller, sellerPayout);

  const area = state.areas.find((a) => a.name === areaName);
  area.owner = currentAccount;
  state.listings = state.listings.filter((l) => l.areaName !== areaName);
  state.transactions.push({
    areaName,
    seller: listing.seller,
    buyer: currentAccount,
    salePrice: total,
    commission,
    sellerPayout,
    commissionTx,
    sellerTx,
    at: new Date().toISOString(),
  });
  saveState(state);
}

function renderMarket() {
  const state = loadState();
  marketGrid.innerHTML = "";

  if (!state.listings.length) {
    marketGrid.innerHTML = '<p class="muted">Aktif ilan yok.</p>';
    return;
  }

  const template = document.getElementById("listingTemplate");

  state.listings.forEach((listing) => {
    const card = template.content.cloneNode(true);
    const commission = (Number(listing.price) * COMMISSION_RATE).toFixed(4);

    card.querySelector(".name").textContent = listing.areaName;
    card.querySelector(".owner").textContent = `Satıcı: ${shortAddress(listing.seller)}`;
    card.querySelector(".price").textContent = `Fiyat: ${listing.price} MATIC`;
    card.querySelector(".commission").textContent = `Komisyon (%10): ${commission} MATIC`;

    const buyBtn = card.querySelector(".buyBtn");
    buyBtn.disabled = !currentAccount;
    buyBtn.addEventListener("click", async () => {
      try {
        await buyArea(listing.areaName);
        render();
        alert("Satın alma tamamlandı.");
      } catch (error) {
        alert(error.message || "Satın alma başarısız.");
      }
    });

    marketGrid.appendChild(card);
  });
}

function renderHistory() {
  const state = loadState();
  if (!state.transactions.length) {
    txHistory.innerHTML = '<p class="muted">Henüz işlem yok.</p>';
    return;
  }

  txHistory.innerHTML = state.transactions
    .slice()
    .reverse()
    .map(
      (tx) => `<p class="success">${tx.areaName}: ${tx.salePrice} MATIC | komisyon ${tx.commission} | alıcı ${shortAddress(tx.buyer)}</p>`
    )
    .join("");
}

function render() {
  renderMarket();
  renderHistory();
}

connectWalletBtn.addEventListener("click", async () => {
  try {
    await connectWallet();
  } catch (error) {
    alert(error.message || "Bağlantı kurulamadı.");
  }
});

createAreaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    if (!currentAccount) throw new Error("Önce MetaMask bağlayın.");
    const areaName = document.getElementById("createAreaName").value.trim();
    createArea(currentAccount, areaName);
    createAreaForm.reset();
    render();
  } catch (error) {
    alert(error.message || "Alan oluşturulamadı.");
  }
});

sellAreaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    if (!currentAccount) throw new Error("Önce MetaMask bağlayın.");
    const areaName = document.getElementById("sellAreaName").value.trim();
    const price = Number(document.getElementById("sellAreaPrice").value);
    listAreaForSale(currentAccount, areaName, price);
    sellAreaForm.reset();
    render();
  } catch (error) {
    alert(error.message || "İlan açılamadı.");
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
