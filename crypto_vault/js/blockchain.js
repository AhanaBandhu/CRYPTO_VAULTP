// blockchain.js - Handle blockchain interactions

document.addEventListener('DOMContentLoaded', async () => {
    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    const connectedAddress = document.getElementById('connected-address');
    const walletInfo = document.getElementById('wallet-info');
    const walletStatus = document.getElementById('wallet-status');

    async function checkMetaMask() {
        // Wait briefly for injected provider if needed
        let attempts = 0;
        while (typeof window.ethereum === 'undefined' && attempts < 6) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (typeof window.ethereum === 'undefined') {
            if (connectWalletBtn) {
                connectWalletBtn.textContent = 'Install MetaMask';
                connectWalletBtn.addEventListener('click', () => {
                    window.open('https://metamask.io/download/', '_blank');
                });
            }
            return false;
        }
        return true;
    }

    async function updateConnectionStatus() {
        try {
            if (!window.cryptoVault) return;
            const isConnected = await cryptoVault.isConnected();
            const account = await cryptoVault.getAccount();

            if (isConnected && account) {
                if (connectWalletBtn) connectWalletBtn.textContent = `Connected: ${account.substr(0,6)}...${account.substr(-4)}`;
                if (connectWalletBtn) connectWalletBtn.classList.add('connected');
            } else {
                if (connectWalletBtn) {
                    connectWalletBtn.textContent = 'Connect Wallet';
                    connectWalletBtn.classList.remove('connected');
                }
            }
        } catch (err) {
            console.error('updateConnectionStatus error:', err);
        }
    }

    // Header connect button — request accounts and initialize
    connectWalletBtn?.addEventListener('click', async () => {
        try {
            if (!await checkMetaMask()) return;
            // Ensure ethers lib is available before connecting
            try {
                await cryptoVault.ensureEthers();
            } catch (libErr) {
                console.error('Ethers load error:', libErr);
                alert('Failed to load ethers library. Check network or try reloading.');
                return;
            }

            await cryptoVault.connectWallet();
            await updateConnectionStatus();
            // Notify other scripts that wallet is connected
            try { window.dispatchEvent(new CustomEvent('wallet-connected', { detail: { source: 'header' } })); } catch(e){}
        } catch (err) {
            console.error('Header connect error:', err);
            alert('Failed to connect wallet: ' + (err?.message || err));
        }
    });

    // Function used by modal button to connect (wired in HTML)
    window.connectWalletToBlockchain = async function() {
        if (!walletStatus || !walletInfo || !connectedAddress) return;
        walletStatus.textContent = 'Connecting...';

        try {
            if (!await checkMetaMask()) {
                walletStatus.textContent = 'MetaMask not detected';
                return;
            }
            try {
                await cryptoVault.ensureEthers();
            } catch (libErr) {
                console.error('Ethers load error (modal):', libErr);
                walletStatus.textContent = 'Failed to load ethers library';
                alert('Failed to load ethers library. Try reloading the page.');
                return;
            }

            await cryptoVault.connectWallet();
            const acct = await cryptoVault.getAccount();
            if (acct) {
                connectedAddress.textContent = acct;
                walletInfo.style.display = 'block';
                walletStatus.textContent = 'Connected';
                await updateConnectionStatus();
                // Notify other scripts that wallet is connected (modal)
                try { window.dispatchEvent(new CustomEvent('wallet-connected', { detail: { source: 'modal' } })); } catch(e){}
            } else {
                walletStatus.textContent = 'Connected, but no account found';
            }
        } catch (err) {
            console.error('Modal connect error:', err);
            walletStatus.textContent = 'Connection failed: ' + (err?.message || err);
            alert('Failed to connect MetaMask: ' + (err?.message || err));
        }
    };

    // Handle "View on Blockchain" button clicks
    document.addEventListener('click', async (e) => {
        const target = e.target;
        if (target && target.classList && target.classList.contains('view-on-blockchain')) {
            const tokenId = target.getAttribute('data-token-id');
            if (!tokenId) {
                console.error('No token ID found');
                return;
            }

            try {
                if (!await cryptoVault.isConnected()) {
                    alert('Please connect your wallet first');
                    return;
                }

                const receipt = await cryptoVault.getReceipt(tokenId);
                displayReceiptDetails(receipt);
            } catch (error) {
                console.error('Error fetching receipt:', error);
                alert('Failed to fetch receipt details. Please try again.');
            }
        }
    });

    // Display receipt details in a modal
    function displayReceiptDetails(receipt) {
        const modal = document.createElement('div');
        modal.className = 'blockchain-modal';

        const content = document.createElement('div');
        content.className = 'blockchain-modal-content';

        content.innerHTML = `
            <h2>Receipt Details</h2>
            <p><strong>Token ID:</strong> ${receipt.tokenId}</p>
            <p><strong>Title:</strong> ${receipt.title}</p>
            <p><strong>Receipt Hash:</strong> ${receipt.receiptHash}</p>
            <p><strong>Timestamp:</strong> ${new Date(receipt.timestamp * 1000).toLocaleString()}</p>
            <p><strong>Uploader:</strong> ${receipt.uploader}</p>
            <p><strong>IPFS Hash:</strong> ${receipt.ipfsHash}</p>
            <p><strong>Verified:</strong> ${receipt.isVerified ? 'Yes' : 'No'}</p>
            <button class="close-modal">Close</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Close modal functionality
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // Initial status update
    await updateConnectionStatus();
});
