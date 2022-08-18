
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
// @ts-nocheck
import { ethers, network, HardhatRuntimeEnvironment, Provider } from "hardhat";
import contracts from "./deployments/avax.json";
import BigNumberJs from "bignumber.js";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber, Contract, ContractFactory } from "ethers";
import {
  calcToken1Quote,
  calcToken0Price,
  calcToken1Price,
  calcPriceImpact,
} from "./utils/pricing";
import { consoleHeader, consoleError } from "./utils/organizer";
import {
  buildPossiblePaths,
  printPossiblePaths,
  findBestPathAndDepth,
  findBestPathAndDepthMulticall,
} from "./utils/trading";
import filterTransactions, {
  WHITELISTED_FUNCTION_NAMES,
} from "./utils/filterTransactions";
import TOKENS from "./config/avax/tokens.json";
import BLACKLISTED_TOKENS from "./config/avax/blacklistedTokens.json";

const MINIMUM_PRICE_IMPACT_PERCENTAGE = "0.1";

interface FeeData {
  gasPrice: ethers.BigNumber;
  maxFeePerGas: ethers.BigNumber;
  maxPriorityFeePerGas: ethers.BigNumber;
}

function fetchFeeData(provider: SignerWithAddress): Promise<FeeData> {
  return provider.getFeeData();
}

function resolveObj(path, obj) {
  return path.split(".").reduce(function (prev, curr) {
    return prev ? prev[curr] : null;
  }, obj);
}

async function fetchTotalEthBalance(
  address: string,
  MockErc20Factory: ContractFactory
): string {
  const eth = await ethers.provider.getBalance(address);
  const wAvax = MockErc20Factory.attach(contracts.tokens.wAvax);
  const wavaxBalance = await wAvax.balanceOf(contracts.arbitrage);
  if (process.env.DEBUG) {
    console.log("eth:", ethers.utils.formatEther(eth));
    console.log("wAvax:", ethers.utils.formatEther(wavaxBalance));
  }

  return ethers.utils.formatEther(eth.add(wavaxBalance));
}

