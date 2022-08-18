
type Address = string;
export interface Token {
  decimals: number;
  name: string;
  symbol: string;
  address: Address;
}

export interface TokenDescription {
  decimals: string | number;
  name: string;
  symbol: string;
  address: Address;
}
export type TOKENS = { [key: string]: TokenDescription };

export type PoolAddresses = {
  [pairAddress: Address]: { token0: Address; token1: Address };
};
