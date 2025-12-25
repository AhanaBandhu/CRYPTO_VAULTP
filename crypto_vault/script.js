let selectedFile = null;
let receipts = [];
let albums = [];

// Check MetaMask connection before uploads
async function checkMetaMaskConnection() {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to use this feature');
        return false;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
            const confirmed = confirm('Please connect your MetaMask wallet to continue. Click OK to connect.');
            if (confirmed) {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                return true;
            }
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking MetaMask connection:', error);
        return false;
    }
}

        // Sample data
        const sampleReceipts = [
            {
                id: 1,
                title: "McDonald's",
                date: "2024-01-12",
                time: "12:20 PM",
                status: "verified",
                image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NYy5Eb25hbGQncyBSZWNlaXB0PC90ZXh0Pjwvc3ZnPg=="
            },
            {
                id: 2,
                title: "Walmart",
                date: "2024-01-11",
                time: "06:30 PM",
                status: "pending",
                image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5XYWxtYXJ0IFJlY2VpcHQ8L3RleHQ+PC9zdmc+"
            },
            {
                id: 3,
                title: "Amazon Fresh",
                date: "2024-01-10",
                time: "11:00 AM",
                status: "verified",
                image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BbWF6b24gRnJlc2g8L3RleHQ+PC9zdmc+"
            }
        ];

        // Initialize sample data
        receipts = [...sampleReceipts];

        // Sample albums
        albums = [
            {
                id: 1,
                title: "Monthly Food Bills",
                receipts: [1, 2]
            },
            {
                id: 2,
                title: "Office Expenses",
                receipts: [3]
            }
        ];

        function testCameraSupport() {
            console.log('Testing camera support...');
            console.log('navigator.mediaDevices:', !!navigator.mediaDevices);
            console.log('getUserMedia support:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
            console.log('Browser:', navigator.userAgent);

            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                alert('⚠️ Camera requires HTTPS or localhost. The camera may not work on HTTP websites.');
            }
        }

        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                selectedFile = file;
                const reader = new FileReader();
                reader.onload = function (e) {
                    const preview = document.getElementById('preview-container');
                    preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px; margin: 1rem 0; border-radius: 8px;">`;
                    document.getElementById('upload-btn').disabled = false;
                };
                reader.readAsDataURL(file);
            }
        }

        // Create a hash from the image data
        async function createHash(data) {
            const msgBuffer = new TextEncoder().encode(data);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        }

        async function uploadReceipt() {
            if (!await checkMetaMaskConnection()) return;
            if (!selectedFile) return;

            const title = document.getElementById('receipt-title').value || 'Untitled Receipt';
            const now = new Date();

            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    const imageData = e.target.result;
                    const imageHash = await createHash(imageData);
                    const ipfsHash = 'QmExample...'; // placeholder

                    const newReceipt = {
                        id: receipts.length + 1,
                        title,
                        date: now.toISOString().split('T')[0],
                        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: 'pending',
                        image: imageData,
                        hash: imageHash,
                        ipfsHash
                    };

                    try {
                        // Ensure contract is initialized / wallet connected before calling
                        try {
                            if (!await cryptoVault.isConnected()) {
                                await cryptoVault.connectWallet();
                            }
                        } catch (connErr) {
                            console.warn('Could not auto-connect before blockchain upload:', connErr);
                        }

                        const txReceipt = await cryptoVault.uploadReceiptToBlockchain(title, imageHash, ipfsHash);
                        newReceipt.status = 'verified';
                        newReceipt.txHash = txReceipt.transactionHash || txReceipt.transactionHash || null;
                    } catch (err) {
                        console.error('Blockchain upload error:', err);
                        newReceipt.status = 'pending';
                    }

                    receipts.push(newReceipt);
                    renderGallery();

                    // Reset form
                    document.getElementById('receipt-title').value = '';
                    document.getElementById('preview-container').innerHTML = '';
                    document.getElementById('upload-btn').disabled = true;
                    selectedFile = null;

                    alert('Receipt uploaded successfully!');
                } catch (err) {
                    console.error('Upload error:', err);
                    alert('Upload failed: ' + (err?.message || err));
                }
            };

            reader.readAsDataURL(selectedFile);
        }

        function renderGallery() {
            const gallery = document.getElementById('gallery-grid');
            gallery.innerHTML = receipts.map(receipt => `
                <div class="receipt-card">
                    <img src="${receipt.image}" alt="${receipt.title}" class="receipt-image">
                    <div class="receipt-info">
                        <h3 class="receipt-title">${receipt.title}</h3>
                        <div class="receipt-meta">
                            Date: ${receipt.date}<br>
                            Time: ${receipt.time}
                        </div>
                        <span class="status-badge ${receipt.status}">
                            ${receipt.status === 'verified' ? '✓ Blockchain Verified' : '⏳ Pending Verification'}
                        </span>
<div class="receipt-actions">
    <button class="view-btn" onclick="viewReceipt(${receipt.id})">View Receipt</button>
    <button class="blockchain-btn" onclick="viewOnBlockchain(${receipt.id})">
        ${receipt.status === 'verified' ? 'View on Blockchain' : 'Verify on Blockchain'}
    </button>
    <button class="delete-btn" onclick="deleteReceipt(${receipt.id})" style="background-color: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.3s ease; margin-top: 0.5rem;">Delete</button>
</div>
                    </div>
                </div>
            `).join('');

            renderAlbums();
        }

        function renderAlbums() {
            const albumsGrid = document.getElementById('albums-grid');
            albumsGrid.innerHTML = albums.map(album => {
                const albumReceipts = receipts.filter(r => album.receipts.includes(r.id));
                return `
                    <div class="album-card">
                        <h4 class="album-title">${album.title}</h4>
                        <div class="album-preview">
                            ${albumReceipts.slice(0, 3).map(r => `<img src="${r.image}" alt="${r.title}">`).join('')}
                            ${albumReceipts.length > 3 ? `<span>+${albumReceipts.length - 3} more</span>` : ''}
                        </div>
                        <p>${albumReceipts.length} receipt${albumReceipts.length !== 1 ? 's' : ''}</p>
                    </div>
                `;
            }).join('');
        }

        function viewReceipt(id) {
            const receipt = receipts.find(r => r.id === id);
            if (receipt) {
                const modal = document.getElementById('receipt-modal');
                const modalBody = document.getElementById('modal-body');
                modalBody.innerHTML = `
                    <h3>${receipt.title}</h3>
                    <p>Date: ${receipt.date} | Time: ${receipt.time}</p>
                    <img src="${receipt.image}" alt="${receipt.title}" style="max-width: 100%; margin-top: 1rem;">
                `;
                modal.style.display = 'block';
            }
        }

        function viewOnBlockchain(id) {
            // Track which receipt we're operating on
            window.currentReceiptId = id;
            const receipt = receipts.find(r => r.id === id);
            if (receipt && receipt.status === 'verified' && receipt.txHash) {
        // If already verified, show on blockchain explorer
                viewReceiptOnBlockchain(id);
            } else {
        // If not verified, start verification process
            document.getElementById('main-content').style.display = 'none';
            document.getElementById('blockchain-page').style.display = 'block';
            document.getElementById('step1').classList.add('active');
            }
        }

        function closeBlockchainPage() {
            document.getElementById('main-content').style.display = 'block';
            document.getElementById('blockchain-page').style.display = 'none';
            // Reset blockchain steps
            document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
            try {
                const btn = document.querySelector('.connect-wallet-btn');
                if (btn) {
                    btn.textContent = 'Connect MetaMask Wallet';
                    btn.onclick = connectWalletToBlockchain;
                }
            } catch (e) { console.warn('Failed to reset connect button:', e); }
        }

        function closeModal() {
            document.getElementById('receipt-modal').style.display = 'none';
        }

        function connectWallet() {
            // Simulate MetaMask connection
            document.getElementById('wallet-status').innerHTML = 'Connecting to MetaMask...';
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');

            setTimeout(() => {
                document.getElementById('wallet-status').innerHTML = 'Wallet connected! Uploading to IPFS...';
                document.getElementById('step2').classList.remove('active');
                document.getElementById('step3').classList.add('active');

                setTimeout(() => {
                    const hash = '0x' + Math.random().toString(16).substr(2, 40);
                    document.getElementById('wallet-status').innerHTML = 'Smart contract deployed successfully!';
                    document.getElementById('hash-container').style.display = 'block';
                    document.getElementById('transaction-hash').innerHTML = hash;
                }, 2000);
            }, 2000);
        }

        function deleteReceipt(id) {
            if (confirm('Are you sure you want to delete this receipt?')) {
                const index = receipts.findIndex(r => r.id === id);
                if (index !== -1) {
                    receipts.splice(index, 1);
                    renderGallery();
                    renderAlbums();
                }
            }
        }

        function createNewAlbum() {
            document.getElementById('album-modal').style.display = 'block';
            document.getElementById('album-name').value = '';
        }

        function closeAlbumModal() {
            document.getElementById('album-modal').style.display = 'none';
        }

        // Drag and drop for album - removed old drag-drop handlers

        // New drag-drop handlers for dragging receipts to albums
        function makeReceiptsDraggable() {
            const receiptCards = document.querySelectorAll('.receipt-card');
            receiptCards.forEach(card => {
                card.setAttribute('draggable', 'true');
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', card.querySelector('.view-btn').getAttribute('onclick').match(/\d+/)[0]);
                    e.dataTransfer.effectAllowed = 'move';
                });
            });
        }

        function makeAlbumsDroppable() {
            const albumCards = document.querySelectorAll('.album-card');
            albumCards.forEach(card => {
                card.addEventListener('dragover', (e) => e.preventDefault());
                card.addEventListener('dragenter', (e) => { card.style.border = '2px dashed #007bff'; });
                card.addEventListener('dragleave', (e) => { card.style.border = 'none'; });
                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.style.border = 'none';
                    const receiptId = parseInt(e.dataTransfer.getData('text/plain'));
                    const albumTitle = card.querySelector('.album-title').textContent;
                    addReceiptToAlbum(receiptId, albumTitle);
                });
            });
        }

        function addReceiptToAlbum(receiptId, albumTitle) {
            const album = albums.find(a => a.title === albumTitle);
            if (!album) return;
            if (!album.receipts.includes(receiptId)) {
                album.receipts.push(receiptId);
                renderAlbums();
            }
        }

        // Camera functions
        let cameraStream = null;

        function createAlbum() {
            const albumName = document.getElementById('album-name').value.trim();
            if (!albumName) {
                alert('Please enter an album name.');
                return;
            }
            // Check if album with same name exists
            if (albums.some(a => a.title === albumName)) {
                alert('Album with this name already exists.');
                return;
            }
            const newAlbum = {
                id: albums.length + 1,
                title: albumName,
                receipts: []
            };
            albums.push(newAlbum);
            renderAlbums();
            closeAlbumModal();
            alert('Blank album created successfully! You can now drag receipts into it.');
        }

        function openCameraModal() {
            document.getElementById('camera-modal').style.display = 'block';
            document.getElementById('camera-placeholder').style.display = 'flex';
            document.getElementById('camera-video').style.display = 'none';
            document.getElementById('start-camera-btn').disabled = false;
            document.getElementById('capture-btn').disabled = true;
            document.getElementById('stop-camera-btn').disabled = true;
        }

        function closeCameraModal() {
            stopCamera();
            document.getElementById('camera-modal').style.display = 'none';
        }

        // Update renderGallery and renderAlbums to add drag-drop handlers after rendering
        function renderGallery() {
            const gallery = document.getElementById('gallery-grid');
            gallery.innerHTML = receipts.map(receipt => `
                <div class="receipt-card" draggable="true">
                    <img src="${receipt.image}" alt="${receipt.title}" class="receipt-image">
                    <div class="receipt-info">
                        <h3 class="receipt-title">${receipt.title}</h3>
                        <div class="receipt-meta">
                            Date: ${receipt.date}<br>
                            Time: ${receipt.time}
                        </div>
                        <span class="status-badge ${receipt.status}">
                            ${receipt.status === 'verified' ? '✓ Blockchain Verified' : '⏳ Pending Verification'}
                        </span>
<div class="receipt-actions">
    <button class="view-btn" onclick="viewReceipt(${receipt.id})">View Receipt</button>
    <button class="blockchain-btn" onclick="viewOnBlockchain(${receipt.id})">
        ${receipt.status === 'verified' ? 'View on Blockchain' : 'Verify on Blockchain'}
    </button>
    <button class="delete-btn" onclick="deleteReceipt(${receipt.id})" style="background-color: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.3s ease; margin-top: 0.5rem;">Delete</button>
</div>
                    </div>
                </div>
            `).join('');
            makeReceiptsDraggable();
            renderAlbums();
        }

        function renderAlbums() {
            const albumsGrid = document.getElementById('albums-grid');
            albumsGrid.innerHTML = albums.map(album => {
                const albumReceipts = receipts.filter(r => album.receipts.includes(r.id));
                return `
                    <div class="album-card" ondragover="event.preventDefault()" ondrop="handleDrop(event, ${album.id})">
                        <h4 class="album-title">${album.title}</h4>
                        <div class="album-preview">
                            ${albumReceipts.slice(0, 3).map(r => `<img src="${r.image}" alt="${r.title}">`).join('')}
                            ${albumReceipts.length > 3 ? `<span>+${albumReceipts.length - 3} more</span>` : ''}
                        </div>
                        <p>${albumReceipts.length} receipt${albumReceipts.length !== 1 ? 's' : ''}</p>
                    </div>
                `;
            }).join('');
            makeAlbumsDroppable();
        }

        function handleDrop(event, albumId) {
            event.preventDefault();
            const receiptId = parseInt(event.dataTransfer.getData('text/plain'));
            const album = albums.find(a => a.id === albumId);
            if (!album) return;
            if (!album.receipts.includes(receiptId)) {
                album.receipts.push(receiptId);
                renderAlbums();
            }
        }

        async function startCamera() {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                    audio: false
                });
                const video = document.getElementById('camera-video');
                video.srcObject = cameraStream;
                video.style.display = 'block';
                document.getElementById('camera-placeholder').style.display = 'none';
                document.getElementById('start-camera-btn').disabled = true;
                document.getElementById('capture-btn').disabled = false;
                document.getElementById('stop-camera-btn').disabled = false;
            } catch (error) {
                alert('Camera access denied or not available. Please check your camera permissions.');
                console.error('Camera error:', error);
            }
        }

        function captureImage() {
            const video = document.getElementById('camera-video');
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            // Convert dataURL to File object
            const blob = dataURLtoBlob(dataUrl);
            selectedFile = new File([blob], 'captured-receipt.jpg', { type: 'image/jpeg' });

            // Show preview
            const preview = document.getElementById('preview-container');
            preview.innerHTML = `<img src="${dataUrl}" style="max-width: 200px; max-height: 200px; margin: 1rem 0; border-radius: 8px;">`;
            document.getElementById('upload-btn').disabled = false;

            // Close camera modal
            closeCameraModal();

            alert('Image captured successfully! You can now upload it.');
        }

        function stopCamera() {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
            }
            const video = document.getElementById('camera-video');
            video.style.display = 'none';
            document.getElementById('camera-placeholder').style.display = 'flex';
            document.getElementById('start-camera-btn').disabled = false;
            document.getElementById('capture-btn').disabled = true;
            document.getElementById('stop-camera-btn').disabled = true;
        }

        function dataURLtoBlob(dataURL) {
            const arr = dataURL.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        }

        // Initialize gallery with sample data
        renderGallery();

        // Close modal when clicking outside
        window.onclick = function (event) {
            const modal = document.getElementById('receipt-modal');
            const cameraModal = document.getElementById('camera-modal');
            const albumModal = document.getElementById('album-modal');
            const clerkModal = document.getElementById('clerk-modal');

            if (event.target === modal) {
                closeModal();
            }
            if (event.target === cameraModal) {
                closeCameraModal();
            }
            if (event.target === albumModal) {
                closeAlbumModal();
            }
            if (event.target === clerkModal) {
                closeClerkModal();
            }
        }

        // Smooth scrolling for navigation
        document.querySelectorAll('.nav a').forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        // Clerk Configuration - Updated with your actual key
        // let clerkInstance = null;
        // let currentUser = null;

        // Initialize Clerk with your publishable key
        /*
        async function initializeClerk() {
            try {
                // Wait for Clerk to load
                await new Promise((resolve) => {
                    if (window.Clerk) {
                        resolve();
                    } else {
                        const checkClerk = setInterval(() => {
                            if (window.Clerk) {
                                clearInterval(checkClerk);
                                resolve();
                            }
                        }, 100);
                    }
                });

                clerkInstance = window.Clerk;
                await clerkInstance.load();

                // Check if user is already signed in
                currentUser = clerkInstance.user;
                updateAuthUI();

                // Listen for auth state changes
                clerkInstance.addListener(({ user }) => {
                    currentUser = user;
                    updateAuthUI();
                });

                console.log('Clerk initialized successfully');

            } catch (error) {
                console.error('Failed to initialize Clerk:', error);
                document.getElementById('auth-buttons').style.display = 'none';
                document.getElementById('auth-required-message').innerHTML = 'Authentication service temporarily unavailable. Please try refreshing the page.';
            }
        }
        */

        // Update authentication UI based on user state
        function updateAuthUI() {
            const signInBtn = document.getElementById('sign-in-btn');
            const userProfileBtn = document.getElementById('user-profile-btn');
            const signOutBtn = document.getElementById('sign-out-btn');
            const userName = document.getElementById('user-name');

            if (currentUser) {
                // User is signed in
                signInBtn.style.display = 'none';
                userProfileBtn.style.display = 'block';
                signOutBtn.style.display = 'block';

                // Display user's first name or email
                const displayName = currentUser.firstName ||
                    currentUser.emailAddresses[0]?.emailAddress.split('@')[0] ||
                    'User';
                userName.textContent = displayName;

                console.log('User signed in:', displayName);
            } else {
                // User is not signed in
                signInBtn.style.display = 'block';
                userProfileBtn.style.display = 'none';
                signOutBtn.style.display = 'none';

                console.log('No user signed in');
            }
        }

        // Open Clerk sign-in modal
        async function openClerkSignIn() {
            if (!clerkInstance) {
                console.error('Clerk not initialized');
                return;
            }

            try {
                await clerkInstance.openSignIn({
                    // Use the correct Clerk method for opening sign-in
                    appearance: {
                        theme: {
                            primaryColor: '#4a90e2'
                        }
                    }
                });

            } catch (error) {
                console.error('Error opening sign in:', error);
            }
        }

        // Sign out function
        async function signOut() {
            if (!clerkInstance) {
                console.error('Clerk not initialized');
                return;
            }

            try {
                await clerkInstance.signOut();
                currentUser = null;
                updateAuthUI();
                console.log('User signed out');
            } catch (error) {
                console.error('Error signing out:', error);
            }
        }

        // Initialize when DOM is loaded
        /*
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                initializeClerk();
            }, 500);
            // Auth button event listeners
            document.getElementById('sign-in-btn')?.addEventListener('click', openClerkSignIn);
            document.getElementById('sign-out-btn')?.addEventListener('click', signOut);

            // User profile button
            document.getElementById('user-profile-btn')?.addEventListener('click', () => {
                if (currentUser) {
                    alert(`Signed in as: ${currentUser.emailAddresses[0]?.emailAddress || 'User'}`);
                }
            });
        });
        */


