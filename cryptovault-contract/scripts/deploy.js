const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Deploying CryptoVault...");
  
  // Deploy CryptoVault contract
  const CryptoVault = await hre.ethers.getContractFactory("CryptoVault");
  const cryptoVault = await CryptoVault.deploy();
  
  // Wait for deployment transaction to be mined
  await cryptoVault.waitForDeployment();
  
  console.log("🎉 CryptoVault deployed to:", await cryptoVault.getAddress());
  console.log("📝 SAVE THIS ADDRESS:", await cryptoVault.getAddress());
  console.log("🔍 View on Snowtrace:", `https://testnet.snowtrace.io/address/${await cryptoVault.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });