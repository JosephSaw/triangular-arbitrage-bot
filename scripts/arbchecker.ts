// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import * as fs from "fs";
import BigNumberJs from "bignumber.js";
import TOKENS from "./config/avax/tokens.json";
import POOLS from "./config/avax/pools.json";
import JoePairAbi from "../artifacts/contracts/JoePair.sol/JoePair.json";

import contracts from "./deployments/avax.json";
import loadToken from "./utils/loadToken";
import multicall from "./utils/multicall";
import {
  buildPossiblePaths,
  printPossiblePaths,
  findBestPathAndDepth,
} from "./utils/trading";

const IMPACTED_TOKEN = TOKENS["0x4fbf0429599460d327bd5f55625e30e4fc066095"];
const USEDFORIMPACT_TOKEN =
  TOKENS["0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"];

async function main() {
  const JoeRouter = await ethers.getContractFactory("JoeRouter02");
  const joeRouter = JoeRouter.attach(contracts.traderJoe.router);

  const paths = buildPossiblePaths(IMPACTED_TOKEN, USEDFORIMPACT_TOKEN);
  console.log("paths", paths);
  printPossiblePaths(paths);
  findBestPathAndDepth(joeRouter, paths);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
