# Octane ⛽

1. [What is Octane?](#what-is-octane)
2. [How does it work?](#how-does-it-work)
3. [Is this secure?](#is-this-secure)
4. [What does Octane want?](#what-does-octane-want)
5. [How do I use it?](#how-do-i-use-it)

## What is Octane?

Octane is a gasless transaction relayer for Solana. Octane accepts transactions via an HTTP API, signs them if they satisfy certain conditions and broadcasts to the network.

Transaction fees on Solana are very inexpensive, but users still need SOL to pay for them, and they often don't know (or forget) this.

Sometimes a good friend (like you!) introduces them to Solana, and explaining that you need to get SOL first to do anything is tricky.

Sometimes users stake all their SOL or swap it for tokens or mint an NFT and don't have any left in their wallet.

Sometimes a merchant or dApp would like to pay for certain transactions on behalf of their users.

Octane is designed for anyone to be able to run for free on Vercel as a collection of serverless Node.js API functions.

![Overview of Octane architecture](overview.png)

## How does it work?

Octane provides an API that lets users pay for transactions with SPL token transfers instead of native SOL.

It leverages unique properties of Solana:

1) Transaction can have multiple signers, one of whom is the transaction fee payer. There is no single "msg.sender".

2) Transaction can have multiple instructions interacting with different programs that are executed atomically. If one instruction fail, whole transactions fails.

3) Each instruction refers to accounts it touches as writable or readable. It allows to validate transactions before signing.

A user creates a transaction that contains an instruction for a small token transfer to Octane, along with whatever else their transaction is supposed to do.

The user partially signs the transaction, authorizing it to make the transfer, and so it can't be modified by Octane or MITM attacks.

The user sends the serialized transaction to an Octane REST API endpoint.

Octane validates the transaction, signs it to pay the SOL, and broadcasts it on the Solana network.

When the transaction is confirmed, Octane will have been paid a fee in the token for this service.

## Is this secure?

Octane operates trustlessly and is designed to be easily run by anyone in an adversarial environment.

It uses ratelimiting, transaction validation, and transaction simulation to mitigate DoS, spam, draining, and other attacks.

However, there are some risks associated with running an Octane node:

1) SPL-to-SOL token spread. Octane is configured to accept specific amounts of SPL tokens for paying fixed transaction fees in SOL. Since the token price relative to SOL can change, Octane could end up in a state where it loses money on every transaction.
2) Draining possibilities due to Octane software bugs. Octane signs user-generated transactions with fee payer's keypair after confirming a transaction transfers fee and does not try to modify fee payer's accounts.  However, if implemented checks are insufficient due to a bug, an attacker could run transaction without paying the fee or modify fee payer's accounts.

Follow these recommendations to minimize risks:
1. Run Octane on a new separate keypair, not used in governance or within contracts as authority.
2. Set SPL token price for transactions with a premium relative to their real cost in SOL.
3. Don't hold more SOL on the keypair than needed for 3-4 hours of spending on transaction fees for your load expectations. It could be as low as 0.2-1 SOL.
4. Every hour automatically received swap tokens to SOL (Octane provides a CLI for that).
5. Regularly check that prices and liquidity of SPL tokens allow your profitably pay for transaction fees in SOL.
6. If your Octane node makes profit, regularly withdraw that profit to another keypair.

## What does Octane want?

Octane wants to make Solana easier to use by abstracting away some complexity that leads to user confusion and error.

Octane wants to enable SOL-less wallets for new users in crypto, allowing them to operate only in stablecoins.

Octane wants to become integrated with wallets, support multiple tokens with different fees, and perform atomic swaps to pay for transactions or get SOL.

Octane wants to be customizable for decentralized applications that want to sponsor their users transactions.

Octane wants to create a seamless, competitive marketplace for gasless transactions.

Octane wants to be secure, well-tested, well-documented, and easy to use.

## How do I use it?

1. You can use Octane as a server application to deploy on a platform like Render or Vercel.
2. You can use someone else's node. This way you don't have to support your own server and manage funds on fee payer account. However, you'll be limited by SPL tokens they offer at their price per signature.
3. You can integrate Octane into your backend by using it as a Typescript library.

### Common integration scenarios

1. If you are building a Solana wallet, you can use Octane to allow users to transfer SPL tokens without paying transaction fees in SOL. Additionally, Octane supports creating associated token accounts for transfers of tokens if the receiver doesn't have an associated token flow. You can use Octane transaction flow only for users, who don't have any SOL at the wallet.
2. If you are building a Solana dapp, you can allow users to run your transactions within your dapp without spending SOL. For example, if you build an NFT marketplace, you can support NFT purchases using just USDC. Alternatively, you can airdrop your own token to users and accept payments for fees in it. As with wallets, you can enable Octane flow only for users who don't have any SOL on their account.
3. If you are building an app or a suite of apps with your token, ... # todo
### Setting up your own node

You can get started by following the steps in [SETUP](SETUP.md).

### Using Octane from a client app

If you already have set up an Octane node, or you are using a public endpoint from someone else, it's the time to integrate the node with your client code.

### Integrate as a Typescript library

### Managing fee payer account

## Is there an example app that uses Octane?

## How is the code structured?

Octane is built as a monorepo with multiple packages using [Lerna](https://lerna.js.org/).

[Core](https://github.com/solana-labs/octane/tree/master/packages/core) package provides reusable functions that process and sign transactions ("actions").

[Server](https://github.com/solana-labs/octane/tree/master/packages/package) package is a Next.js app that runs the server using API functions. It's also responsible for parsing `config.json` and managing web-specific security tools (CORS and rate limits).

If you want to create a new action (for example, swap on a new protocol), you'll need to add it as an action in Core and add a new endpoint in Server that calls new action.

Octane utilizes cache for some rate limiting, but generally should be stateless.

## How to contribute?

Octane is a great way to start contributing in the Solana ecosystem. Since Octane is just an HTTP server written on Typescript, you don't have know Rust or learn how to build programs on Solana.

Some ideas for your first PRs:
* More tests with various scenarios focused on Octane security
* Docs, guides and example code for new people to get started with Octane
* Add support for more exchange protocols
* Build apps for consumers on top of Octane

Also, you can run your own Octane node and promote it among developers.
