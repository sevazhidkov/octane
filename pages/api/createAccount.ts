import { PublicKey, Transaction } from '@solana/web3.js';
import type { NextApiRequest, NextApiResponse } from 'next';
import base58 from 'bs58';
import { cache } from '../../src/helpers/cache';
import { connection } from '../../src/helpers/connection';
import { ENV_SECRET_KEYPAIR } from '../../src/helpers/env';
import { cors, rateLimit } from '../../src/middleware';
import config from '../../config.json';
import { createAccountIfTokenFeePaid } from '../../src/actions/createAccountIfTokenFeePaid';

// Endpoint to create associated token account with transaction fees and account initialization fees paid by SPL tokens
export default async function (request: NextApiRequest, response: NextApiResponse) {
    await cors(request, response);
    await rateLimit(request, response);

    // Deserialize a base58 wire-encoded transaction from the request
    const serialized = request.body?.transaction;
    if (typeof serialized !== 'string') {
        response.status(400).send({ status: 'error', message: 'request should contain transaction' });
        return;
    }

    let transaction: Transaction;
    try {
        transaction = Transaction.from(base58.decode(serialized));
    } catch (e) {
        response.status(400).send({ status: 'error', message: "can't decode transaction" });
        return;
    }

    try {
        const { signature } = await createAccountIfTokenFeePaid(
            connection,
            transaction,
            ENV_SECRET_KEYPAIR,
            config.maxSignatures,
            config.lamportsPerSignature,
            config.endpoints.transfer.tokens.map((token) => ({
                mint: new PublicKey(token.mint),
                account: new PublicKey(token.account),
                decimals: token.decimals,
                fee: BigInt(token.fee),
            })),
            cache
        );
        // Respond with the confirmed transaction signature
        response.status(200).send({ status: 'ok', signature });
    } catch (error) {
        let message: string = '';
        if (error instanceof Error) {
            message = error.message;
        }
        response.status(400).send({ status: 'error', message });
    }
}
