import { Connection, Keypair, Transaction } from '@solana/web3.js';
import {
    AllowedToken,
    sha256,
    simulateRawTransaction,
    validateAccountInitializationInstructions,
    validateTransaction,
    validateTransfer,
} from '../core';
import { Cache } from 'cache-manager';
import base58 from 'bs58';

/**
 * Sign transaction by fee payer if the first instruction is a transfer of a fee to given account and the second instruction
 * creates an associated token account with initialization fees by fee payer.
 *
 * @param connection           Connection to a Solana node
 * @param transaction          Transaction to sign
 * @param maxSignatures        Maximum allowed signatures in the transaction including fee payer's
 * @param lamportsPerSignature Maximum transaction fee payment in lamports
 * @param allowedTokens        List of tokens that can be used with token fee receiver accounts and fee details
 * @param feePayer             Keypair for fee payer
 * @param cache                A cache to store duplicate transactions
 *
 * @return {signature: string} Transaction signature by fee payer
 */
export async function createAccountIfTokenFeePaid(
    connection: Connection,
    transaction: Transaction,
    feePayer: Keypair,
    maxSignatures: number,
    lamportsPerSignature: number,
    allowedTokens: AllowedToken[],
    cache: Cache
) {
    // Prevent simple duplicate transactions using a hash of the message
    const key = `transaction/${base58.encode(sha256(transaction.serializeMessage()))}`;
    if (await cache.get(key)) throw new Error('duplicate transaction');
    await cache.set(key, true);

    // Check that the transaction is basically valid, sign it, and serialize it, verifying the signatures
    const { signature, rawTransaction } = await validateTransaction(
        connection,
        transaction,
        feePayer,
        maxSignatures,
        lamportsPerSignature
    );

    // Check that transaction only contains transfer and a valid new account
    await validateAccountInitializationInstructions(connection, transaction, feePayer, cache);

    // Check that the transaction contains a valid transfer to Octane's token account
    await validateTransfer(connection, transaction, allowedTokens);

    // FIXME: decide how to deal with multiple signing requests before transaction is confirmed and merge the update here
    // https://github.com/solana-labs/octane/pull/12/files#r830647062

    await simulateRawTransaction(connection, rawTransaction);

    return { signature: signature };
}
