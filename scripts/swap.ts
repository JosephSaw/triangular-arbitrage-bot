
// @ts-nocheck
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { Contract } from "ethers";

import contracts from "./deployments/avax.json";
import TOKENS from "./config/avax/tokens.json";
import {
  calcToken0Price,
  calcToken1Price,
  calcPriceImpact,
} from "./utils/pricing";
import { consoleHeader } from "./utils/organizer";
const configContracts = loadConfig();

/**
 * Only edit config below this line
 */

const TRADED_PATH = [
  configContracts.tokens.wAvax,
  "0x0aa4ef05b43700bf4b6e6dc83ea4e9c2cf6af0fa",
];

// const TRADED_PATH = [
//   configContracts.tokens.wAvax,
//   "0x4fbf0429599460d327bd5f55625e30e4fc066095",
// ];
const TRADE_AMOUNT_IN = "10";

/**
 * No more edits past this line!
 */

function loadConfig() {
  for (const tokenName in contracts.tokens) {
    // @ts-ignore
    contracts.tokens[tokenName] = contracts.tokens[tokenName].toLowerCase();
  }
  return contracts;
}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const JoeRouter = await ethers.getContractFactory("JoeRouter02");
  const joeRouter = JoeRouter.attach(configContracts.traderJoe.router);
  const MockErc20 = await ethers.getContractFactory("MockERC20");
  const [trader] = await ethers.getSigners();
  // RESERVES INFO AFTER SWAP
  const JoePairFactory = await ethers.getContractFactory(
    "contracts/JoePair.sol:JoePair"
  );
  const JoeFactory = await ethers.getContractFactory("JoeFactory");
  const joeFactory = JoeFactory.attach(configContracts.traderJoe.factory);

  const balanceBeforeTrade = await trader.getBalance();

  const path = [...TRADED_PATH];
  consoleHeader("Token Path Details");

  for (let i = 0; i < path.length; i++) {
    console.log(`Path ${i}:`, TOKENS[path[i]]);
  }

  const tradedLpAddress = await joeFactory.getPair(path[0], path[1]);
  const tradedPairContract = JoePairFactory.attach(tradedLpAddress);
  const tradedPairReservesBefore = await tradedPairContract.getReserves();
  const token0 =
    TOKENS[await tradedPairContract.token0().then((res) => res.toLowerCase())];
  const token1 =
    TOKENS[await tradedPairContract.token1().then((res) => res.toLowerCase())];

  const firstToken = MockErc20.attach(path[0]);
  const boughtToken: Contract = MockErc20.attach(path[path.length - 1]);
  consoleHeader("Pair Token Details");
  console.log("token0", token0);
  console.log("token1", token1);

  consoleHeader("Before Trade Data");
  const boughtTokenBeforeBalance = await boughtToken.balanceOf(trader.address);
  console.log("eth:", ethers.utils.formatEther(balanceBeforeTrade.toString()));

  console.log(
    "boughtTokenBalance:",
    ethers.utils.formatUnits(
      boughtTokenBeforeBalance.toString(),
      TOKENS[boughtToken.address].decimals
    )
  );

  let formattedReserve0 = ethers.utils.formatUnits(
    tradedPairReservesBefore._reserve0,
    token0.decimals
  );
  let formattedReserve1 = ethers.utils.formatUnits(
    tradedPairReservesBefore._reserve1,
    token1.decimals
  );
  console.log("reserve0:", formattedReserve0);
  console.log("reserve1:", formattedReserve1);

  const token0PriceBefore = calcToken0Price(
    formattedReserve0,
    formattedReserve1
  );

  const token1PriceBefore = calcToken1Price(
    formattedReserve0,
    formattedReserve1
  ).toString();

  console.log("Token0Price:", token0PriceBefore.toString());
  console.log("Token1Price:", token1PriceBefore.toString());

  const amountIn = ethers.utils.parseUnits(
    TRADE_AMOUNT_IN,
    TOKENS[firstToken.address].decimals
  );
  /**
   * @minOutAmount
   * 0 - Input amount
   * 1 - Received amount
   */
  const minOutAmount = await joeRouter
    .connect(trader)
    .getAmountsOut(amountIn, path);

  const tx = await joeRouter.connect(trader).swapExactAVAXForTokens(
    // amountIn,
    minOutAmount[1],
    path,
    trader.address,
    1860812253,
    {
      value: amountIn,
    }
  );

  await tx.wait();

  const balanceAfterTrade = await trader.getBalance();
  consoleHeader("After Trade Data");

  console.log("eth:", ethers.utils.formatEther(balanceAfterTrade.toString()));

  const boughtTokenAfterBalance = await boughtToken.balanceOf(trader.address);

  console.log(
    "boughtTokenBalance:",
    ethers.utils.formatUnits(
      boughtTokenAfterBalance.toString(),
      TOKENS[boughtToken.address].decimals
    )
  );
  const tradedPairReservesAfter = await tradedPairContract.getReserves();

  formattedReserve0 = ethers.utils.formatUnits(
    tradedPairReservesAfter._reserve0,
    token0.decimals
  );
  formattedReserve1 = ethers.utils.formatUnits(
    tradedPairReservesAfter._reserve1,
    token1.decimals
  );
  console.log("reserve0:", formattedReserve0);
  console.log("reserve1:", formattedReserve1);
  const token0PriceAfter = calcToken0Price(
    formattedReserve0,
    formattedReserve1
  );

  const token1PriceAfter = calcToken1Price(
    formattedReserve0,
    formattedReserve1
  );

  console.log("Token0Price:", token0PriceAfter.toString());
  console.log("Token1Price:", token1PriceAfter.toString());

  /** Analysis Using Data Before The Trade */
  consoleHeader("Foresight Trade Analysis");
  console.log(
    "Estimated Received Amount:",
    ethers.utils.formatUnits(
      minOutAmount[1],
      TOKENS[boughtToken.address].decimals
    )
  );

  // defaults to reserve0 being the input token
  let estimatedTradedPairReservesAfter = {
    _reserve0: tradedPairReservesBefore._reserve0.add(minOutAmount[0]),
    _reserve1: tradedPairReservesBefore._reserve1.sub(minOutAmount[1]),
  };

  // IF reserve1 is the input token
  if (TOKENS[path[0]].address === token1.address) {
    estimatedTradedPairReservesAfter = {
      _reserve0: tradedPairReservesBefore._reserve0.sub(minOutAmount[1]),
      _reserve1: tradedPairReservesBefore._reserve1.add(minOutAmount[0]),
    };
  }

  formattedReserve0 = ethers.utils.formatUnits(
    estimatedTradedPairReservesAfter._reserve0,
    token0.decimals
  );
  formattedReserve1 = ethers.utils.formatUnits(
    estimatedTradedPairReservesAfter._reserve1,
    token1.decimals
  );
  console.log("Estimated reserve0:", formattedReserve0);
  console.log("Estimated reserve1:", formattedReserve1);

  const estimatedToken0PriceAfter = calcToken0Price(
    formattedReserve0,
    formattedReserve1
  );

  const estimatedToken1PriceAfter = calcToken1Price(
    formattedReserve0,
    formattedReserve1
  );

  console.log("Estimated Token0Price:", estimatedToken0PriceAfter.toString());
  console.log("Estimated Token1Price:", estimatedToken1PriceAfter.toString());

  if (boughtToken.address === token0.address) {
    console.log(
      "Estimated Price Impact % Token0",
      calcPriceImpact(token0PriceBefore, estimatedToken0PriceAfter)
    );
  }

  if (boughtToken.address === token1.address) {
    console.log(
      "Estimated Price Impact % Token1",
      calcPriceImpact(token1PriceBefore, estimatedToken1PriceAfter)
    );
  }

  /** Analysis After The Trade */
  consoleHeader("Hindsight Trade Analysis");
  if (boughtToken.address === token0.address) {
    console.log(
      "Price Impact % Token0",
      calcPriceImpact(token0PriceBefore, token0PriceAfter)
    );
  }

  if (boughtToken.address === token1.address) {
    console.log(
      "Price Impact % Token1",
      calcPriceImpact(token1PriceBefore, token1PriceAfter)
    );
  }

  console.log(
    `${TOKENS[boughtToken.address].symbol} (Bought Token) received:`,
    ethers.utils.formatUnits(
      boughtTokenAfterBalance.sub(boughtTokenBeforeBalance).toString(),
      TOKENS[boughtToken.address].decimals
    )
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
