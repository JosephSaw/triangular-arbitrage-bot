
import CONTRACTS from "../deployments/avax.json";
const contracts: typeof CONTRACTS = {
  // @ts-ignore
  tokens: {},
  // @ts-ignore
  traderJoe: {},
};

for (const tokenName in CONTRACTS.tokens) {
  // @ts-ignore
  contracts.tokens[tokenName] = CONTRACTS.tokens[tokenName].toLowerCase();
}

for (const address in CONTRACTS.traderJoe) {
  // @ts-ignore
  contracts.traderJoe[address] = CONTRACTS.traderJoe[address].toLowerCase();
}

export default contracts;
