

import { BigNumber } from "ethers";
import BigNumberJs from "bignumber.js";

export function calcK(reserve0: BigNumber, reserve1: BigNumber): BigNumber {
  return reserve0.mul(reserve1);
}

export function calcToken0Quote(
  reserve0: BigNumber,
  reserve1: BigNumber,
  newReserve1: BigNumber
) {
  const k = calcK(reserve0, reserve1);
  const newReserve0 = k.div(newReserve1);

  return reserve0.sub(newReserve0);
}

export function calcToken1Quote(
  reserve0: BigNumber,
  reserve1: BigNumber,
  newReserve0: BigNumber
) {
  const k = calcK(reserve0, reserve1);
  const newReserve1 = k.div(newReserve0);

  return reserve1.sub(newReserve1);
}

function convertArgToBigNumberJs(reserve: string | BigNumberJs): BigNumberJs {
  if (typeof reserve === "string") {
    reserve = new BigNumberJs(reserve);
  }

  return reserve;
}

export function calcToken0Price(
  reserve0: string | BigNumberJs,
  reserve1: string | BigNumberJs
): BigNumberJs {
  reserve0 = convertArgToBigNumberJs(reserve0);
  reserve1 = convertArgToBigNumberJs(reserve1);

  return reserve1.dividedBy(reserve0);
}
export function calcToken1Price(
  reserve0: string | BigNumberJs,
  reserve1: string | BigNumberJs
): BigNumberJs {
  reserve0 = convertArgToBigNumberJs(reserve0);
  reserve1 = convertArgToBigNumberJs(reserve1);
  return reserve0.dividedBy(reserve1);
}

export function calcPriceImpact(
  oldPrice: string | BigNumberJs,
  newPrice: string | BigNumberJs
): string {
  oldPrice = convertArgToBigNumberJs(oldPrice);
  newPrice = convertArgToBigNumberJs(newPrice);

  return newPrice
    .minus(oldPrice)
    .dividedBy(oldPrice)
    .multipliedBy(100)
    .toString();
}