// ========================================
// BLOCKCHAIN INTEGRATION FUNCTIONS
// ========================================

// Blockchain Integration Variables
let walletConnected = false;
let userAddress = null;

// Connect wallet for blockchain functionality
async function connectWalletToBlockchain() {
    try {
        document.getElementById('wallet-status').innerHTML = 'Connecting to wallet...';
        
        const address = await cryptoVault.connectWallet();
        walletConnected = true;
        userAddress = address;
        
        // Update UI
        document.getElementById('wallet-status').innerHTML = 'Wallet connected successfully! ✅';
        document.getElementById('connected-address').textContent = address.slice(0, 6) + '...' + address.slice(-4);
        document.getElementById('wallet-info').style.display = 'block';
        // Show contract link in wallet info (Snowtrace)
        try {
            const contractLink = document.createElement('div');
            const a = document.createElement('a');
            a.href = `https://testnet.snowtrace.io/address/${cryptoVault.contractAddress}`;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = 'Contract on Snowtrace';
            contractLink.appendChild(a);
            document.getElementById('wallet-info').appendChild(contractLink);
        } catch (e) { console.warn('Could not append contract link', e); }
        
        // Move to next step
        document.getElementById('step1').classList.remove('active');
        document.getElementById('step2').classList.add('active');
        
        // Change the page button to trigger IPFS upload. We'll keep a single Deploy button
        // in Step 3, so update the connect button here to be a single action for Step 2.
        try {
            const btn = document.querySelector('.connect-wallet-btn');
            if (btn) {
                // For Step 2 the button should start the IPFS upload. Do not create a second Deploy button.
                btn.textContent = 'Add to Storage';
                btn.onclick = () => {
                    uploadToIPFS().catch(err => console.error('Add to Storage error:', err));
                };
            }
        } catch (e) { console.warn('Failed to update connect button:', e); }

            // Do not auto-start upload; user will press 'Add to Storage' to start IPFS upload.
        
    } catch (error) {
        document.getElementById('wallet-status').innerHTML = 'Failed to connect wallet: ' + error.message;
        console.error('Wallet connection error:', error);
    }
}

