
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
// @ts-nocheck
import { ethers, network } from "hardhat";
import contracts from "../deployments/avax.json";

import filterTransactions from "../utils/filterTransactions.ts";

async function simulateSwap(from: string, tx: any, joeRouter) {
  const ADDRESS_TO_IMPERSONATE = tx.from;
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [ADDRESS_TO_IMPERSONATE],
  });

  const SIGNER = await ethers.provider.getSigner(ADDRESS_TO_IMPERSONATE);

  const swapTx = await joeRouter
    .connect(SIGNER)
    [tx.functionFragment.name].apply(null, [...tx.args, { value: tx.value }]);

  await swapTx.wait();

  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [ADDRESS_TO_IMPERSONATE],
  });
}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  const networkName = network.name;

  const JoeRouter = await ethers.getContractFactory("JoeRouter02");
  const joeRouter = JoeRouter.attach(contracts.traderJoe.router);

  console.log("network:", networkName);

  const provider = ethers.provider;
  const latestBlockNumber = await provider.getBlockNumber();
  console.log("latestBlockNumber:", latestBlockNumber);

  //   provider.on("pending", async (pendingTx) => {
  //     console.log("pendingTx", pendingTx);
  //   });

  provider.on("block", async (blockNumber) => {
    console.log("new block mined", blockNumber);
    const blockWithTransactions = await provider.getBlockWithTransactions(
      blockNumber
    );

    const filteredTransactions = filterTransactions(
      blockWithTransactions.transactions
    );
    // console.log("filteredTransactions", filteredTransactions);
    console.log("num of txs", filteredTransactions.length);

    for (const tx of filteredTransactions) {
      console.log("tx", tx.name);
      simulateSwap(tx.from, tx, joeRouter);
    }
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
