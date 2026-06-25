# Spark Sandbox

A browser-based demo app that showcases two independent Spark wallets making Lightning payments between each other using the plain [@buildonspark/spark-sdk](https://docs.spark.money/wallets/overview).

## What it demos

- **Two wallet panels** — each wallet is initialized with a freshly generated mnemonic or an existing one.
- **Lightning invoice generation** — any wallet can create a Bolt11 invoice via `createLightningInvoice()`, with an optional toggle to embed a Spark address (`includeSparkAddress`) for Spark-native payment fallback.
- **Lightning invoice payment** — any wallet can pay a Bolt11 invoice via `payLightningInvoice()`, with a configurable max fee and a "prefer Spark route" toggle (`preferSpark`).
- **Guided payment flow** — a step-by-step panel at the bottom walks you through: pick receiver → generate invoice → pick sender → pay.
- **Real-time balance updates** — balances update automatically via `SparkWalletEvent.BalanceUpdate`, `TransferClaimed`, and `DepositConfirmed` events.
- **Either wallet as sender or receiver** — roles are not fixed; you choose per payment.

No SDK workarounds. Every operation uses the documented public Spark SDK API.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview
```

## Network

The app uses **REGTEST** by default (ideal for local testing). To switch networks, change the `network` option in `WalletPanel.jsx`:

```js
const result = await SparkWallet.initialize({
  options: { network: 'MAINNET' }, // or 'REGTEST'
})
```

## Tech stack

- [Vite](https://vite.dev) + [React](https://react.dev)
- [@buildonspark/spark-sdk](https://docs.spark.money)