// Simulate IPFS upload
async function uploadToIPFS() {
    try {
        document.getElementById('wallet-status').innerHTML = 'Uploading to IPFS...';

        // Get the current receipt file
        const receipt = receipts.find(r => r.id === currentReceiptId);
        if (!receipt) {
            throw new Error('Receipt file not found');
        }

        // Convert image data to file (if needed)
        let fileToUpload;
        if (selectedFile) {
            fileToUpload = selectedFile;
        } else {
            // Convert base64 image to file
            const response = await fetch(receipt.image);
            const blob = await response.blob();
            fileToUpload = new File([blob], `receipt-${receipt.id}.jpg`, { type: 'image/jpeg' });
        }

    // Upload to IPFS via Pinata
        // User will trigger upload via 'Add to Storage' button
        const ipfsHash = await uploadFileToPinata(fileToUpload);
        
        // Persist the IPFS hash and display it in Step 3. Do NOT auto-deploy.
        window.lastIpfsHash = ipfsHash;
        document.getElementById('wallet-status').innerHTML = `Uploaded to IPFS: ${ipfsHash}`;
        const ipfsContainer = document.getElementById('ipfs-container');
        if (ipfsContainer) ipfsContainer.style.display = 'block';
        const ipfsHashEl = document.getElementById('ipfs-hash');
        if (ipfsHashEl) ipfsHashEl.textContent = ipfsHash;

        document.getElementById('step2').classList.remove('active');
        document.getElementById('step3').classList.add('active');

        // Show Deploy controls for explicit user action
        const step3Actions = document.getElementById('step3-actions');
        if (step3Actions) step3Actions.style.display = 'block';
        // Use the page-level connect button as the single prominent Deploy button
        try {
            const pageBtn = document.querySelector('.connect-wallet-btn');
            const smallDeploy = document.getElementById('deploy-btn');
            if (pageBtn) {
                pageBtn.style.display = 'inline-block';
                pageBtn.textContent = 'Deploy';
                // When clicked, forward to the existing Deploy button handler (if present)
                pageBtn.onclick = () => {
                    try {
                        if (smallDeploy) {
                            smallDeploy.click();
                        } else {
                            // If small deploy not present, call deploy handler directly
                            const evt = new Event('click');
                            pageBtn.dispatchEvent(evt);
                        }
                    } catch (e) { console.warn('Deploy forwarding failed', e); }
                };
            }
            // Hide the smaller deploy button to avoid duplication
            if (smallDeploy) smallDeploy.style.display = 'none';
        } catch (e) { /* ignore */ }

    } catch (error) {
        let msg = error?.message || String(error);
        // Detect common Pinata 400 errors and provide guidance
        if (msg.indexOf('Pinata returned 400') !== -1 || msg.indexOf('400') !== -1) {
            msg += ' — Common causes: invalid Pinata JWT, file too large, or malformed request. Open pinata.cloud to verify your API key and JWT.';
        }
        document.getElementById('wallet-status').innerHTML = 'IPFS upload failed: ' + msg;
        console.error('IPFS upload error:', error);
        alert('IPFS upload failed: ' + msg + '\n\nTip: Check your Pinata JWT in the prompt and ensure the file size is within Pinata limits.');
    }
}

