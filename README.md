# Silkline

Silkline is a collaborative daily ribbon on Base. Every wallet can add one direction per UTC day and make a separate daily check-in. There is no token, mint price, or app fee: users only pay Base network gas.

## Local development

```bash
npm install
npm run dev
```

## Production setup

1. Deploy `contracts/Silkline.sol` in Remix using Solidity `0.8.24` on Base Mainnet.
2. Put the deployed address in `src/config/contract.ts` or set `VITE_SILKLINE_CONTRACT_ADDRESS` in Netlify.
3. Add the Base App ID meta tag to `index.html` after Base provides it.
4. Add the Builder Code to `BUILDER_CODE` in `src/config/wagmi.ts`.
5. Deploy with build command `npm run build` and publish directory `dist`.

The frontend explicitly appends the Base Builder Code data suffix to both `extendLine` and `dailyCheckIn` transactions so attribution works with browser wallets as well as Base Account.
