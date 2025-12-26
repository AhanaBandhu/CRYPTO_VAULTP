# CryptoVault 🛡️  
**A Decentralized Receipt Vault for Fraud-Proof Verification**

## 📌 Overview
CryptoVault is a **decentralized receipt management web application** that allows users to securely store, manage, and verify digital receipts using **blockchain and IPFS**. The project addresses real-world problems such as **receipt loss, photoshopping, duplicate claims, and insurance fraud** by ensuring immutability and authenticity of receipts.

Instead of relying on fragile paper receipts or centralized storage, CryptoVault provides a **tamper-proof, verifiable, and permanent solution** powered by Web3 technologies.

---

## ❗ Problem Statement
- Paper receipts are easy to **lose, damage, or fade**
- Digital receipts stored in galleries or drives can be **edited or photoshopped**
- Fake or inflated receipts are often used for **insurance, warranty, and reimbursement fraud**
- Merchants lack a **trusted and universal verification mechanism**

---

## ✅ Solution
CryptoVault solves these issues by:
- Storing receipts on **IPFS** (decentralized storage)
- Recording receipt proofs on the **blockchain**
- Using **wallet-based authentication (MetaMask)** instead of traditional logins
- Enabling **merchant-side verification** through blockchain records

Once uploaded, a receipt **cannot be altered or duplicated**, ensuring trust for both users and merchants.

---

## 🔄 Workflow
1. User connects their **MetaMask wallet** (wallet address acts as identity).
2. Receipt (image/PDF) is uploaded via the web interface.
3. File is stored on **IPFS**, generating a unique **CID (hash)**.
4. Receipt metadata (IPFS hash, timestamp, wallet address) is stored on an **Avalanche smart contract**.
5. A blockchain transaction link (SnowTrace) is generated for verification.
6. Merchants verify receipts using the **hash or transaction link**, ensuring authenticity.

---

## ✨ Key Features
- 🔐 Wallet-based authentication (no email/password required)
- 📂 Secure receipt storage with date & time metadata
- 🌐 Decentralized storage using IPFS
- ⛓️ Blockchain-backed immutability and transparency
- 🧾 Dual interfaces for **Users** and **Merchants**
- 🔍 Merchant verification via receipt hash / SnowTrace link
- 🚫 Prevents photoshopped, duplicate, and fake receipts
- 📸 Camera access to capture receipts directly from the browser

---

## 🛠️ Tech Stack
**Frontend**
- HTML
- CSS
- JavaScript
- Browser Camera APIs

**Blockchain & Web3**
- Solidity (Smart Contracts)
- Avalanche Blockchain
- MetaMask
- Ethers.js / Web3.js
- SnowTrace (Blockchain Explorer)

**Storage**
- IPFS (Decentralized File Storage)

---

## 🚀 Future Scope
- 🤖 AI/ML-based receipt analysis & expense tracking
- 🔔 Warranty expiry reminders via push notifications
- 💬 Educational blockchain chatbot for users
- 📊 Financial insights and spending categorization

---

## 👤 My Contribution
- Designed and implemented the **entire frontend UI**
- Integrated **camera access** for capturing receipts
- Built receipt gallery views with metadata
- Styled and structured the application for usability and clarity

---

## 🏁 Conclusion
CryptoVault demonstrates how **blockchain and decentralization** can be applied to solve everyday problems like receipt fraud and verification. By combining IPFS, smart contracts, and wallet-based authentication, the project delivers a **secure, transparent, and trustless receipt management system**.

---

📌 *Built as part of the Avalanche Hackathon 2025.*

