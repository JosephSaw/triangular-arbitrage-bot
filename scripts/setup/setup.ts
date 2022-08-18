
import { request, gql } from "graphql-request";
import * as fs from "fs";
import loadToken from "../utils/loadToken";
import { consoleHeader } from "../utils/organizer";
import { Token } from "./types";

const BASE_TOKEN = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"; // WETH

const EXCHANGE_SUBGRAPH_URL =
  "https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange";
const MINIMUM_RESERVE_USD = 100;
const DEBUG_MODE = false;

interface SubgraphPair {
  id: string;
  token0: {
    id: string;
  };
  token1: {
    id: string;
  };
}

function fetchTokenPools(tokenAddress: string, counter = 0) {
  tokenAddress = tokenAddress.toLowerCase();
  return request(
    EXCHANGE_SUBGRAPH_URL,
    gql` 
  {
    token0Pairs:pairs(first:1000, where:{ token0:"${tokenAddress}", reserveUSD_gt:${MINIMUM_RESERVE_USD}}){
        id
        token0{
            id
        }
        token1{
            id
        }
    }
    token1Pairs:pairs(first:1000,  where:{ token1:"${tokenAddress}", reserveUSD_gt:${MINIMUM_RESERVE_USD} }){
        id
        token0{
            id
        }
        token1{
            id
        }
    }
  }`
  );
}

function getUniqueTokens(
  subgraphPairData: SubgraphPair[],
  index: "token0" | "token1"
) {
  return subgraphPairData.map((pair) => pair[index].id);
}

function addToTokenAddressesSet(
  addresses: string[],
  tokenAddresses: Set<string>
): Set<string> {
  for (const address of addresses) {
    tokenAddresses.add(address);
  }
  return tokenAddresses;
}

/**
 *
 * @param updatedSet The set which will actually be updated when passed by reference
 * @param setToMerge Unaffected set that will loop through its own entries to add to 'updatedSet'
 */
function combineSets(updatedSet: Set<any>, setToMerge: Set<any>) {
  setToMerge.forEach(updatedSet.add, updatedSet);
}
async function main() {
  const tokenAddresses: Set<string> = new Set();
  const tokens: Token[] = [];
  const pools = {};

  const res = await fetchTokenPools(BASE_TOKEN);
  consoleHeader("Fetching all pairs of BASE_TOKEN");
  console.log("BASE_TOKEN token0Pairs length:", res.token0Pairs.length);
  console.log("BASE_TOKEN token1Pairs length:", res.token1Pairs.length);

  consoleHeader("Saving Tokens in a Set");
  addToTokenAddressesSet(
    getUniqueTokens(res.token0Pairs, "token1"),
    tokenAddresses
  );
  addToTokenAddressesSet(
    getUniqueTokens(res.token1Pairs, "token0"),
    tokenAddresses
  );
  console.log("tokenAddresses length:", tokenAddresses.size);

  consoleHeader("Initializing pools");
  // @ts-ignore
  pools[BASE_TOKEN] = Array.from(tokenAddresses);

  let counter = -1;
  for (const tokenAddress of tokenAddresses) {
    if (DEBUG_MODE && counter > 5) break;
    consoleHeader(`Fetching all pairs for ${tokenAddress}`);
    counter++;
    console.log(`${counter} / ${tokenAddresses.size}`);
    const res = await fetchTokenPools(tokenAddress);
    const uniquePoolsToThisToken: Set<string> = new Set();

    console.log("token0Pairs length:", res.token0Pairs.length);
    console.log("token1Pairs length:", res.token1Pairs.length);

    addToTokenAddressesSet(
      getUniqueTokens(res.token0Pairs, "token1"),
      uniquePoolsToThisToken
    );
    addToTokenAddressesSet(
      getUniqueTokens(res.token1Pairs, "token0"),
      uniquePoolsToThisToken
    );

    console.log("uniquePoolsToThisToken length:", uniquePoolsToThisToken.size);
    const [first] = uniquePoolsToThisToken;
    // @ts-ignore
    if (uniquePoolsToThisToken.size === 1 && pools[first]) {
      console.log("End of this token");
      continue;
    }
    // @ts-ignore
    pools[tokenAddress] = Array.from(uniquePoolsToThisToken);

    console.log("tokenAddresses length before update:", tokenAddresses.size);
    combineSets(tokenAddresses, uniquePoolsToThisToken);
    console.log("tokenAddresses length after update:", tokenAddresses.size);
  }

  // consoleHeader(`Cleaning up Base token pairs`);
  // // @ts-ignore
  // const baseTokenPairs = pools[BASE_TOKEN];
  // for (const baseTokenPair of JSON.parse(JSON.stringify(baseTokenPairs))) {
  //   // @ts-ignore
  //   if (!pools[baseTokenPair]) {
  //     const index = baseTokenPairs.indexOf(baseTokenPair);
  //     baseTokenPairs.splice(index, 1);
  //   }
  // }

  fs.writeFileSync("./scripts/config/avax/pools.json", JSON.stringify(pools));
  consoleHeader(`Updated pools.json`);

  consoleHeader(`Fetching tokens data`);
  console.log("tokenAddresses length:", tokenAddresses.size);
  const TOKENS = {};
  const newtokensRes = await loadToken(Array.from(tokenAddresses) as string[]);
  for (const token of newtokensRes) {
    // @ts-ignore
    TOKENS[token.address] = token;
  }
  fs.writeFileSync("./scripts/config/avax/tokens.json", JSON.stringify(TOKENS));
  consoleHeader(`Updated tokens.json`);
}

main();