// Deploy to smart contract
async function deployToSmartContract(ipfsHash) {
    try {
        document.getElementById('wallet-status').innerHTML = 'Deploying to smart contract...';

        // Ensure ethers library is available (generateReceiptHash uses ethers utils)
        try { await cryptoVault.ensureEthers(); } catch (err) { console.warn('ensureEthers failed (continuing):', err); }

        // If the contract isn't connected, attempt to connect (user will see MetaMask popup)
        try {
            const connected = await cryptoVault.isConnected();
            if (!connected) {
                document.getElementById('wallet-status').innerHTML = 'Connecting wallet for blockchain transaction...';
                const addr = await cryptoVault.connectWallet();
                walletConnected = true;
                userAddress = addr;
                document.getElementById('connected-address').textContent = addr.slice(0, 6) + '...' + addr.slice(-4);
            }
        } catch (connErr) {
            console.error('Failed to ensure wallet connection before contract upload:', connErr);
            throw connErr;
        }

        // Get receipt data (you can customize this based on which receipt is being uploaded)
        const receiptTitle = "Sample Receipt " + Date.now();
        const receiptHash = cryptoVault.generateReceiptHash(receiptTitle, Date.now().toString());

        // Upload to blockchain
        const receipt = await cryptoVault.uploadReceiptToBlockchain(receiptTitle, receiptHash, ipfsHash);

        document.getElementById('wallet-status').innerHTML = 'Smart contract deployed successfully! 🚀';
        document.getElementById('hash-container').style.display = 'block';
        document.getElementById('transaction-hash').innerHTML = receipt.transactionHash;

        // Update the receipt status in local storage
        updateReceiptBlockchainStatus(receiptTitle, receipt.transactionHash, true);
        
    } catch (error) {
        document.getElementById('wallet-status').innerHTML = 'Smart contract deployment failed: ' + error.message;
        console.error('Smart contract error:', error);
    }
}

