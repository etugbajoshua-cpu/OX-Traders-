import { db } from './db.ts';

function generateTxRef(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 9).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `OX-${prefix}-${timestamp}-${rand}`;
}

export const ledgerService = {
  // Ensure user has wallet entries for USD, BTC, and USDT
  ensureWallets(userId: number) {
    const currencies = ['USD', 'BTC', 'USDT'];
    const insert = db.prepare(`
      INSERT OR IGNORE INTO wallets (user_id, currency, balance, locked_balance)
      VALUES (?, ?, 0.0, 0.0)
    `);
    for (const cur of currencies) {
      insert.run(userId, cur);
    }
  },

  // Get user's wallet balances
  getBalances(userId: number) {
    this.ensureWallets(userId);
    const rows = db.prepare('SELECT currency, balance, locked_balance FROM wallets WHERE user_id = ?').all(userId) as any[];
    const balances: Record<string, { available: number; locked: number; total: number }> = {};
    for (const r of rows) {
      balances[r.currency] = {
        available: Number(r.balance.toFixed(6)),
        locked: Number(r.locked_balance.toFixed(6)),
        total: Number((r.balance + r.locked_balance).toFixed(6))
      };
    }
    return balances;
  },

  // Credit user account with double-entry record
  creditWallet(params: {
    userId: number;
    currency: string;
    amount: number;
    type: 'deposit' | 'investment_return' | 'investment_principal_return' | 'referral_bonus' | 'balance_credit';
    description: string;
    relatedId?: string;
  }) {
    if (params.amount <= 0) throw new Error('Credit amount must be greater than zero');
    this.ensureWallets(params.userId);

    const txRef = generateTxRef('CRD');

    const execute = db.transaction(() => {
      // 1. Update wallet balance
      db.prepare(`
        UPDATE wallets 
        SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND currency = ?
      `).run(params.amount, params.userId, params.currency);

      // 2. Insert immutable transaction log
      const res = db.prepare(`
        INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
        VALUES (?, ?, ?, ?, ?, 0.0, 'completed', ?, ?)
      `).run(params.userId, txRef, params.type, params.currency, params.amount, params.description, params.relatedId || null);

      return { txRef, txId: res.lastInsertRowid };
    });

    return execute();
  },

  // Debit user account with balance check
  debitWallet(params: {
    userId: number;
    currency: string;
    amount: number;
    type: 'investment_open' | 'balance_debit' | 'fee';
    description: string;
    relatedId?: string;
  }) {
    if (params.amount <= 0) throw new Error('Debit amount must be greater than zero');
    this.ensureWallets(params.userId);

    const txRef = generateTxRef('DBT');

    const execute = db.transaction(() => {
      const wallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ? AND currency = ?').get(params.userId, params.currency) as any;
      if (!wallet || wallet.balance < params.amount) {
        throw new Error(`Insufficient funds: available balance is ${wallet ? wallet.balance : 0} ${params.currency}`);
      }

      db.prepare(`
        UPDATE wallets 
        SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND currency = ?
      `).run(params.amount, params.userId, params.currency);

      const res = db.prepare(`
        INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
        VALUES (?, ?, ?, ?, ?, 0.0, 'completed', ?, ?)
      `).run(params.userId, txRef, params.type, params.currency, params.amount, params.description, params.relatedId || null);

      return { txRef, txId: res.lastInsertRowid };
    });

    return execute();
  },

  // Lock funds when requesting withdrawal to prevent double-spending
  requestWithdrawal(params: {
    userId: number;
    currency: 'BTC' | 'USDT';
    network: string;
    destinationAddress: string;
    amount: number;
    fee: number;
  }) {
    this.ensureWallets(params.userId);
    const totalDeduction = params.amount;
    const netAmount = params.amount - params.fee;
    if (netAmount <= 0) {
      throw new Error(`Withdrawal amount must be higher than the network fee (${params.fee} ${params.currency})`);
    }

    const txRef = generateTxRef('WTH');

    const execute = db.transaction(() => {
      const wallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ? AND currency = ?').get(params.userId, params.currency) as any;
      if (!wallet || wallet.balance < totalDeduction) {
        throw new Error(`Insufficient available balance: ${wallet ? wallet.balance : 0} ${params.currency}`);
      }

      // Move from available to locked balance
      db.prepare(`
        UPDATE wallets
        SET balance = balance - ?, locked_balance = locked_balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND currency = ?
      `).run(totalDeduction, totalDeduction, params.userId, params.currency);

      // Create withdrawal entry
      const wthRes = db.prepare(`
        INSERT INTO withdrawals (user_id, currency, network, destination_address, amount, fee, net_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(params.userId, params.currency, params.network, params.destinationAddress, params.amount, params.fee, netAmount);

      const withdrawalId = wthRes.lastInsertRowid;

      // Create transaction log
      db.prepare(`
        INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
        VALUES (?, ?, 'withdrawal', ?, ?, ?, 'pending', ?, ?)
      `).run(params.userId, txRef, params.currency, params.amount, params.fee, `Withdrawal request to ${params.destinationAddress}`, String(withdrawalId));

      return { withdrawalId, txRef, netAmount };
    });

    return execute();
  },

  // Approve and mark withdrawal completed
  completeWithdrawal(withdrawalId: number, payoutTxHash: string, adminId: number) {
    const execute = db.transaction(() => {
      const wth = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(withdrawalId) as any;
      if (!wth) throw new Error('Withdrawal record not found');
      if (wth.status === 'completed') throw new Error('Withdrawal is already marked completed');

      // Deduct locked balance permanently
      db.prepare(`
        UPDATE wallets
        SET locked_balance = locked_balance - ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND currency = ?
      `).run(wth.amount, wth.user_id, wth.currency);

      // Update withdrawal record
      db.prepare(`
        UPDATE withdrawals
        SET status = 'completed', payout_tx_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(payoutTxHash, withdrawalId);

      // Update related transaction
      db.prepare(`
        UPDATE transactions
        SET status = 'completed', description = description || ' [TXID: ' || ? || ']'
        WHERE related_id = ? AND type = 'withdrawal'
      `).run(payoutTxHash, String(withdrawalId));

      // Notify user
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'Withdrawal Processed Successfully', ?, 'success')
      `).run(wth.user_id, `Your withdrawal of ${wth.net_amount} ${wth.currency} has been broadcast to the network. Hash: ${payoutTxHash}`);

      return { success: true };
    });

    return execute();
  },

  // Reject withdrawal and release locked balance
  rejectWithdrawal(withdrawalId: number, reason: string, adminId: number) {
    const execute = db.transaction(() => {
      const wth = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(withdrawalId) as any;
      if (!wth) throw new Error('Withdrawal record not found');
      if (wth.status === 'completed') throw new Error('Cannot reject a completed withdrawal');
      if (wth.status === 'rejected') throw new Error('Withdrawal is already rejected');

      // Release locked balance back to available
      db.prepare(`
        UPDATE wallets
        SET balance = balance + ?, locked_balance = locked_balance - ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND currency = ?
      `).run(wth.amount, wth.amount, wth.user_id, wth.currency);

      // Update withdrawal
      db.prepare(`
        UPDATE withdrawals
        SET status = 'rejected', admin_note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reason, withdrawalId);

      // Update transaction
      db.prepare(`
        UPDATE transactions
        SET status = 'cancelled', description = description || ' [Rejected: ' || ? || ']'
        WHERE related_id = ? AND type = 'withdrawal'
      `).run(reason, String(withdrawalId));

      // Notify user
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'Withdrawal Request Rejected', ?, 'warning')
      `).run(wth.user_id, `Your withdrawal request of ${wth.amount} ${wth.currency} was rejected. Reason: ${reason}. Funds have been restored to your balance.`);

      return { success: true };
    });

    return execute();
  },

  // Admin Manual Adjustment (Audit-compliant with double entry)
  adminAdjustBalance(params: {
    adminId: number;
    adminEmail: string;
    userId: number;
    currency: string;
    type: 'credit' | 'debit';
    amount: number;
    reason: string;
  }) {
    if (params.amount <= 0) throw new Error('Adjustment amount must be positive');
    this.ensureWallets(params.userId);

    const ref = generateTxRef('ADJ');

    const execute = db.transaction(() => {
      const user = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(params.userId) as any;
      if (!user) throw new Error('User not found');

      if (params.type === 'credit') {
        db.prepare(`
          UPDATE wallets
          SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND currency = ?
        `).run(params.amount, params.userId, params.currency);

        db.prepare(`
          INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
          VALUES (?, ?, 'balance_credit', ?, ?, 0.0, 'completed', ?, ?)
        `).run(params.userId, ref, params.currency, params.amount, `Admin balance adjustment credit: ${params.reason}`, `admin_${params.adminId}`);
      } else {
        const wallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ? AND currency = ?').get(params.userId, params.currency) as any;
        if (!wallet || wallet.balance < params.amount) {
          throw new Error(`User balance insufficient for debit: currently ${wallet ? wallet.balance : 0} ${params.currency}`);
        }

        db.prepare(`
          UPDATE wallets
          SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND currency = ?
        `).run(params.amount, params.userId, params.currency);

        db.prepare(`
          INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description, related_id)
          VALUES (?, ?, 'balance_debit', ?, ?, 0.0, 'completed', ?, ?)
        `).run(params.userId, ref, params.currency, params.amount, `Admin balance adjustment debit: ${params.reason}`, `admin_${params.adminId}`);
      }

      // Record in immutable admin audit log
      db.prepare(`
        INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
        VALUES (?, ?, 'balance_adjustment', 'user', ?, ?)
      `).run(params.adminId, params.adminEmail, String(params.userId), JSON.stringify({
        currency: params.currency,
        type: params.type,
        amount: params.amount,
        reason: params.reason,
        ref
      }));

      // Notify user
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'Account Balance Adjusted', ?, 'info')
      `).run(params.userId, `Your ${params.currency} balance was adjusted by ${params.type === 'credit' ? '+' : '-'}${params.amount} ${params.currency}. Note: ${params.reason}`);

      return { ref, success: true };
    });

    return execute();
  }
};