async function doArb(
  router: Contract,
  arbber: SignerWithAddress,
  path: string[],
  depth: BigNumber,
  amountOutMin: BigNumberJs,
  MockErc20Factory: ContractFactory,
  feeData: FeeData,
  arbitrageContract: Contract
) {
  const ethBalanceBeforeTrade = await fetchTotalEthBalance(
    arbber.address,
    MockErc20Factory
  );
  console.log("ethBalanceBeforeTrade", ethBalanceBeforeTrade);
  const tx = await arbitrageContract
    .connect(arbber)
    .executeTrade(
      router.address,
      depth,
      ethers.utils.parseEther(amountOutMin.toString()),
      path,
      {
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        gasLimit: 900000,
      }
    );

  await tx.wait();

  const ethBalanceAfterTrade = await fetchTotalEthBalance(
    arbber.address,
    MockErc20Factory
  );
  console.log("ethBalanceAfterTrade", ethBalanceAfterTrade);
}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  const networkName = network.name;

  const JoeFactory = await ethers.getContractFactory("JoeFactory");
  const joeFactory = JoeFactory.attach(contracts.traderJoe.factory);
  const JoeRouter = await ethers.getContractFactory("JoeRouter02");
  const joeRouter = JoeRouter.attach(contracts.traderJoe.router);
  const JoePairFactory = await ethers.getContractFactory(
    "contracts/JoePair.sol:JoePair"
  );
  const MockErc20 = await ethers.getContractFactory("MockERC20");
  const Arbitrage = await ethers.getContractFactory("Arbitrage");
  const arbitrage = Arbitrage.attach(contracts.arbitrage);

  console.log("network:", networkName);
  const [_, arbber] = await ethers.getSigners();

  const provider = ethers.provider;

  // new ethers.providers.WebSocketProvider(
  //   "wss://speedy-nodes-nyc.moralis.io/eb00a586407c7f18cf2e958d/avalanche/mainnet/ws"
  // );
  const latestBlockNumber = await provider.getBlockNumber();
  console.log("latestBlockNumber:", latestBlockNumber);

  //   provider.on("pending", async (pendingTx) => {
  //     console.log("pendingTx", pendingTx);
  //   });

  let running = false;

  provider.on("block", async (blockNumber) => {
    // if (running) return;
    // running = true;
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
      const txFunctionName = tx.functionFragment.name;
      const tokens = tx.args.path.map(
        (tokenAddress) => TOKENS[tokenAddress.toLowerCase()]
      );
      console.log("tokens", tokens);

      if (!tokens[0] || !tokens[1]) {
        consoleError("Undefined Token found");
        console.log("tx.args.path", tx.args.path);
        return;
      }

      if (BLACKLISTED_TOKENS[tokens[0]] || BLACKLISTED_TOKENS[tokens[1]]) {
        consoleError("Blacklisted Token found");
        console.log("tx.args.path", tx.args.path);
        return;
      }

      const tradedLpAddress = await joeFactory.getPair(
        tx.args.path[0],
        tx.args.path[1]
      );
      const tradedPairContract = JoePairFactory.attach(tradedLpAddress);
      // console.log("tx", tx);
      // console.log("tx.blockNumber", tx.blockNumber);
      const tradedPairReserves = await tradedPairContract.getReserves({
        blockTag: blockNumber - 1,
      });
      const token0 =
        TOKENS[
          await tradedPairContract.token0().then((res) => res.toLowerCase())
        ];
      const token1 =
        TOKENS[
          await tradedPairContract.token1().then((res) => res.toLowerCase())
        ];

      consoleHeader("Current State Data");

      // console.log("parsedTransaction", tx);
      //   console.log("tradedPairReserves", tradedPairReserves);

      let formattedReserve0 = ethers.utils.formatUnits(
        tradedPairReserves._reserve0,
        token0.decimals
      );
      let formattedReserve1 = ethers.utils.formatUnits(
        tradedPairReserves._reserve1,
        token1.decimals
      );
      const token0Price = calcToken0Price(formattedReserve0, formattedReserve1);
      const token1Price = calcToken1Price(formattedReserve0, formattedReserve1);

      console.log("_reserve0:", formattedReserve0);
      console.log("_reserve1:", formattedReserve1);
      console.log("Token0Price:", token0Price.toString());
      console.log("Token1Price:", token1Price.toString());

      const amountIn = resolveObj(
        WHITELISTED_FUNCTION_NAMES[txFunctionName].amountIn,
        tx
      );
      const amountOut = resolveObj(
        WHITELISTED_FUNCTION_NAMES[txFunctionName].amountOut,
        tx
      );

      console.log(
        "amountIn:",
        ethers.utils.formatUnits(amountIn, tokens[0].decimals)
      );

      console.log(
        "amountOut:",
        ethers.utils.formatUnits(amountOut, tokens[tokens.length - 1].decimals)
      );

      console.log("tradedLpAddress", tradedLpAddress);
      /** Analysis Using Data Before The Trade */
      consoleHeader("Foresight Trade Analysis");

      // defaults to reserve0 being the input token
      let estimatedTradedPairReservesAfter = {
        _reserve0: tradedPairReserves._reserve0.add(amountIn),
        _reserve1: tradedPairReserves._reserve1.sub(amountOut),
      };

      // IF reserve1 is the input token
      if (tokens[0].address === token1.address) {
        estimatedTradedPairReservesAfter = {
          _reserve0: tradedPairReserves._reserve0.sub(amountOut),
          _reserve1: tradedPairReserves._reserve1.add(amountIn),
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

      console.log(
        "Estimated Token0Price:",
        estimatedToken0PriceAfter.toString()
      );
      console.log(
        "Estimated Token1Price:",
        estimatedToken1PriceAfter.toString()
      );

      const boughtToken = tokens[tokens.length - 1];

      let priceImpact;
      let impactedToken;
      let tokenUsedForImpact;
      if (boughtToken.address === token0.address) {
        priceImpact = new BigNumberJs(
          calcPriceImpact(token0Price, estimatedToken0PriceAfter)
        );
        impactedToken = token0;
        tokenUsedForImpact = token1;
        console.log("Minumum Price Impact % Token0", priceImpact.toString());
      }

      if (boughtToken.address === token1.address) {
        priceImpact = new BigNumberJs(
          calcPriceImpact(token1Price, estimatedToken1PriceAfter)
        );
        impactedToken = token1;
        tokenUsedForImpact = token0;
        console.log("Minumum Price Impact % Token1", priceImpact.toString());
      }

      if (!priceImpact) {
        consoleError("Price Impact could not be determined");
        return;
      }
      // if (!priceImpact.gte(MINIMUM_PRICE_IMPACT_PERCENTAGE)) {
      //   consoleError("Minimum price impact not reached");
      //   return;
      // }
      const BASE_TOKEN = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"; // AVAX

      let possiblePaths = buildPossiblePaths(
        impactedToken,
        tokenUsedForImpact,
        BASE_TOKEN
      );
      console.log("possiblePaths", possiblePaths);
      if (process.env.DEBUG) {
        printPossiblePaths(possiblePaths);
      }

      if (possiblePaths.length === 0) {
        consoleError("No possible path found.");
        console.log({ impactedToken, tokenUsedForImpact });
        return;
      }

      let { path, allowedDepth, minOut, pathCounter, profit } =
        await findBestPathAndDepth(joeRouter, possiblePaths);

      if (path === 0) {
        consoleError("No Profitable Forward Path & Depth found");
        return;
      }

      // possiblePaths = buildPossiblePaths(tokenUsedForImpact, impactedToken);
      // ({ path, allowedDepth, minOut, pathCounter, profit } =
      //   await findBestPathAndDepthMulticall(joeRouter, possiblePaths));

      // if (path === 0) {
      //   consoleError("No Profitable Reverse Path & Depth found");
      //   return;
      // }

      const feeData = await fetchFeeData(provider);
      console.log("feeData", feeData);
      consoleHeader("Arb Data");
      console.log("Path:", pathCounter);
      console.log("allowedDepth:", ethers.utils.formatEther(allowedDepth));
      console.log("Expected Profit:", profit.toString());
      console.log("Min Out:", minOut.toString());
      // console.log("Estimated Gas Limit:", estimatedGasLimit);
      console.log(
        "Estimated Base Fee (Gwei):",
        ethers.utils.formatUnits(feeData.maxFeePerGas, "9")
      );
      console.log(
        "Estimated Priority Fee (Gwei):",
        ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "9")
      );

      doArb(
        joeRouter,
        arbber,
        path,
        allowedDepth,
        minOut,
        MockErc20,
        feeData,
        arbitrage
      );
    }
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