// Update receipt status after blockchain upload
function updateReceiptBlockchainStatus(title, txHash, isVerified) {
    const receipt = receipts.find(r => r.title === title);
    if (receipt) {
        receipt.status = isVerified ? 'verified' : 'pending';
        receipt.txHash = txHash;
        renderGallery();
        
        // Show success message
        alert('Receipt successfully uploaded to blockchain!\nTransaction: ' + txHash);
    }
}

// View receipt on blockchain explorer
function viewReceiptOnBlockchain(receiptId) {
    const receipt = receipts.find(r => r.id === receiptId);
    if (receipt && receipt.txHash) {
        const explorerUrl = `https://testnet.snowtrace.io/tx/${receipt.txHash}`;
        window.open(explorerUrl, '_blank');
    } else {
        alert('This receipt is not yet uploaded to blockchain. Click "Verify on Blockchain" first.');
    }
}

// Load blockchain receipts when user connects
async function loadBlockchainReceipts() {
    if (!walletConnected) return;
    
    try {
        const blockchainReceipts = await cryptoVault.getUserReceipts();
        
        // Merge with local receipts
        blockchainReceipts.forEach(bcReceipt => {
            const existingReceipt = receipts.find(r => r.title === bcReceipt.title);
            if (!existingReceipt) {
                receipts.push({
                    id: receipts.length + 1,
                    title: bcReceipt.title,
                    date: bcReceipt.timestamp.toISOString().split('T')[0],
                    time: bcReceipt.timestamp.toLocaleTimeString(),
                    status: bcReceipt.isVerified ? 'verified' : 'pending',
                    txHash: bcReceipt.receiptHash,
                    image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CbG9ja2NoYWluIFJlY2VpcHQ8L3RleHQ+PC9zdmc+"
                });
            }
        });
        
        renderGallery();
        
    } catch (error) {
        console.error('Failed to load blockchain receipts:', error);
    }
// end of script.js
}

