// @ts-nocheck

import { ethers } from "hardhat";
import { Contract } from "ethers";
import * as fs from "fs";
import BigNumberJs from "bignumber.js";
import { consoleError, consoleHeader } from "./organizer";
import POOLS from "../config/avax/pools.json";
import TOKENS from "../config/avax/tokens.json";
import multicall from "./multicall";
import JoeRouterAbi from "../../artifacts/contracts/JouRouter02.sol/JoeRouter02.json";
import BLACKLISTED_TOKENS from "../config/avax/blacklistedTokens.json";
import { Address, TokenDescription } from "../setup/types";

const MINIMUM_PROFIT = "0.02";
const ALLOWED_DEPTH = [
  //   ethers.utils.parseEther("0.0000001"),
  //   ethers.utils.parseEther("0.000001"),
  //   ethers.utils.parseEther("0.00001"),
  //   ethers.utils.parseEther("0.0001"),
  ethers.utils.parseEther("0.001"),
  ethers.utils.parseEther("0.01"),
  ethers.utils.parseEther("0.1"),
  ethers.utils.parseEther("0.25"),
  // ethers.utils.parseEther("0.5"),
  // ethers.utils.parseEther("1"),
  //   ethers.utils.parseEther("2.5"),
  //   ethers.utils.parseEther("5"),
  //   ethers.utils.parseEther("10"),
];

export function buildPossiblePaths(
  impactedToken: TokenDescription,
  tokenUsedForImpact: TokenDescription,
  BASE_TOKEN: Address
) {
  let poolsToUsed = POOLS[impactedToken.address];

  if (impactedToken.address === BASE_TOKEN)
    poolsToUsed = POOLS[tokenUsedForImpact.address];

  if (!poolsToUsed) return [];

  const possiblePaths = [];

  for (const possiblePath of poolsToUsed) {
    if (possiblePath === tokenUsedForImpact.address) continue;
    if (BLACKLISTED_TOKENS[possiblePath]) continue;

    let newPath = [BASE_TOKEN];

    if (possiblePath === BASE_TOKEN) {
      newPath.pop();
    }

    if (!POOLS[possiblePath] || !POOLS[possiblePath].includes(BASE_TOKEN)) {
      continue;
    }

    newPath = [...newPath, possiblePath];

    if (impactedToken.address !== BASE_TOKEN) {
      newPath = [...newPath, impactedToken.address];
    }

    newPath = [...newPath, tokenUsedForImpact.address];

    if (tokenUsedForImpact.address !== BASE_TOKEN) {
      newPath = [...newPath, BASE_TOKEN];
    }

    possiblePaths.push(newPath);
  }

  return possiblePaths;
}

export function printPossiblePaths(possiblePaths) {
  let counter = 0;
  for (const possiblePath of possiblePaths) {
    counter++;
    consoleHeader(`Possible Path ${counter}`);
    for (let i = 0; i < possiblePath.length; i++) {
      console.log(`${i}:`, TOKENS[possiblePath[i]]);
    }
  }
}

