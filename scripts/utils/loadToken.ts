

import { Contract } from "ethers";

// eslint-disable-next-line node/no-missing-import
import multicall from "./multicall";
import ERC20 from "../../artifacts/contracts/ERC20.sol/ERC20.json";

function fetchData(calls: any, tokens: any) {
  return multicall(ERC20.abi, calls).then((res) => {
    return tokens.map((token: any, index: number) => {
      return {
        decimals: res[index * 3].data[0],
        name: res[index * 3 + 1].data[0],
        symbol: res[index * 3 + 2].data[0],
        address: token,
      };
    });
  });
}

export default async (tokens: string[]) => {
  let calls: any = [];
  let response: any = [];
  let tokensBeingFetched: Array<string> = [];
  let index = -1;
  const tokensLength = tokens.length - 1;
  for (const token of tokens) {
    index++;
    tokensBeingFetched.push(token);
    calls.push({
      address: token,
      name: "decimals",
    });

    calls.push({
      address: token,
      name: "name",
    });

    calls.push({
      address: token,
      name: "symbol",
    });

    if (
      tokensBeingFetched.length === 50 || // If tokensBeingFetched is full
      index === tokensLength // If we are at the last token item
    ) {
      console.log("Fetching tokens batch");
      response = response.concat(
        await fetchData(calls, tokensBeingFetched).catch((err) => {
          console.log("Something went wrong fetching call data", err);
          console.log("calls", calls);
          console.log("calls", tokensBeingFetched);
          return [];
        })
      );
      console.log("Tokens length", response.length);
      tokensBeingFetched = [];
      calls = [];
    }
  }

  return response;
};