// uploadToIPFS is defined earlier and is the single source-of-truth for
// initiating an IPFS upload. Remove duplicate implementations to avoid
// inconsistent behavior and hardcoded JWTs.

// New: Pinata helper functions and auto-start wiring
function ensurePinataJwt() {
    const key = localStorage.getItem('pinata_jwt');
    if (key && key.length > 10) return key;

    // Try to open the in-page modal for better UX instead of prompt
    openPinataModal();
    throw new Error('Pinata JWT required. Please enter it in the Pinata Settings modal.');
}

function openPinataModal() {
    const modal = document.getElementById('pinata-modal');
    if (!modal) {
        // fallback to prompt
        const jwt = window.prompt('Enter your Pinata JWT (visit pinata.cloud -> API Keys -> Copy JWT):');
        if (jwt && jwt.length > 10) {
            localStorage.setItem('pinata_jwt', jwt.trim());
            return jwt.trim();
        }
        return null;
    }
    document.getElementById('pinata-jwt-input').value = localStorage.getItem('pinata_jwt') || '';
    modal.style.display = 'block';
}

function closePinataModal() {
    const modal = document.getElementById('pinata-modal');
    if (modal) modal.style.display = 'none';
}

function savePinataJwt() {
    const input = document.getElementById('pinata-jwt-input');
    if (!input) return;
    const jwt = input.value.trim();
    if (!jwt || jwt.length < 10) {
        alert('Please enter a valid Pinata JWT');
        return;
    }
    localStorage.setItem('pinata_jwt', jwt);
    closePinataModal();
    alert('Pinata JWT saved');
    // Do not auto-start upload. Require explicit user action (click Add to Storage).
    const ws = document.getElementById('wallet-status');
    if (ws) ws.textContent = 'Pinata JWT saved. Click "Add to Storage" to upload.';
}

