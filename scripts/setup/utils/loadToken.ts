
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { Address, TOKENS } from "../types";

export default async (tokenAddresses: Address[]) => {
  const ERC20Factory = await ethers.getContractFactory("MockERC20");
  const TOKENS: TOKENS = {};

  for (const tokenAddress of tokenAddresses) {
    const token = ERC20Factory.attach(tokenAddress).connect(ethers.provider);

    const decimals = await token
      .decimals()
      .then((res: BigNumber) => res.toString());
    const name = await token.name();
    const symbol = await token.symbol();

    TOKENS[tokenAddress] = {
      address: tokenAddress,
      decimals,
      name,
      symbol,
    };
  }

  return TOKENS;
};
