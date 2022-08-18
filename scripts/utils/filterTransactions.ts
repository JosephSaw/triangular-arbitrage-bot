
/* eslint-disable node/no-extraneous-import */
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { ethers } from "hardhat";

import CONTRACTS from "../config";
import JoeRouterJson from "../../artifacts/contracts/JouRouter02.sol/IJoeRouter02.json";
import { consoleError } from "./organizer";

type WhitelistedFunctionNames =
  | "swapExactTokensForAVAX"
  | "swapExactTokensForTokens"
  | "swapExactAVAXForTokens"
  | "swapTokensForExactTokens"
  | "swapTokensForExactAVAX"
  | "swapAVAXForExactTokens";

export const WHITELISTED_FUNCTION_NAMES = {
  swapExactTokensForAVAX: {
    amountIn: "args.amountIn",
    amountOut: "args.amountOutMin",
  },
  swapExactTokensForTokens: {
    amountIn: "args.amountIn",
    amountOut: "args.amountOutMin",
  },
  swapExactAVAXForTokens: { amountIn: "value", amountOut: "args.amountOutMin" },
  swapTokensForExactTokens: {
    amountIn: "args.amountInMax",
    amountOut: "args.amountOut",
  },
  swapTokensForExactAVAX: {
    amountIn: "args.amountInMax",
    amountOut: "args.amountOut",
  },
  swapAVAXForExactTokens: { amountIn: "value", amountOut: "args.amountOut" },
};

export default function filterTransactions(
  transactions: TransactionResponse[]
) {
  const joeRouterInterface = new ethers.utils.Interface(JoeRouterJson.abi);

  return transactions
    .filter((tx) => tx.to?.toLowerCase() === CONTRACTS.traderJoe.router)
    .map((tx) => ({
      from: tx.from,
      ...joeRouterInterface.parseTransaction(tx),
    }))
    .filter((tx) => {
      const functionWhitelisted =
        !!WHITELISTED_FUNCTION_NAMES[
          tx.functionFragment.name as WhitelistedFunctionNames
        ];

      if (!functionWhitelisted) {
        consoleError(`Function not whitelisted: ${tx.functionFragment.name}`);
        return false;
      }

      return true;
    })
    .filter((parsedTx) => parsedTx.args.path.length === 2);
}