// Developer helper: quickly test Pinata connectivity with a tiny blob
async function testPinataUpload() {
    try {
        const jwt = localStorage.getItem('pinata_jwt');
        if (!jwt) {
            alert('No Pinata JWT found. Open Pinata Settings to add one.');
            openPinataModal();
            return;
        }

        const blob = new Blob(["test"], { type: 'text/plain' });
        const file = new File([blob], 'test.txt', { type: 'text/plain' });
        document.getElementById('wallet-status').textContent = 'Testing Pinata upload...';

        const ipfsHash = await uploadFileToPinata(file);
        alert('Pinata test upload succeeded: ' + ipfsHash);
        console.log('Pinata test upload result:', ipfsHash);
        document.getElementById('wallet-status').textContent = 'Pinata test succeeded: ' + ipfsHash;
    } catch (err) {
        console.error('Pinata test failed:', err);
        alert('Pinata test failed: ' + (err?.message || err));
        document.getElementById('wallet-status').textContent = 'Pinata test failed: ' + (err?.message || err);
    }
}

async function uploadFileToPinata(file) {
    const PINATA_JWT = ensurePinataJwt();

    const formData = new FormData();
    formData.append('file', file);

    // Provide optional metadata and options to pinata
    const metadata = JSON.stringify({ name: file.name, keyvalues: { uploadedBy: 'web-client' } });
    const options = JSON.stringify({ cidVersion: 1 });
    formData.append('pinataMetadata', metadata);
    formData.append('pinataOptions', options);

    try {
        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`
            },
            body: formData
        });

        if (!response.ok) {
            let bodyText = '';
            try { bodyText = await response.text(); } catch (e) { bodyText = '<unable to read response body>'; }
            console.error('Pinata error response', response.status, bodyText);
            throw new Error('Pinata returned ' + response.status + ': ' + bodyText);
        }

        const result = await response.json();
        console.log('Pinata success:', result);
        return result.IpfsHash; // Returns something like "QmXa7b..."

    } catch (error) {
        console.error('Pinata upload error:', error);
        throw error;
    }
}

// When the wallet connects (dispatched by blockchain.js), auto-start IPFS step
window.addEventListener('wallet-connected', (e) => {
    try {
        // Show step 2 UI immediately
        document.getElementById('step1').classList.remove('active');
        document.getElementById('step2').classList.add('active');

        // If Pinata JWT not stored, prompt user now so they see the prompt right after connecting
        try {
            if (!localStorage.getItem('pinata_jwt')) {
                // ensurePinataJwt will show a prompt; catch if user cancels
                ensurePinataJwt();
                console.log('Pinata JWT saved to localStorage');
            } else {
                console.log('Pinata JWT already present');
            }
        } catch (jwtErr) {
            console.warn('Pinata JWT not set or user canceled prompt:', jwtErr);
            // Inform the user in the UI
            const ws = document.getElementById('wallet-status');
            if (ws) ws.textContent = 'Pinata JWT not set. IPFS uploads will require your Pinata JWT.';
        }

        // Do NOT auto-start IPFS upload here. Require the user to click the
        // 'Add to Storage' button so uploads only run on explicit action. We'll ensure
        // Step 3 only shows the single `#deploy-btn` when active.
        const addBtn = document.querySelector('.connect-wallet-btn');
        if (addBtn) {
            addBtn.textContent = 'Add to Storage';
            addBtn.disabled = false;
            addBtn.onclick = () => {
                if (typeof uploadToIPFS === 'function') {
                    uploadToIPFS();
                } else {
                    console.warn('uploadToIPFS is not available');
                }
            };
        }
    } catch (err) {
        console.error('wallet-connected handler error:', err);
    }
});

