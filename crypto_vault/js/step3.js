// step3.js — Small helper for Step 3: store metadata on-chain
// Provides two exported helpers on window.step3:
// - connectContract(): returns an ethers Contract instance (connected to signer)
// - uploadReceipt(title, receiptHash, ipfsHash): calls contract.uploadReceipt(...)

(function () {
    const contractAddress = "0x738ef9fe7ca3D75F95106DC6b380dDF6B0568A96";

    // Minimal ABI including uploadReceipt and hashExists (to check duplicates)
    const contractABI = [
        {
            "inputs": [
                { "internalType": "string", "name": "_title", "type": "string" },
                { "internalType": "string", "name": "_receiptHash", "type": "string" },
                { "internalType": "string", "name": "_ipfsHash", "type": "string" }
            ],
            "name": "uploadReceipt",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [ { "internalType": "string", "name": "", "type": "string" } ],
            "name": "hashExists",
            "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    async function connectContract() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask (window.ethereum) not found');
        }
        if (!window.ethers && typeof ethers === 'undefined') {
            throw new Error('ethers.js is not available on the page. Ensure ethers is loaded before this script');
        }
        const ethersLib = window.ethers || ethers;
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethersLib.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethersLib.Contract(contractAddress, contractABI, signer);
        return { contract, provider, signer, ethersLib };
    }

    async function uploadReceipt(title, receiptHash, ipfsHash) {
        const statusEl = document.getElementById('wallet-status');
        try {
            if (statusEl) statusEl.textContent = 'Preparing transaction...';
            const { contract, provider, ethersLib } = await connectContract();

            // Basic pre-checks to avoid obvious reverts
            if (!title || String(title).trim().length === 0) {
                const msg = 'Title cannot be empty. Please provide a meaningful title.';
                if (statusEl) statusEl.textContent = msg;
                alert(msg);
                throw new Error(msg);
            }
            if (!ipfsHash || String(ipfsHash).trim().length === 0) {
                const msg = 'IPFS hash is empty. Ensure Step 2 returned a valid IPFS hash before deploying.';
                if (statusEl) statusEl.textContent = msg;
                alert(msg);
                throw new Error(msg);
            }

            // Check for duplicated receipt hash on-chain
            try {
                if (contract.hashExists && typeof contract.hashExists === 'function') {
                    const exists = await contract.hashExists(receiptHash);
                    if (exists) {
                        const msg = 'A receipt with this receiptHash already exists on-chain. Duplicate receipts are not allowed.';
                        if (statusEl) statusEl.textContent = msg;
                        alert(msg);
                        throw new Error(msg);
                    }
                }
            } catch (checkErr) {
                console.warn('Could not check hashExists on-chain:', checkErr);
                // proceed — simulation will catch a duplicate if necessary
            }

            // First, estimate gas and then simulate the call using callStatic to get an early revert reason if any
            let estimatedGas = null;
            let gasLimitToUse = null;
            const encoded = contract.interface.encodeFunctionData('uploadReceipt', [title, receiptHash, ipfsHash]);
            // determine from address for simulation/estimate
            let fromAddr = null;
            try {
                fromAddr = (await provider.listAccounts())[0] || (await provider.getSigner().getAddress());
            } catch (e) {
                try { fromAddr = await provider.getSigner().getAddress(); } catch (e2) { fromAddr = null; }
            }

            try {
                if (statusEl) statusEl.textContent = 'Estimating gas...';
                try {
                    if (contract.estimateGas && typeof contract.estimateGas.uploadReceipt === 'function') {
                        estimatedGas = await contract.estimateGas.uploadReceipt(title, receiptHash, ipfsHash, { from: fromAddr });
                    }
                } catch (eg) {
                    // If contract.estimateGas fails, try provider.estimateGas with raw data
                    try {
                        const callForEstimate = { to: contract.address, data: encoded };
                        if (fromAddr) callForEstimate.from = fromAddr;
                        estimatedGas = await provider.estimateGas(callForEstimate);
                    } catch (eg2) {
                        console.warn('Gas estimation failed:', eg2);
                        estimatedGas = null;
                    }
                }

                if (estimatedGas) {
                    // Add a small buffer (20%) to the estimate
                    try { gasLimitToUse = estimatedGas.mul(ethersLib.BigNumber.from(12)).div(ethersLib.BigNumber.from(10)); } catch (e) { gasLimitToUse = estimatedGas; }
                } else {
                    // default to a larger gasLimit if estimate not available
                    gasLimitToUse = ethersLib.BigNumber.from('1000000');
                }

                // Now run simulation
                if (contract.callStatic && typeof contract.callStatic.uploadReceipt === 'function') {
                    if (statusEl) statusEl.textContent = 'Simulating transaction (callStatic)...';
                    await contract.callStatic.uploadReceipt(title, receiptHash, ipfsHash, { gasLimit: gasLimitToUse });
                } else {
                    // Fallback: use provider.call with encoded data and include gas
                    if (statusEl) statusEl.textContent = 'Simulating transaction (provider.call)...';
                    const callParams = { to: contract.address, data: encoded };
                    if (fromAddr) callParams.from = fromAddr;
                    // include gas field as hex for some RPCs
                    try { callParams.gas = gasLimitToUse.toHexString(); } catch (e) { /* ignore */ }
                    await provider.call(callParams);
                }
            } catch (simErr) {
                console.error('Simulation failed (transaction would revert or RPC error):', simErr);

                // If we got an Internal JSON-RPC error, try alternative RPC endpoints and decode revert reason
                const msgLower = String(simErr?.message || '').toLowerCase();
                if (msgLower.includes('internal json-rpc') || msgLower.includes('internal error') || msgLower.includes('invalid opcode') || msgLower.includes('out of gas')) {
                    // Try a set of public Fuji RPC endpoints to get a clearer error
                    const fallbackRpcs = [
                        'https://api.avax-test.network/ext/bc/C/rpc'
                    ];

                    // already have `encoded` above
                    // determine from address for RPC call
                    // determine from address for RPC call (we computed earlier as fromAddr)

                    function decodeRevert(ethersLib, data) {
                        try {
                            if (!data) return null;
                            // EVM revert with Error(string) selector 0x08c379a0
                            if (data.startsWith('0x08c379a0')) {
                                const payload = '0x' + data.slice(10); // drop selector (0x + 8 hex chars)
                                const decoded = ethersLib.utils.defaultAbiCoder.decode(['string'], payload);
                                return decoded && decoded[0] ? decoded[0] : null;
                            }
                            return null;
                        } catch (e) {
                            return null;
                        }
                    }

                    let lastRpcError = null;
                    function isZeroHex(h) {
                        if (!h) return true;
                        if (typeof h !== 'string') return false;
                        // strip 0x
                        const s = h.startsWith('0x') ? h.slice(2) : h;
                        // empty or all zeros
                        return s.length === 0 || /^[0]+$/.test(s);
                    }

                    for (const rpc of fallbackRpcs) {
                        try {
                            const callObj = { to: contract.address, data: encoded };
                            if (fromAddr) callObj.from = fromAddr;
                            if (gasLimitToUse) callObj.gas = gasLimitToUse.toHexString();
                            const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [callObj, 'latest'] });
                            const r = await fetch(rpc, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
                            const j = await r.json();
                            if (j.error) {
                                lastRpcError = j.error;
                                const data = j.error.data || j.error?.error?.data || j.error;
                                const reason = decodeRevert(ethersLib, typeof data === 'string' ? data : (data && data.data) ? data.data : null);
                                const message = reason || j.error.message || JSON.stringify(j.error);
                                alert('RPC ' + rpc + ' returned error:\n' + message);
                                if (statusEl) statusEl.textContent = 'Simulation RPC error: ' + message;
                                break;
                            }
                            if (j.result) {
                                // If result is returned, provider.call succeeded on this RPC — but result can be an all-zero value
                                const result = j.result;
                                if (isZeroHex(result)) {
                                    // zero result gives no revert info — treat as inconclusive
                                    const message = 'RPC ' + rpc + ' returned an empty/all-zero result. This means the simulation returned no revert reason. Suggestions: (1) try sending the transaction (MetaMask will show the revert if it happens); (2) try a different RPC node; (3) ensure contract inputs are valid. Raw result: ' + result + (gasLimitToUse ? ('\nEstimated gas used (with buffer): ' + gasLimitToUse.toString()) : '');
                                    alert(message);
                                    if (statusEl) statusEl.textContent = 'Simulation inconclusive on ' + rpc + ' — no revert reason returned';
                                } else {
                                    alert('RPC ' + rpc + ' returned a result. Simulation may succeed there. Raw result: ' + result);
                                    if (statusEl) statusEl.textContent = 'Simulation returned on ' + rpc;
                                }
                                break;
                            }
                        } catch (rpcErr) {
                            lastRpcError = rpcErr;
                            console.warn('RPC fallback error for', rpc, rpcErr);
                        }
                    }

                    if (lastRpcError) {
                        // Show aggregated message
                            const m = typeof lastRpcError === 'string' ? lastRpcError : (lastRpcError?.message || JSON.stringify(lastRpcError));
                            // If the RPC reported out-of-gas, give a helpful hint
                            const outGasHint = String(m).toLowerCase().includes('out of gas') ? '\nHint: increase gasLimit before sending the transaction (we attempted an estimate).' : '';
                            alert('Simulation failed — RPC fallback errors: ' + m + '\nCheck network, RPC endpoints, or contract inputs.' + outGasHint);
                            if (statusEl) statusEl.textContent = 'Simulation RPC fallback failed: ' + m;
                    }
                } else {
                    // Non-RPC internal error — show available reason
                        const reason = simErr?.error?.message || simErr?.reason || simErr?.message || JSON.stringify(simErr);
                        // If it's an out-of-gas error, include estimated gas if available
                        const extra = (String(reason).toLowerCase().includes('out of gas') && gasLimitToUse) ? ('\nEstimated gas (with buffer): ' + gasLimitToUse.toString()) : '';
                        alert('Simulation failed — transaction would revert. Revert info:\n' + (reason || String(simErr)) + extra);
                        if (statusEl) statusEl.textContent = 'Simulation failed: ' + (reason || 'reverted');
                }

                throw simErr;
            }

            if (statusEl) statusEl.textContent = 'Sending transaction to store metadata...';
            const sendGas = gasLimitToUse || (ethersLib && ethersLib.BigNumber ? ethersLib.BigNumber.from(300000) : 300000);
            const tx = await contract.uploadReceipt(title, receiptHash, ipfsHash, { gasLimit: sendGas });
            console.log('Transaction sent:', tx.hash);
            // Immediately show pending tx link so user can click Snowtrace even before mined
            if (statusEl) statusEl.textContent = `Transaction pending: ${tx.hash}`;
            const txEl = document.getElementById('transaction-hash');
            if (txEl) {
                const url = `https://testnet.snowtrace.io/tx/${tx.hash}`;
                txEl.innerHTML = `<a href="${url}" target="_blank" rel="noopener">${tx.hash}</a>`;
                // make sure hash container is visible
                const hashContainer = document.getElementById('hash-container');
                if (hashContainer) hashContainer.style.display = 'block';
            }

            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt);
            if (statusEl) statusEl.textContent = `Receipt stored on blockchain. Tx: ${tx.hash}`;

            return { tx, receipt };
        } catch (err) {
            console.error('uploadReceipt error:', err);
            if (statusEl) statusEl.textContent = 'Error storing receipt: ' + (err?.message || err);
            throw err;
        }
    }

    // Expose helpers
    window.step3 = { connectContract, uploadReceipt };

})();
