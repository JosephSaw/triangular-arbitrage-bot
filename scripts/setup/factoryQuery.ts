
import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import * as fs from "fs";

import UniswapV2FactoryABI from "../../abi/UniswapV2/Factory.json";
import UniswapV2PairABI from "../../abi/UniswapV2/Pair.json";
import loadToken from "./utils/loadToken";
import { consoleHeader } from "../utils/organizer";

import { TOKENS, Address } from "./types";

const FACTORY_CONTRACT = "0xc66F594268041dB60507F00703b152492fb176E7"; // Trisolaris
const DEX_NAME = "Trisolaris";

async function main() {
  const networkName = network.name;

  const uniswapV2Factory = new ethers.Contract(
    FACTORY_CONTRACT,
    UniswapV2FactoryABI,
    ethers.provider
  );

  const pairsLength = await uniswapV2Factory
    .allPairsLength()
    .then((res: BigNumber) => res.toNumber());
  console.log("pairsLength", pairsLength);
  let TOKENS: TOKENS = {};
  const poolAddresses: {
    [pairAddress: Address]: { token0: Address; token1: Address };
  } = {};

  consoleHeader("Fetching Tokens");
  for (let i = 0; i < pairsLength; i++) {
    console.log("Fetching pair:", i);
    const pairAddress = await uniswapV2Factory.allPairs(i);
    const pairContract = new ethers.Contract(
      pairAddress,
      UniswapV2PairABI,
      ethers.provider
    );

    const token0Address = await pairContract.token0();
    const token1Address = await pairContract.token1();

    poolAddresses[pairAddress] = {
      token0: token0Address,
      token1: token1Address,
    };

    const newtokensRes = await loadToken([token1Address, token0Address]);
    TOKENS = { ...TOKENS, ...newtokensRes };
    fs.writeFileSync(
      `./scripts/config/${networkName}/${DEX_NAME}/tokens.json`,
      JSON.stringify(TOKENS)
    );
    fs.writeFileSync(
      `./scripts/config/${networkName}/${DEX_NAME}/poolAddresses.json`,
      JSON.stringify(poolAddresses)
    );
  }

  const pools: { [tokenAddress: Address]: Set<Address> } = {};

  console.log("poolAddresses", poolAddresses);
  for (const pairAddress in poolAddresses) {
    const pair = poolAddresses[pairAddress];

    if (!pools[pair.token0]) {
      pools[pair.token0] = new Set();
    }

    if (!pools[pair.token1]) {
      pools[pair.token1] = new Set();
    }

    pools[pair.token0].add(pair.token1);
    pools[pair.token1].add(pair.token0);
  }

  for (const tokenAddress in pools) {
    // @ts-ignore
    pools[tokenAddress] = Array.from(pools[tokenAddress]);
  }
  fs.writeFileSync(
    `./scripts/config/${networkName}/${DEX_NAME}/pools.json`,
    JSON.stringify(pools)
  );

  consoleHeader(`Completed indexing factory: ${networkName}`);
}

main();
