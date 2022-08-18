# TEsting on localhost

1. You will need 3 terminals opened to run it on localhost
2. In the first terminal, use *yarn start* to start the local blockchain
3. In the second terminal use *yarn setup:1* to deploy the arb contract
4. Under ./scripts/deployments/avax.json replace the old arbitrage contract address with the new arbitrage contract address from step 3
5. In the second terminal use *yarn setup:2* to wrap some avax and send to the arbitrage contract
6. In the second terminal use *yarn monitor* to start monitoring the blockchain
7. In the third terminal use *yarn swap* to simulate a swap and create an arbitrage opportunity
8. Now in your second terminal you should see an arb trade get executed

## Disclaimer
Although it works in theory, running this on a live network will make you lose ALL your money.

Example **lucky** live network transaction: https://snowtrace.io/tx/0x5a1b5675719f55e586e39e28166cf3d86bf1c80c852a98be688468a239c66615

Only considered lucky cause although it went through, it actually lost money once gas cost was included
