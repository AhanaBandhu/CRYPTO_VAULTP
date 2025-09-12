/* ========= Simple client-side receipt manager =========
  - Keeps receipts in memory for this session (no back-end)
  - Simulates generating a content-hash (SHA-256) for each upload
  - Allows drag-to-select, click-select, and grouping into albums
  - No external dependencies; uses SubtleCrypto for hashing
*/

// Data storage (in-memory for prototype)
const receipts = []; // { id, title, dataUrl, date, time, hash, albums: [] }
const albums = []; // { id, title, items: [receiptIds] }

// Helpers
const $ = id => document.getElementById(id);
const galleryGrid = $('galleryGrid');
const albumsArea = $('albumsArea');
const selectionBox = $('selectionBox');

function nowDateTime(){
  const d = new Date();
  return {
    date: d.toISOString().split('T')[0],
    time: d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  };
}

// compute SHA-256 and return hex
async function computeSHA256(dataBuffer){
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

// utility: convert dataURL -> ArrayBuffer
function dataURLtoArrayBuffer(dataURL){
  const binary = atob(dataURL.split(',')[1]);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i=0;i<len;i++){
    bytes[i]=binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// UI creation
function renderGallery(){
  galleryGrid.innerHTML = '';
  receipts.forEach(r => {
    const el = document.createElement('article');
    el.className = 'receiptCard';
    el.dataset.id = r.id;
    el.innerHTML = `
      <img src="${r.dataUrl}" alt="${escapeHtml(r.title)}" class="receiptThumb" />
      <div class="receiptBody">
        <div class="receiptTitle">${escapeHtml(r.title || 'Untitled')}</div>
        <div class="receiptMeta">${r.date} • ${r.time}</div>
        <div class="receiptActions">
          <button class="btn ghost small viewBtn">View Receipt</button>
          <button class="btn small viewChainBtn">View on Blockchain</button>
        </div>
      </div>
    `;
    if (r.albums && r.albums.length) {
      const tag = document.createElement('div');
      tag.className = 'badge';
      tag.style.margin = '8px';
      tag.textContent = 'Album: ' + r.albums.join(', ');
      tag.style.background = 'rgba(0,0,0,0.03)';
      el.appendChild(tag);
    }

    // click to select
    el.addEventListener('click', (ev) => {
      if (ev.target.tagName.toLowerCase()==='button') return; // ignore buttons
      toggleSelectCard(el);
    });

    // right click context menu (for grouping)
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const selected = getSelectedCards();
      if (!selected.length || !selected.some(s=>s.dataset.id===el.dataset.id)) {
        // if this card isn't selected, select it exclusively
        clearSelectionAll();
        el.classList.add('selected');
      }
      openGroupPrompt();
    });

    // button handlers
    el.querySelector('.viewBtn').addEventListener('click', (e) => { e.stopPropagation(); viewReceipt(r.id); });
    el.querySelector('.viewChainBtn').addEventListener('click', (e) => { e.stopPropagation(); viewOnChain(r.id); });

    galleryGrid.appendChild(el);
  });
}

