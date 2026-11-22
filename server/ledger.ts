import { dbExecute, dbQueryAll, dbWithTransaction, DbRunner } from './db.ts';

function generateTxRef(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 9).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `OX-${prefix}-${timestamp}-${rand}`;
}

export const ledgerService = {
  // Ensure user has wallet entries for USD, BTC, and USDT
  async ensureWallets(userId: number, runner?: DbRunner) {
    const currencies = ['USD', 'BTC', 'USDT'];
    const exec = runner ? runner.execute.bind(runner) : dbExecute;
    for (const cur of currencies) {
      await exec(
        `INSERT INTO wallets (user_id, currency, balance, locked_balance)
         VALUES (?, ?, 0.0, 0.0)
         ON CONFLICT (user_id, currency) DO NOTHING`,
        [userId, cur]
      );
    }
  },

  // Get user's wallet balances
  async getBalances(userId: number) {
    await this.ensureWallets(userId);
    const rows = await dbQueryAll<any>('SELECT currency, balance, locked_balance FROM wallets WHERE user_id = ?', [userId]);
    const balances: Record<string, { available: number; locked: number; total: number }> = {};
    for (const r of rows) {
      const bal = Number(r.balance || 0);
      const locked = Number(r.locked_balance || 0);
      balances[r.currency] = {
        available: Number(bal.toFixed(6)),
        locked: Number(locked.toFixed(6)),
        total: Number((bal + locked).toFixed(6))
      };
    }
    return balances;
  },

  // Credit user account with double-entry record
  async creditWallet(params: {
    userId: number;
    currency: string;
    amount: number;
    type: 'deposit' | 'investment_return' | 'investment_principal_return' | 'referral_bonus' | 'balance_credit';
    description: string;
    relatedId?: string;
  }) {
    if (params.amount <= 0) throw new Error('Credit amount must be greater than zero');
    await this.ensureWallets(params.userId);

    const txRef = generateTxRef('CRD');

    return dbWithTransaction(async (tx) => {
      await tx.execute(
        `UPDATE wallets
         SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND currency = ?`,
        [params.amount, params.userId, params.currency]
      );

      const res = await tx.execute(
        `INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
         VALUES (?, ?, ?, ?, ?, 0.0, 'completed', ?, ?)`,
        [params.userId, txRef, params.type, params.currency, params.amount, params.description, params.relatedId || null]
      );

      return { txRef, txId: res.lastInsertId };
    });
  },

  // Debit user account with balance check
  async debitWallet(params: {
    userId: number;
    currency: string;
    amount: number;
    type: 'investment_open' | 'balance_debit' | 'fee';
    description: string;
    relatedId?: string;
  }) {
    if (params.amount <= 0) throw new Error('Debit amount must be greater than zero');
    await this.ensureWallets(params.userId);

    const txRef = generateTxRef('DBT');

    return dbWithTransaction(async (tx) => {
      const wallet = await tx.queryOne<any>(
        'SELECT balance FROM wallets WHERE user_id = ? AND currency = ?',
        [params.userId, params.currency]
      );
      const currentBalance = Number(wallet?.balance || 0);
      if (!wallet || currentBalance < params.amount) {
        throw new Error(`Insufficient funds: available balance is ${currentBalance} ${params.currency}`);
      }

      await tx.execute(
        `UPDATE wallets
         SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND currency = ?`,
        [params.amount, params.userId, params.currency]
      );

      const res = await tx.execute(
        `INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
         VALUES (?, ?, ?, ?, ?, 0.0, 'completed', ?, ?)`,
        [params.userId, txRef, params.type, params.currency, params.amount, params.description, params.relatedId || null]
      );

      return { txRef, txId: res.lastInsertId };
    });
  },

  // Lock funds when requesting withdrawal to prevent double-spending
  async requestWithdrawal(params: {
    userId: number;
    currency: 'BTC' | 'USDT';
    network: string;
    destinationAddress: string;
    amount: number;
    fee: number;
  }) {
    await this.ensureWallets(params.userId);
    const totalDeduction = params.amount;
    const netAmount = params.amount - params.fee;
    if (netAmount <= 0) {
      throw new Error(`Withdrawal amount must be higher than the network fee (${params.fee} ${params.currency})`);
    }

    const txRef = generateTxRef('WTH');

    return dbWithTransaction(async (tx) => {
      const wallet = await tx.queryOne<any>(
        'SELECT balance FROM wallets WHERE user_id = ? AND currency = ?',
        [params.userId, params.currency]
      );
      const currentBalance = Number(wallet?.balance || 0);
      if (!wallet || currentBalance < totalDeduction) {
        throw new Error(`Insufficient available balance: ${currentBalance} ${params.currency}`);
      }

      await tx.execute(
        `UPDATE wallets
         SET balance = balance - ?, locked_balance = locked_balance + ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND currency = ?`,
        [totalDeduction, totalDeduction, params.userId, params.currency]
      );

      const wthRes = await tx.execute(
        `INSERT INTO withdrawals (user_id, currency, network, destination_address, amount, fee, net_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [params.userId, params.currency, params.network, params.destinationAddress, params.amount, params.fee, netAmount]
      );

      const withdrawalId = wthRes.lastInsertId;

      await tx.execute(
        `INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
         VALUES (?, ?, 'withdrawal', ?, ?, ?, 'pending', ?, ?)`,
        [params.userId, txRef, params.currency, params.amount, params.fee, `Withdrawal request to ${params.destinationAddress}`, String(withdrawalId)]
      );

      return { withdrawalId, txRef, netAmount };
    });
  },

  // Approve and mark withdrawal completed
  async completeWithdrawal(withdrawalId: number, payoutTxHash: string, _adminId: number) {
    return dbWithTransaction(async (tx) => {
      const wth = await tx.queryOne<any>('SELECT * FROM withdrawals WHERE id = ?', [withdrawalId]);
      if (!wth) throw new Error('Withdrawal record not found');
      if (wth.status === 'completed') throw new Error('Withdrawal is already marked completed');

      await tx.execute(
        `UPDATE wallets
         SET locked_balance = locked_balance - ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND currency = ?`,
        [wth.amount, wth.user_id, wth.currency]
      );

      await tx.execute(
        `UPDATE withdrawals
         SET status = 'completed', payout_tx_hash = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [payoutTxHash, withdrawalId]
      );

      await tx.execute(
        `UPDATE transactions
         SET status = 'completed', description = description || ' [TXID: ' || CAST(? AS TEXT) || ']'
         WHERE related_id = ? AND type = 'withdrawal'`,
        [payoutTxHash, String(withdrawalId)]
      );

      await tx.execute(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'Withdrawal Processed Successfully', ?, 'success')`,
        [wth.user_id, `Your withdrawal of ${wth.net_amount} ${wth.currency} has been broadcast to the network. Hash: ${payoutTxHash}`]
      );

      return { success: true };
    });
  },

  // Reject withdrawal and release locked balance
  async rejectWithdrawal(withdrawalId: number, reason: string, _adminId: number) {
    return dbWithTransaction(async (tx) => {
      const wth = await tx.queryOne<any>('SELECT * FROM withdrawals WHERE id = ?', [withdrawalId]);
      if (!wth) throw new Error('Withdrawal record not found');
      if (wth.status === 'completed') throw new Error('Cannot reject a completed withdrawal');
      if (wth.status === 'rejected') throw new Error('Withdrawal is already rejected');

      await tx.execute(
        `UPDATE wallets
         SET balance = balance + ?, locked_balance = locked_balance - ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND currency = ?`,
        [wth.amount, wth.amount, wth.user_id, wth.currency]
      );

      await tx.execute(
        `UPDATE withdrawals
         SET status = 'rejected', admin_note = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [reason, withdrawalId]
      );

      await tx.execute(
        `UPDATE transactions
         SET status = 'cancelled', description = description || ' [Rejected: ' || CAST(? AS TEXT) || ']'
         WHERE related_id = ? AND type = 'withdrawal'`,
        [reason, String(withdrawalId)]
      );

      await tx.execute(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'Withdrawal Request Rejected', ?, 'warning')`,
        [wth.user_id, `Your withdrawal request of ${wth.amount} ${wth.currency} was rejected. Reason: ${reason}. Funds have been restored to your balance.`]
      );

      return { success: true };
    });
  },

  // Admin Manual Adjustment (Audit-compliant with double entry)
  async adminAdjustBalance(params: {
    adminId: number;
    adminEmail: string;
    userId: number;
    currency: string;
    type: 'credit' | 'debit';
    amount: number;
    reason: string;
  }) {
    if (params.amount <= 0) throw new Error('Adjustment amount must be positive');
    await this.ensureWallets(params.userId);

    const ref = generateTxRef('ADJ');

    return dbWithTransaction(async (tx) => {
      const user = await tx.queryOne<any>('SELECT email, full_name FROM users WHERE id = ?', [params.userId]);
      if (!user) throw new Error('User not found');

      if (params.type === 'credit') {
        await tx.execute(
          `UPDATE wallets
           SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND currency = ?`,
          [params.amount, params.userId, params.currency]
        );

        await tx.execute(
          `INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
           VALUES (?, ?, 'balance_credit', ?, ?, 0.0, 'completed', ?, ?)`,
          [params.userId, ref, params.currency, params.amount, `Admin balance adjustment credit: ${params.reason}`, `admin_${params.adminId}`]
        );
      } else {
        const wallet = await tx.queryOne<any>(
          'SELECT balance FROM wallets WHERE user_id = ? AND currency = ?',
          [params.userId, params.currency]
        );
        const currentBalance = Number(wallet?.balance || 0);
        if (!wallet || currentBalance < params.amount) {
          throw new Error(`User balance insufficient for debit: currently ${currentBalance} ${params.currency}`);
        }

        await tx.execute(
          `UPDATE wallets
           SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND currency = ?`,
          [params.amount, params.userId, params.currency]
        );

        await tx.execute(
          `INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
           VALUES (?, ?, 'balance_debit', ?, ?, 0.0, 'completed', ?, ?)`,
          [params.userId, ref, params.currency, params.amount, `Admin balance adjustment debit: ${params.reason}`, `admin_${params.adminId}`]
        );
      }

      await tx.execute(
        `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
         VALUES (?, ?, 'balance_adjustment', 'user', ?, ?)`,
        [
          params.adminId,
          params.adminEmail,
          String(params.userId),
          JSON.stringify({
            currency: params.currency,
            type: params.type,
            amount: params.amount,
            reason: params.reason,
            ref
          })
        ]
      );

      await tx.execute(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'Account Balance Adjusted', ?, 'info')`,
        [params.userId, `Your ${params.currency} balance was adjusted by ${params.type === 'credit' ? '+' : '-'}${params.amount} ${params.currency}. Note: ${params.reason}`]
      );

      return { ref, success: true };
    });
  }
};
