import { ethers } from "hardhat";

async function main() {
  // We get the contract to deploy
  const BasicNFT = await ethers.getContractFactory("BasicNFT");
  const basicNFT = await BasicNFT.deploy();

  await basicNFT.deployed();

  console.log("BasicNFT deployed to:", basicNFT.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