// sanitize simple text
function escapeHtml(s){ return String(s).replace(/[&<>"'`]/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;' }[m])); }

// selection helpers
function toggleSelectCard(el){
  el.classList.toggle('selected');
}
function clearSelectionAll(){
  document.querySelectorAll('.receiptCard.selected').forEach(x=>x.classList.remove('selected'));
}
function getSelectedCards(){
  return Array.from(document.querySelectorAll('.receiptCard.selected'));
}
$('clearSelection').addEventListener('click', clearSelectionAll);

// view receipt modal
$('closeModal').addEventListener('click', ()=> $('viewModal').classList.remove('open'));
function viewReceipt(id){
  const r = receipts.find(x=>x.id===id);
  if (!r) return;
  $('modalTitle').textContent = r.title || 'Receipt';
  $('modalImg').src = r.dataUrl;
  $('viewModal').classList.add('open');
}

// view chain modal (simulated)
$('closeChain').addEventListener('click', ()=> $('chainModal').classList.remove('open'));
async function viewOnChain(id){
  const r = receipts.find(x=>x.id===id);
  if (!r) return;
  $('chainModal').classList.add('open');
  const log = $('chainLog');
  log.innerHTML = 'Starting simulated upload to IPFS...';
  // simulate steps
  await wait(800);
  log.innerHTML = 'Connecting wallet (simulated)...';
  await wait(800);
  log.innerHTML = 'Uploading file to IPFS (simulated)...';
  await wait(800);
  // when "viewed on blockchain" we mark as verified
  if (!r.hash) {
    log.innerHTML = `File hash (simulated CID): <code style="font-weight:700;">${r.hash || 'calculating...'}</code>`;
    // simulate finalizing by showing the already computed hash
    // (receipt.hash is computed at upload time in this demo)
  } else {
    log.innerHTML = `File hash (simulated CID): <code style="font-weight:700;">${r.hash}</code>`;
  }

  // mark verified visually and update internal status
  await wait(600);
  // mark this receipt verified
  r.verified = true;
  // add a small "verified" badge in data (we re-render)
  renderGallery();

  log.innerHTML += `<div style="margin-top:8px; color:#374151;">To integrate: use Web3 (ethers/web3.js) + IPFS SDK / web3.storage. This demo shows a deterministic hash from the image content using SHA-256.</div>`;
}

// small wait
function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

// ALBUMS
function renderAlbums(){
  albumsArea.innerHTML = '';
  albums.forEach(a => {
    const el = document.createElement('div');
    el.className = 'album';
    el.textContent = `${a.title} (${a.items.length})`;
    el.addEventListener('click', ()=>{
      // filter gallery to show only this album items (simple highlight)
      clearSelectionAll();
      document.querySelectorAll('.receiptCard').forEach(card => {
        const r = receipts.find(x=>x.id===card.dataset.id);
        if (!r) { card.style.display='none'; return; }
        if (r.albums && r.albums.includes(a.title)) card.style.display='';
        else card.style.display='none';
      });
      // small reset button
      const reset = document.createElement('button');
      reset.className='btn ghost small';
      reset.style.marginLeft='10px';
      reset.textContent='Show all';
      reset.addEventListener('click', ()=>{
        document.querySelectorAll('.receiptCard').forEach(c=>c.style.display='');
        reset.remove();
      });
      albumsArea.appendChild(reset);
    });
    albumsArea.appendChild(el);
  });
}

// Grouping prompt
function openGroupPrompt(){
  const selected = getSelectedCards();
  if (!selected.length) { alert('Select one or more receipts first.'); return; }
  const title = prompt('Group selected receipts into album — enter album title:');
  if (!title) return;
  const albumId = 'alb_' + Date.now();
  const itemIds = selected.map(el => el.dataset.id);
  albums.push({ id: albumId, title, items: itemIds });
  // add album tag to receipts
  itemIds.forEach(id => {
    const r = receipts.find(x=>x.id===id);
    if (!r.albums) r.albums=[];
    if (!r.albums.includes(title)) r.albums.push(title);
  });
  renderAlbums();
  renderGallery();
  clearSelectionAll();
}

// Drag-to-select implementation
let dragStart = null;
let dragging = false;
let galleryRect = null;
galleryGrid.addEventListener('mousedown', (e)=>{
  if (e.button !== 0) return;
  dragStart = { x: e.clientX, y: e.clientY };
  dragging = true;
  galleryRect = galleryGrid.getBoundingClientRect();
  selectionBox.style.left = e.clientX + 'px';
  selectionBox.style.top = e.clientY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  selectionBox.style.display = 'block';
});
window.addEventListener('mousemove', (e)=>{
  if (!dragging) return;
  const x = Math.min(e.clientX, dragStart.x);
  const y = Math.min(e.clientY, dragStart.y);
  const w = Math.abs(e.clientX - dragStart.x);
  const h = Math.abs(e.clientY - dragStart.y);
  selectionBox.style.left = x + 'px';
  selectionBox.style.top = y + 'px';
  selectionBox.style.width = w + 'px';
  selectionBox.style.height = h + 'px';

  // select intersecting cards
  const box = {
    left: x, right: x + w, top: y, bottom: y + h
  };
  document.querySelectorAll('.receiptCard').forEach(card => {
    const rc = card.getBoundingClientRect();
    const intersect = !(rc.right < box.left || rc.left > box.right || rc.bottom < box.top || rc.top > box.bottom);
    if (intersect) card.classList.add('selected'); else card.classList.remove('selected');
  });
});
window.addEventListener('mouseup', (e)=>{
  if (dragging) {
    dragging = false;
    selectionBox.style.display = 'none';
  }
});

// Upload logic
const fileInput = $('fileInput');
const titleInput = $('titleInput');
const uploadBtn = $('uploadBtn');
let lastCapturedDataUrl = null;

// camera controls
const startCamera = $('startCamera');
const captureBtn = $('captureBtn');
const stopCamera = $('stopCamera');
const video = $('camera');
const cameraPlaceholder = $('cameraPlaceholder');
let stream = null;

startCamera.addEventListener('click', async ()=>{
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    video.style.display = 'block';
    cameraPlaceholder.style.display = 'none';
    captureBtn.disabled = false;
    stopCamera.disabled = false;
    startCamera.disabled = true;
  } catch (err) {
    alert('Camera not available or permission denied.');
    console.error(err);
  }
});
captureBtn.addEventListener('click', ()=>{
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  lastCapturedDataUrl = dataUrl;
  // show a tiny preview in camera area
  cameraPlaceholder.style.display='none';
  video.style.display='none';
  const img = document.createElement('img');
  img.src = dataUrl;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit='cover';
  cameraPreviewReplace(img);
  captureBtn.disabled = true;
});
stopCamera.addEventListener('click', ()=>{
  if (stream) {
    stream.getTracks().forEach(t=>t.stop());
    stream=null;
  }
  video.style.display='none';
  cameraPlaceholder.style.display='';
  captureBtn.disabled = true;
  stopCamera.disabled = true;
  startCamera.disabled = false;
});
function cameraPreviewReplace(node){
  const preview = $('cameraPreview');
  preview.innerHTML='';
  preview.appendChild(node);
}

// When user clicks upload
uploadBtn.addEventListener('click', async ()=>{
  // pick image: file input prioritized; else captured
  let file = null;
  if (fileInput.files && fileInput.files[0]) file = fileInput.files[0];
  else if (lastCapturedDataUrl) {
    // convert dataURL to blob
    const blob = dataURLtoBlob(lastCapturedDataUrl);
    file = new File([blob], 'capture.jpg', { type:'image/jpeg' });
  }
  if (!file) { alert('Choose a file or capture a photo first.'); return; }
  const title = titleInput.value.trim() || 'Untitled';

  // read as dataURL
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    // compute hash (SHA-256)
    const ab = dataURLtoArrayBuffer(dataUrl);
    const hash = await computeSHA256(ab);
    const id = 'r_' + Date.now();
    const { date, time } = nowDateTime();
    receipts.unshift({ id, title, dataUrl, date, time, hash, albums: [], verified: false });
    renderGallery();
    // clear inputs
    fileInput.value = '';
    titleInput.value = '';
    lastCapturedDataUrl = null;
    cameraPreviewReset();
    // simulate vault upload toast
    toast(`Uploaded "${title}" — simulated CID: ${hash.substring(0,16)}...`);
  };
  reader.readAsDataURL(file);
});

// small toast
function toast(txt){
  const el = document.createElement('div');
  el.textContent = txt;
  el.style.position='fixed';
  el.style.right='20px';
  el.style.bottom='20px';
  el.style.zIndex=99999;
  el.style.padding='12px 16px';
  el.style.borderRadius='10px';
  el.style.background='linear-gradient(90deg,var(--accent), #66b3ff)';
  el.style.color='#fff';
  el.style.fontWeight='700';
  document.body.appendChild(el);
  setTimeout(()=>el.style.opacity='0', 2500);
  setTimeout(()=>el.remove(), 3200);
}
function dataURLtoBlob(dataurl){
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], {type:mime});
}
function cameraPreviewReset(){
  const preview = $('cameraPreview');
  preview.innerHTML = '<div id="cameraPlaceholder" style="padding:12px; text-align:center; color:var(--muted);">Camera preview will appear here.</div>';
}

