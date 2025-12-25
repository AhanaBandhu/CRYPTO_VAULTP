// contract.js - CryptoVault Contract Integration
class CryptoVaultContract {
    constructor() {
        // Your deployed contract address on Avalanche Fuji
        this.contractAddress = "0x738ef9fe7ca3D75F95106DC6b380dDF6B0568A96";
        this.contract = null;
        this.signer = null;
        this.provider = null;
        
        // Contract ABI (Application Binary Interface)
        this.contractABI = [
            {
                "inputs": [],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
                    {"indexed": true, "internalType": "address", "name": "approved", "type": "address"},
                    {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"}
                ],
                "name": "Approval",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
                    {"indexed": true, "internalType": "address", "name": "operator", "type": "address"},
                    {"indexed": false, "internalType": "bool", "name": "approved", "type": "bool"}
                ],
                "name": "ApprovalForAll",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
                    {"indexed": false, "internalType": "string", "name": "title", "type": "string"},
                    {"indexed": false, "internalType": "string", "name": "receiptHash", "type": "string"},
                    {"indexed": false, "internalType": "address", "name": "uploader", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "ReceiptUploaded",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
                    {"indexed": false, "internalType": "address", "name": "verifier", "type": "address"}
                ],
                "name": "ReceiptVerified",
                "type": "event"
            },
            {
                "inputs": [
                    {"internalType": "string", "name": "_title", "type": "string"},
                    {"internalType": "string", "name": "_receiptHash", "type": "string"},
                    {"internalType": "string", "name": "_ipfsHash", "type": "string"}
                ],
                "name": "uploadReceipt",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "_tokenId", "type": "uint256"}],
                "name": "verifyReceipt",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "_tokenId", "type": "uint256"}],
                "name": "getReceipt",
                "outputs": [
                    {
                        "components": [
                            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
                            {"internalType": "string", "name": "title", "type": "string"},
                            {"internalType": "string", "name": "receiptHash", "type": "string"},
                            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
                            {"internalType": "address", "name": "uploader", "type": "address"},
                            {"internalType": "string", "name": "ipfsHash", "type": "string"},
                            {"internalType": "bool", "name": "isVerified", "type": "bool"}
                        ],
                        "internalType": "struct CryptoVault.Receipt",
                        "name": "",
                        "type": "tuple"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
                "name": "getUserReceipts",
                "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        // Avalanche Fuji network configuration
        this.network = {
            chainId: '0xA869', // 43113 in hex
            chainName: 'Avalanche Fuji Testnet',
            nativeCurrency: {
                name: 'AVAX',
                symbol: 'AVAX',
                decimals: 18,
            },
            rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
            blockExplorerUrls: ['https://testnet.snowtrace.io/'],
        };
        // CDN to fallback to if ethers is not present
        this.ethersCdn = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
    }

    // Add isConnected method here
    async isConnected() {
        try {
            if (!this.provider || !this.signer || !this.contract) {
                return false;
            }
            const accounts = await this.provider.listAccounts();
            return accounts && accounts.length > 0;
        } catch (error) {
            console.error('Error checking connection status:', error);
            return false;
        }
    }

    // Helper to access ethers safely (handles cases where the CDN didn't load)
    getEthers() {
        if (typeof window !== 'undefined' && window.ethers) return window.ethers;
        if (typeof ethers !== 'undefined') return ethers;
        throw new Error('ethers is not defined. Call ensureEthers() first or include the ethers script before contract.js');
    }

    // Async helper that ensures ethers is available. If not present, it will
    // dynamically inject the UMD script from jsDelivr and wait for it to load.
    async ensureEthers(timeout = 10000) {
        if (typeof window !== 'undefined' && window.ethers) return window.ethers;
        if (typeof ethers !== 'undefined') return ethers;

        // If running in a non-browser env, just throw
        if (typeof window === 'undefined' || !document) {
            throw new Error('Non-browser environment: ethers unavailable');
        }

        // If a script tag already exists for the CDN, wait for it to load
        const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.indexOf('ethers') !== -1);
        if (existing) {
            if (window.ethers) return window.ethers;
            await new Promise((resolve, reject) => {
                const t = setTimeout(() => reject(new Error('Timed out waiting for ethers script to load')), timeout);
                existing.addEventListener('load', () => { clearTimeout(t); resolve(); });
                existing.addEventListener('error', () => { clearTimeout(t); reject(new Error('Failed to load ethers script')) });
            });
            if (window.ethers) return window.ethers;
        }

        // Inject a new script tag and wait for load
        return await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = this.ethersCdn;
            script.async = true;
            const timer = setTimeout(() => {
                reject(new Error('Timed out loading ethers script'));
            }, timeout);

            script.onload = () => {
                clearTimeout(timer);
                if (window.ethers) resolve(window.ethers);
                else if (typeof ethers !== 'undefined') resolve(ethers);
                else reject(new Error('ethers loaded but not available on window'));
            };
            script.onerror = (ev) => {
                clearTimeout(timer);
                reject(new Error('Failed to load ethers script: ' + ev));
            };

            document.head.appendChild(script);
        });
    }

    // Backwards-compatible alias used by the frontend
    async connect() {
        return this.connectWallet();
    }

    // Return the currently connected account (or null)
    async getAccount() {
        try {
            if (!this.provider) return null;
            const accounts = await this.provider.listAccounts();
            return accounts && accounts.length > 0 ? accounts[0] : null;
        } catch (error) {
            try {
                // fallback to window.ethereum
                const accs = await window.ethereum.request({ method: 'eth_accounts' });
                return accs && accs.length > 0 ? accs[0] : null;
            } catch (err) {
                console.error('Error getting account:', err);
                return null;
            }
        }
    }

    // Connect to MetaMask and switch to Avalanche Fuji
    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask not found. Please install MetaMask.');
        }

        try {
            // Ensure ethers is available (load UMD if necessary)
            await this.ensureEthers();
            const ethersLib = this.getEthers();

            // Try switching/adding Avalanche Fuji
            try {
                const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
                if (currentChainId !== this.network.chainId) {
                    await this.switchToAvalancheFuji();
                }
            } catch (netErr) {
                console.warn('Could not switch to Avalanche Fuji automatically:', netErr);
            }

            // Request account access (shows MetaMask popup)
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

            // Initialize provider/signer/contract using the loaded ethers lib
            this.provider = new ethersLib.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            this.contract = new ethersLib.Contract(this.contractAddress, this.contractABI, this.signer);

            return accounts[0];
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
            throw error;
        }
    }

    // Switch to Avalanche Fuji network
    async switchToAvalancheFuji() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.network.chainId }],
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [this.network],
                    });
                } catch (addError) {
                    throw addError;
                }
            } else {
                throw switchError;
            }
        }
    }

    // Upload receipt to blockchain
    async uploadReceiptToBlockchain(title, receiptHash, ipfsHash) {
        if (!this.contract) {
            throw new Error("Contract not initialized. Connect wallet first.");
        }

        try {
            const tx = await this.contract.uploadReceipt(title, receiptHash, ipfsHash, {
                gasLimit: 300000
            });
            
            console.log("Transaction sent:", tx.hash);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log("Receipt uploaded to blockchain:", receipt);
            
            return receipt;
        } catch (error) {
            console.error("Failed to upload receipt:", error);
            throw error;
        }
    }

    // Verify receipt on blockchain
    async verifyReceipt(tokenId) {
        if (!this.contract) {
            throw new Error("Contract not initialized. Connect wallet first.");
        }

        try {
            const tx = await this.contract.verifyReceipt(tokenId, {
                gasLimit: 100000
            });
            
            console.log("Verification transaction sent:", tx.hash);
            
            const receipt = await tx.wait();
            console.log("Receipt verified:", receipt);
            
            return receipt;
        } catch (error) {
            console.error("Failed to verify receipt:", error);
            throw error;
        }
    }

    // Generate hash for receipt (simple implementation)
    generateReceiptHash(title, timestamp) {
        const data = title + timestamp;
        try {
            const ethersLib = this.getEthers();
            return ethersLib.utils.keccak256(ethersLib.utils.toUtf8Bytes(data));
        } catch (err) {
            console.error('generateReceiptHash error:', err);
            throw err;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.contract = null;
                    this.signer = null;
                    location.reload();
                } else {
                    location.reload();
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                location.reload();
            });
        }
    }

    // Backwards-compatible alias: uploadReceipt -> uploadReceiptToBlockchain
    async uploadReceipt(title, receiptHash, ipfsHash) {
        return this.uploadReceiptToBlockchain(title, receiptHash, ipfsHash);
    }

    // Helper to fetch user receipts (wrapper; returns array or empty)
    async getUserReceipts(userAddress) {
        try {
            if (!this.contract) return [];
            // If userAddress not provided and signer available, use signer address
            const addr = userAddress || (this.signer ? await this.signer.getAddress() : null);
            if (!addr) return [];
            const ids = await this.contract.getUserReceipts(addr);
            return ids || [];
        } catch (err) {
            console.error('getUserReceipts error:', err);
            return [];
        }
    }

    // Fetch a single receipt struct from the contract and normalize to JS object
    async getReceipt(tokenId) {
        if (!this.contract) {
            throw new Error('Contract not initialized. Connect wallet first.');
        }

        try {
            const r = await this.contract.getReceipt(tokenId);
            // r may be an array-like object or have named properties
            const token = r.tokenId !== undefined ? r.tokenId : r[0];
            const title = r.title !== undefined ? r.title : r[1];
            const receiptHash = r.receiptHash !== undefined ? r.receiptHash : r[2];
            const timestamp = r.timestamp !== undefined ? Number(r.timestamp.toString()) : Number(r[3] || 0);
            const uploader = r.uploader !== undefined ? r.uploader : r[4];
            const ipfsHash = r.ipfsHash !== undefined ? r.ipfsHash : r[5];
            const isVerified = r.isVerified !== undefined ? r.isVerified : r[6];

            return {
                tokenId: token.toString ? token.toString() : token,
                title,
                receiptHash,
                timestamp,
                uploader,
                ipfsHash,
                isVerified: !!isVerified,
            };
        } catch (err) {
            console.error('getReceipt error:', err);
            throw err;
        }
    }

    // Return current network info (chainId and name) if available
    async getNetwork() {
        try {
            if (this.provider) {
                const net = await this.provider.getNetwork();
                return { chainId: '0x' + net.chainId.toString(16), name: net.name };
            }
            if (window.ethereum) {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                return { chainId, name: chainId === this.network.chainId ? this.network.chainName : 'unknown' };
            }
            return { chainId: null, name: null };
        } catch (err) {
            console.error('getNetwork error:', err);
            return { chainId: null, name: null };
        }
    }
}

// Create global instance
const cryptoVault = new CryptoVaultContract();

// Export for use in HTML
window.cryptoVault = cryptoVault;

// Setup event listeners when page loads
document.addEventListener('DOMContentLoaded', () => {
    cryptoVault.setupEventListeners();
});