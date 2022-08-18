
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, network } from "hardhat";

import contracts from "../deployments/avax.json";

const ADDRESS_TO_IMPERSONATE = "0xa465900f5eb9aacdbac1b956fd7045d02b4370d4";
const TOKEN_TO_TRANSFER = contracts.tokens["USDC.e"];
const AMOUNT_TO_TRANSFER = ethers.utils.parseUnits("10000000", "6");
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const MockErc20 = await ethers.getContractFactory("MockERC20");
  const token = MockErc20.attach(TOKEN_TO_TRANSFER);
  const [trader] = await ethers.getSigners();

  const balanceBeforeTransfer = await token.balanceOf(trader.address);

  console.log("balanceBeforeTransfer:", balanceBeforeTransfer.toString());

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [ADDRESS_TO_IMPERSONATE],
  });

  const signer = await ethers.provider.getSigner(ADDRESS_TO_IMPERSONATE);
  const tx = await token
    .connect(signer)
    .transfer(trader.address, AMOUNT_TO_TRANSFER);

  await tx.wait();
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [ADDRESS_TO_IMPERSONATE],
  });

  const balanceAfterTransfer = await token.balanceOf(trader.address);

  console.log("balanceAfterTransfer:", balanceAfterTransfer.toString());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
