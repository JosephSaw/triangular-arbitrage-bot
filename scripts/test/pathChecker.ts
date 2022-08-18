
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

import contracts from "../deployments/avax.json";
import { findBestPathAndDepth } from "../utils/trading";

async function main() {
  const JoeRouter = await ethers.getContractFactory("JoeRouter02");
  const joeRouter = JoeRouter.attach(contracts.traderJoe.router);

  const paths = [
    [
      "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
      "0xe433ac3508c45926c1bc84da5fd87df886fa2bf3",
    //   "0x130966628846bfd36ff31a822705796e8cb8c18d",
    //   "0x5541d83efad1f281571b343977648b75d95cdac2",
    //   "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
    ],
  ];
  findBestPathAndDepth(joeRouter, paths);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
