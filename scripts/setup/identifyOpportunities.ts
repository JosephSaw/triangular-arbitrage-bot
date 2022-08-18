
import { ethers, network } from "hardhat";

import { request, gql } from "graphql-request";
import * as fs from "fs";
import loadToken from "../utils/loadToken";
import { consoleHeader } from "../utils/organizer";
import { TOKENS, Address, PoolAddresses } from "./types";
import UniswapV2PairABI from "../../abi/UniswapV2/Pair.json";
import UniswapV2RouterABI from "../../abi/UniswapV2/Router.json";
import { calcToken0Price, calcToken1Price } from "../utils/pricing";
import { buildPossiblePaths, findBestPathAndDepth } from "../utils/trading";

import loadContractsConfig from "../deployments";

const BASE_TOKEN = "0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB"; // WETH
const BASE_PAIR = "0xF3DE9dc38f62608179c45fE8943a0cA34Ba9CEfc"; // USDT - NEAR

const STABLE_COINS = [
  "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802", // USDC
  "0x4988a896b1227218e4A686fdE5EabdcAbd91571f", // USDT
];

const MINIMUM_RESERVE_USD = 100;

async function fetchPoolTokenPrice(
  pairAdress: Address,
  TOKENS: TOKENS,
  poolAddresses: PoolAddresses
) {
  const pairContract = new ethers.Contract(
    pairAdress,
    UniswapV2PairABI,
    ethers.provider
  );

  const pairReserves = await pairContract.getReserves();

  const token0 = TOKENS[poolAddresses[pairAdress].token0];
  const token1 = TOKENS[poolAddresses[pairAdress].token1];

  const formattedReserve0 = ethers.utils.formatUnits(
    pairReserves._reserve0,
    token0.decimals
  );
  const formattedReserve1 = ethers.utils.formatUnits(
    pairReserves._reserve1,
    token1.decimals
  );
  const token0Price = calcToken0Price(formattedReserve0, formattedReserve1);
  const token1Price = calcToken1Price(formattedReserve0, formattedReserve1);

  return {
    token0,
    token1,
    formattedReserve0,
    formattedReserve1,
    token0Price,
    token1Price,
  };
}

async function main() {
  const networkName = network.name;
  console.log("network:", networkName);
  const poolAddresses: PoolAddresses = JSON.parse(
    fs.readFileSync(`./scripts/config/${networkName}/poolAddresses.json`) as any
  );

  const TOKENS: TOKENS = JSON.parse(
    fs.readFileSync(`./scripts/config/${networkName}/tokens.json`) as any
  );

  const contracts = loadContractsConfig(networkName);
  const routerContract = new ethers.Contract(
    contracts.auroraSwap.router,
    UniswapV2RouterABI,
    ethers.provider
  );

  for (const poolAddress in poolAddresses) {
    const {
      token0,
      token1,
      formattedReserve0,
      formattedReserve1,
      token0Price,
      token1Price,
    } = await fetchPoolTokenPrice(poolAddress, TOKENS, poolAddresses);
    console.log("token0", token0);
    console.log("token1", token1);
    // console.log("_reserve0:", formattedReserve0);
    // console.log("_reserve1:", formattedReserve1);
    // console.log("Token0Price:", token0Price.toString());
    // console.log("Token1Price:", token1Price.toString());

    const possiblePaths = buildPossiblePaths(token1, token0, BASE_TOKEN);
    console.log("possiblePaths", possiblePaths);

    findBestPathAndDepth(routerContract, possiblePaths);
  }
}

main();
