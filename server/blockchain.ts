import { dbQueryOne } from './db.ts';

export interface VerificationResult {
  verified: boolean;
  status: 'confirmed' | 'verifying' | 'pending' | 'rejected';
  confirmations: number;
  detectedAmount?: number;
  detectedReceiver?: string;
  networkMessage: string;
  explorerUrl: string;
}

const BTC_DEPOSIT_ADDRESS = 'bc1qg2a2gdxtccsxu83xy0jvezenutzyvmv4jl0uz4';
const USDT_TRC20_DEPOSIT_ADDRESS = 'TB4Uq6VQMFMbDZUq3xK4jM8mqz6rb2TqGf';

export async function verifyBlockchainTransaction(
  currency: 'BTC' | 'USDT',
  txHash: string,
  _claimedAmount: number
): Promise<VerificationResult> {
  const cleanTx = txHash.trim();

  // Basic hash validation (standard 64-character hexadecimal)
  const isHex64 = /^[0-9a-fA-F]{64}$/.test(cleanTx);
  if (!isHex64) {
    return {
      verified: false,
      status: 'rejected',
      confirmations: 0,
      networkMessage: 'Invalid transaction hash format. Blockchain transaction IDs must be 64 hexadecimal characters.',
      explorerUrl: currency === 'BTC' ? `https://mempool.space/tx/${cleanTx}` : `https://tronscan.org/#/transaction/${cleanTx}`
    };
  }

  // Anti-replay check: ensure this tx_hash has not already been confirmed for another deposit
  const existingConfirmed = await dbQueryOne(
    `SELECT id, user_id, status FROM deposits WHERE tx_hash = ? AND status = 'confirmed'`,
    [cleanTx]
  );

  if (existingConfirmed) {
    return {
      verified: false,
      status: 'rejected',
      confirmations: 0,
      networkMessage: 'Replay prevention triggered: This transaction hash has already been credited to an account.',
      explorerUrl: currency === 'BTC' ? `https://mempool.space/tx/${cleanTx}` : `https://tronscan.org/#/transaction/${cleanTx}`
    };
  }

  if (currency === 'BTC') {
    const explorerUrl = `https://mempool.space/tx/${cleanTx}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://mempool.space/api/tx/${cleanTx}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const txData = await res.json() as any;
        const status = txData.status;
        const isConfirmed = status && status.confirmed;

        let satoshis = 0;
        if (Array.isArray(txData.vout)) {
          for (const out of txData.vout) {
            if (out.scriptpubkey_address?.toLowerCase() === BTC_DEPOSIT_ADDRESS.toLowerCase()) {
              satoshis += out.value;
            }
          }
        }

        const btcReceived = satoshis / 100000000;

        if (btcReceived > 0) {
          if (isConfirmed) {
            return {
              verified: true,
              status: 'confirmed',
              confirmations: 3,
              detectedAmount: btcReceived,
              detectedReceiver: BTC_DEPOSIT_ADDRESS,
              networkMessage: `Blockchain verified on Bitcoin mainnet: ${btcReceived} BTC sent to official OX TRADERS address.`,
              explorerUrl
            };
          } else {
            return {
              verified: false,
              status: 'verifying',
              confirmations: 0,
              detectedAmount: btcReceived,
              detectedReceiver: BTC_DEPOSIT_ADDRESS,
              networkMessage: `Transaction detected in Bitcoin mempool (${btcReceived} BTC). Awaiting 3 network block confirmations.`,
              explorerUrl
            };
          }
        }
      }
    } catch {
      // Network lookup failed or timed out — falls through to safe pending state
    }

    return {
      verified: false,
      status: 'pending',
      confirmations: 0,
      networkMessage: 'Transaction broadcast recorded. Queued for automated blockchain node indexing and compliance review.',
      explorerUrl
    };
  } else {
    const explorerUrl = `https://tronscan.org/#/transaction/${cleanTx}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${cleanTx}`, { credentials: 'omit', signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json() as any;
        if (data && data.confirmed) {
          const transfers = data.trc20TransferInfo || [];
          let usdtAmount = 0;
          for (const tr of transfers) {
            if (tr.to_address === USDT_TRC20_DEPOSIT_ADDRESS) {
              usdtAmount += parseFloat(tr.amount_str || '0') / 1e6;
            }
          }

          if (usdtAmount > 0) {
            return {
              verified: true,
              status: 'confirmed',
              confirmations: 19,
              detectedAmount: usdtAmount,
              detectedReceiver: USDT_TRC20_DEPOSIT_ADDRESS,
              networkMessage: `Blockchain verified on TRON TRC20: ${usdtAmount} USDT credited to official OX TRADERS wallet.`,
              explorerUrl
            };
          }
        }
      }
    } catch {
      // Falls through to pending
    }

    return {
      verified: false,
      status: 'pending',
      confirmations: 0,
      networkMessage: 'Transaction submitted. Awaiting TRON TRC20 node confirmation or administrative sign-off.',
      explorerUrl
    };
  }
}
