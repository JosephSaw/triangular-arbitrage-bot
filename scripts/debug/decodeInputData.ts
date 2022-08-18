
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

import ArbitrageABI from "../../artifacts/contracts/Arbitrage.sol/Arbitrage.json";

async function main() {
  const iface = new ethers.utils.Interface(ArbitrageABI.abi);
  const data = iface.decodeFunctionData(
    "executeTrade",
    "0x42290bd000000000000000000000000060ae616a2155ee3d9a68541ba4544862310933d400000000000000000000000000000000000000000000000003782dace9d9000000000000000000000000000000000000000000000000000003b4db6d7a705cf200000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004000000000000000000000000b31f66aa3c1e785363f0875a1b74e27b85fd66c7000000000000000000000000f9a075c9647e91410bf6c402bdf166e1540f67f0000000000000000000000000c7198437980c041c805a1edcba50c1ce5db95118000000000000000000000000b31f66aa3c1e785363f0875a1b74e27b85fd66c7"
  );

  console.log("data", data);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
