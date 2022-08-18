
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { ethers } from "ethers";

import MultiCallAbi from "../../abi/Multicall.json";
import contracts from "../deployments/avax.json";

interface Call {
  address: string; // Address of the contract
  name: string; // Function name on the contract (example: balanceOf)
  params?: any[]; // Function params
}

interface MultiCallV2Response {
  data: Array<any>;
  success: boolean;
}

/**
 * Multicall V2 uses the new "tryAggregate" function. It is different in 2 ways
 *
 * 1. If "requireSuccess" is false multicall will not bail out if one of the calls fails
 * 2. The return inclues a boolean whether the call was successful e.g. [wasSuccessfull, callResult]
 */
export const multicallv2 = async (
  abi: any[],
  calls: Call[],
  requireSuccess = true
): Promise<MultiCallV2Response[]> => {
  const httpProvider = new Web3.providers.HttpProvider("https://api.avax.network/ext/bc/C/rpc");
  const web3 = new Web3(httpProvider);
  const multi = new web3.eth.Contract(
    MultiCallAbi as unknown as AbiItem,
    contracts.multicallv2
  );
  const itf = new ethers.utils.Interface(abi);
  const calldata = calls.map((call) => [
    call.address.toLowerCase(),
    itf.encodeFunctionData(call.name, call.params),
  ]);

  const returnData = await multi.methods
    .tryAggregate(requireSuccess, calldata)
    .call();

  // @ts-ignore
  const res = returnData.map((call, i) => {
    const [success, data] = call;
    return {
      success,
      data: itf.decodeFunctionResult(calls[i].name, data),
    };
  });
  return res;
};
export default multicallv2;
