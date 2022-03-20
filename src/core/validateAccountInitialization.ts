import { Connection, Transaction, Keypair } from '@solana/web3.js';
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
} from '@solana/spl-token';
import { isDeepStrictEqual } from 'util';
import { Cache } from 'cache-manager';

export async function validateAccountInitializationInstructions(
    connection: Connection,
    transaction: Transaction,
    feePayer: Keypair,
    cache: Cache
): Promise<void> {
    // Transaction instructions should be: [fee transfer, account initialization]
    // The fee transfer is validated with validateTransfer in the action function.
    if (transaction.instructions.length != 2) {
        throw new Error('transaction should contain 2 instructions: fee payment, account init');
    }
    const [, instruction] = transaction.instructions;

    if (instruction.programId != ASSOCIATED_TOKEN_PROGRAM_ID) {
        throw new Error('account instruction should call associated token program');
    }

    const [, , ownerMeta, mintMeta] = instruction.keys;

    const associatedToken = await getAssociatedTokenAddress(mintMeta.pubkey, ownerMeta.pubkey);

    // Check if account isn't already created
    if (await connection.getAccountInfo(associatedToken, 'confirmed')) {
        throw new Error('account already exists');
    }

    const referenceInstruction = createAssociatedTokenAccountInstruction(
        feePayer.publicKey,
        associatedToken,
        ownerMeta.pubkey,
        mintMeta.pubkey
    );
    if (!isDeepStrictEqual(referenceInstruction, instruction)) {
        throw new Error('unable to match associated account instruction');
    }

    // Prevent trying to create same accounts too many times within a short timeframe (per one recent blockhash)
    const key = `account/${transaction.recentBlockhash}_${associatedToken.toString()}`;
    if (await cache.get(key)) throw new Error('duplicate account within same recent blockhash');
    await cache.set(key, true);
}