export async function findBestPathAndDepth(
  router: Contract,
  possiblePaths: Array<Array<string>>
) {
  const maximumExtractableValue = {
    minOut: new BigNumberJs(0),
    allowedDepth: ethers.BigNumber.from("0"),
    path: 0,
    pathCounter: -1,
    profit: new BigNumberJs(0),
  };

  for (const allowedDepth of ALLOWED_DEPTH) {
    const formattedAllowedDepth = ethers.utils.formatEther(allowedDepth);
    consoleHeader(`Depth: ${formattedAllowedDepth}`);
    let pathCounter = 0;
    for (const path of possiblePaths) {
      pathCounter++;

      const amounts = await router
        .getAmountsOut(allowedDepth, path)
        .catch((err) => {
          consoleError("Something went wrong estimating amounts:");
          console.log("path", path);
          console.log(err);
        });
      /** DEBUG Purposes */
      //   let amountCounter = 0;
      //   for (const amount of amounts) {
      //     amountCounter++;
      //     console.log(
      //       `Token ${amountCounter} amount:`,
      //       ethers.utils.formatEther(amount)
      //     );
      //   }
      const minOut = amounts[amounts.length - 1];
      const profit = new BigNumberJs(
        ethers.utils.formatEther(minOut.sub(allowedDepth))
      );
      const formattedMinOut = new BigNumberJs(ethers.utils.formatEther(minOut));

      console.log(`Path ${pathCounter}:`, profit.toString());

      /**
       * TODO: Add a way to measure risk taken vs return amount %
       *
       * i.e. 5 ETH vs 10 ETH risk
       * for a 1% extra gain in return amount using
       * 10 ETH compared to 5 ETH
       *
       * In this case should use 5 ETH since 10ETH only gives 1% better returns
       */

      if (
        profit.gt(0) &&
        profit.gte(MINIMUM_PROFIT) &&
        maximumExtractableValue.minOut.lt(formattedMinOut)
      ) {
        maximumExtractableValue.minOut = formattedMinOut;
        maximumExtractableValue.allowedDepth = allowedDepth;
        maximumExtractableValue.path = path;
        maximumExtractableValue.pathCounter = pathCounter;
        maximumExtractableValue.profit = profit;
        console.log("Profitable!");
        fs.appendFileSync(
          "./scripts/setup/profitableTrades.json",
          JSON.stringify({
            formattedMinOut: formattedMinOut.toString(),
            allowedDepth: allowedDepth.toString(),
            path,
            profit: profit.toString(),
          })
        );
      } else {
        console.log("X Profitable!");
      }
    }
  }

  return maximumExtractableValue;
}

export async function findBestPathAndDepthMulticall(
  router: Contract,
  possiblePaths: Array<Array<string>>
) {
  const maximumExtractableValue = {
    minOut: new BigNumberJs(0),
    allowedDepth: ethers.BigNumber.from("0"),
    path: 0,
    pathCounter: -1,
    profit: new BigNumberJs(0),
  };
  const calls = [];
  for (const allowedDepth of ALLOWED_DEPTH) {
    for (const path of possiblePaths) {
      calls.push({
        address: router.address,
        name: "getAmountsOut",
        params: [allowedDepth, path],
      });
    }
  }

  const resAmounts = await multicall(JoeRouterAbi.abi, calls)
    .then((response) => {
      return response.map((res) => res.data.amounts);
    })
    .catch((err) => {
      consoleError("Error in findBestPathAndDepth multicall");
      console.log("err", err);
      console.log("calls", calls);
      return -1;
    });

  if (resAmounts === -1) {
    consoleError("Something went wrong in findBestPathAndDepth multicall");
    return maximumExtractableValue;
  }

  let counter = -1;
  for (const allowedDepth of ALLOWED_DEPTH) {
    // const formattedAllowedDepth = ethers.utils.formatEther(allowedDepth);
    // consoleHeader(`Depth: ${formattedAllowedDepth}`);
    let pathCounter = 0;
    for (const path of possiblePaths) {
      pathCounter++;
      counter++;

      const amounts = resAmounts[counter];
      /** DEBUG Purposes */
      //   let amountCounter = 0;
      //   for (const amount of amounts) {
      //     amountCounter++;
      //     console.log(
      //       `Token ${amountCounter} amount:`,
      //       ethers.utils.formatEther(amount)
      //     );
      //   }
      const minOut = amounts[amounts.length - 1];
      const profit = new BigNumberJs(
        ethers.utils.formatEther(minOut.sub(allowedDepth))
      );
      const formattedMinOut = new BigNumberJs(ethers.utils.formatEther(minOut));

      // console.log(`Path ${pathCounter}:`, profit.toString());

      /**
       * TODO: Add a way to measure risk taken vs return amount %
       *
       * i.e. 5 ETH vs 10 ETH risk
       * for a 1% extra gain in return amount using
       * 10 ETH compared to 5 ETH
       *
       * In this case should use 5 ETH since 10ETH only gives 1% better returns
       */
      if (
        profit.gt(0) &&
        profit.gte(MINIMUM_PROFIT) &&
        maximumExtractableValue.minOut.lt(formattedMinOut)
      ) {
        maximumExtractableValue.minOut = formattedMinOut;
        maximumExtractableValue.allowedDepth = allowedDepth;
        maximumExtractableValue.path = path;
        maximumExtractableValue.pathCounter = pathCounter;
        maximumExtractableValue.profit = profit;
        // console.log("Profitable!");
      } else {
        // console.log("X Profitable!");
      }
    }
  }

  return maximumExtractableValue;
}