// On page load, ensure Pinata JWT is set (open modal if missing)
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!localStorage.getItem('pinata_jwt')) {
            // Do not auto-open the Pinata modal. Instead, prompt the user to
            // open "Pinata Settings" when they are ready. This avoids
            // surprising modal popups during testing.
            console.log('Pinata JWT not found in localStorage. Open Pinata Settings to add it.');
        }
    } catch (err) {
        console.error('Error checking Pinata JWT on load:', err);
    }
    // Wire Deploy button: explicit user action to call deployToSmartContract
    try {
        const deployBtn = document.getElementById('deploy-btn');
        if (deployBtn) {
            deployBtn.addEventListener('click', async () => {
                try {
                    const ipfs = window.lastIpfsHash;
                    if (!ipfs) {
                        alert('No IPFS hash available. Upload to IPFS first.');
                        return;
                    }

                    // Build metadata for the receipt
                    const receiptTitle = document.getElementById('receipt-title')?.value || ('Uploaded Receipt ' + Date.now());
                    const receiptHash = (cryptoVault && typeof cryptoVault.generateReceiptHash === 'function') ? cryptoVault.generateReceiptHash(receiptTitle, Date.now().toString()) : ('' + Date.now());

                    // Prefer the lightweight helper in js/step3.js if available
                    if (window.step3 && typeof window.step3.uploadReceipt === 'function') {
                        try {
                            const res = await window.step3.uploadReceipt(receiptTitle, receiptHash, ipfs);
                            // step3.uploadReceipt already updates #transaction-hash and status
                            console.log('uploadReceipt result:', res);
                        } catch (err) {
                                // Show a cleaner popup with revert/simulation reason when available
                                const reason = err?.error?.message || err?.reason || err?.message || String(err);
                                console.error('uploadReceipt error:', err);

                                // If it's an Internal JSON-RPC error, try RPC fallbacks to get a clearer message
                                if (String(reason).toLowerCase().includes('internal json-rpc') || String(reason).toLowerCase().includes('internal error')) {
                                    try {
                                        const contract = await (window.step3 && window.step3.connectContract ? (await window.step3.connectContract()).contract : null);
                                        const abiEncoder = (contract && contract.interface) ? contract.interface : null;
                                        const encoded = abiEncoder ? abiEncoder.encodeFunctionData('uploadReceipt', [receiptTitle, receiptHash, ipfs]) : null;
                                        const rpcs = ['https://api.avax-test.network/ext/bc/C/rpc'];
                                        for (const rpc of rpcs) {
                                            try {
                                                const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: contract.address, data: encoded }, 'latest'] });
                                                const res = await fetch(rpc, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
                                                const j = await res.json();
                                                if (j.error) {
                                                    alert('RPC ' + rpc + ' error:\n' + (j.error.message || JSON.stringify(j.error)));
                                                } else if (j.result) {
                                                    alert('RPC ' + rpc + ' returned result: ' + j.result);
                                                }
                                            } catch (rpcErr) {
                                                console.warn('RPC fallback failed for', rpc, rpcErr);
                                            }
                                        }
                                    } catch (fallbackErr) {
                                        console.warn('RPC fallback procedure failed:', fallbackErr);
                                    }
                                }

                                alert('Deploy failed: ' + reason);
                                return;
                        }
                    } else {
                        // Fallback to existing deployToSmartContract — confirm with user
                        const ok = confirm('Proceed with on-chain deploy using built-in deploy? This will open MetaMask and create a transaction.');
                        if (ok) {
                            const tx = await deployToSmartContract(ipfs);
                            // deployToSmartContract returns after waiting for receipt, but
                            // if it returned a tx-like object, show pending link immediately
                            if (tx && tx.hash) {
                                const txEl = document.getElementById('transaction-hash');
                                const url = `https://testnet.snowtrace.io/tx/${tx.hash}`;
                                if (txEl) txEl.innerHTML = `<a href="${url}" target="_blank" rel="noopener">${tx.hash}</a>`;
                            }
                        }
                    }

                    // Keep IPFS hash visible after deploy (and add link to IPFS gateway)
                    const ipfsHashEl = document.getElementById('ipfs-hash');
                    if (ipfsHashEl) {
                        const gateway = `https://ipfs.io/ipfs/${ipfs}`;
                        ipfsHashEl.innerHTML = `<a href="${gateway}" target="_blank" rel="noopener">${ipfs}</a>`;
                    }
                } catch (err) {
                    console.error('Deploy button error:', err);
                    alert('Deploy failed: ' + (err?.message || err));
                }
            });
        }
    } catch (err) {
        console.warn('Failed to wire deploy button:', err);
    }
});