// small utility to preload example receipts (optional)
function seedDemo(){
  // nothing by default
}

// navigation smooth scroll
document.querySelectorAll('nav a').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    const href = a.getAttribute('href');
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  });
});

// context: right-click album grouping offered via prompt
function addGlobalContext(){
  document.addEventListener('keydown', (e)=>{
    // delete selection with Delete key
    if (e.key === 'Delete'){
      const selected = getSelectedCards().map(n=>n.dataset.id);
      if (!selected.length) return;
      if (!confirm('Delete selected receipts?')) return;
      for (const id of selected){
        const idx = receipts.findIndex(r => r.id===id);
        if (idx>=0) receipts.splice(idx,1);
      }
      renderGallery(); renderAlbums();
    }
  });
}

// initialize
seedDemo();
renderGallery();
renderAlbums();
addGlobalContext();

/* ========== Utilities for demo UX ========== */

// allow right click on document to open grouping if some selected
document.addEventListener('contextmenu', (e) => {
  // if clicked on gallery area and we have selected cards — open grouping prompt
  if (e.target.closest('#galleryGrid')) {
    const sel = getSelectedCards();
    if (sel.length) {
      e.preventDefault();
      openGroupPrompt();
    }
  }
});

// small helper to prevent accidental drag-image behavior
document.addEventListener('dragstart', e => e.preventDefault());
