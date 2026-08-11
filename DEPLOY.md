# Silkline deployment

## 1. Contract in Remix

1. Create `Silkline.sol` and paste the contents of `contracts/Silkline.sol`.
2. Compile with Solidity `0.8.24`; optimizer can be enabled with 200 runs.
3. In **Deploy & Run Transactions**, choose **Injected Provider - MetaMask**.
4. Confirm the wallet is on Base Mainnet (`8453`) and deploy `Silkline` with no constructor arguments.
5. Copy the deployed contract address and verify the contract on BaseScan.

## 2. Frontend configuration

Either paste the address into `deployedAddress` in `src/config/contract.ts`, or add this Netlify variable:

```text
VITE_SILKLINE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

When Base supplies them, add:

- the `<meta name="base:app_id" ...>` tag inside `<head>` in `index.html`;
- the `bc_...` value to `BUILDER_CODE` in `src/config/wagmi.ts`.

## 3. Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20`

`netlify.toml` already contains these settings and the SPA redirect.
