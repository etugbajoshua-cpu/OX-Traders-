import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Which cryptocurrencies and networks are currently supported for deposits?',
      a: 'OX TRADERS strictly supports native Bitcoin (BTC) on the Bitcoin mainnet and Tether (USDT) on the TRON (TRC20) network. Each currency has a dedicated, verified deposit address visible in your dashboard with an exact scannable QR code. Deposits on other unsupported networks are strictly rejected to safeguard customer funds.'
    },
    {
      q: 'How does OX TRADERS verify cryptocurrency deposits?',
      a: 'When you transfer Bitcoin or USDT, you submit the transaction hash (TxID). Our backend queries native blockchain nodes (Mempool for Bitcoin, Tronscan for TRC20) to confirm the receiving address, exact satoshi/USDT outputs, and network block confirmations. An anti-replay filter ensures no transaction hash can ever be credited twice.'
    },
    {
      q: 'How are investment returns calculated and distributed?',
      a: 'Investment yields are generated through algorithmic quantitative strategies, including statistical arbitrage, liquidity provision, and delta-neutral market making. Yields accrue daily to your available wallet balance according to the specific plan guidelines. At maturity, 100% of your allocated principal capital is unlocked and returned to your balance.'
    },
    {
      q: 'What is the withdrawal process and timeframe?',
      a: 'Withdrawal requests can be submitted 24/7 for Bitcoin or USDT TRC20 directly from your dashboard. To protect investor capital from unauthorized access, all withdrawal requests undergo automated ledger verification and a compliance check before cold storage broadcasting. Processing typically completes within 15 minutes to 4 hours.'
    },
    {
      q: 'Why is KYC identity verification required?',
      a: 'To comply with international Anti-Money Laundering (AML) and Counter-Terrorist Financing (CTF) standards, OX TRADERS requires identity verification before enabling unrestricted withdrawals. Your documents are stored with private, end-to-end encryption and are never made publicly accessible.'
    },
    {
      q: 'How does the Referral Program work?',
      a: 'Every registered investor receives a unique referral code and referral link. When an invited investor opens an active strategy position, you earn a configurable commission (currently 5.0%) credited directly to your wallet as an instant cash balance.'
    }
  ];

  return (
    <section id="faq" className="py-12 sm:py-20 bg-[#0B0E11] border-b border-[#2B313A]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-10 sm:mb-14"
        >
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F0B90B] mb-2">
            Clear &amp; Transparent
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3 sm:mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-[#848E9C] text-xs sm:text-sm">
            Everything you need to know about the OX TRADERS platform, blockchain deposits, investment terms, and account security.
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl bg-[#181A20] border transition-colors duration-200 overflow-hidden ${
                  isOpen ? 'border-[#F0B90B]/40' : 'border-[#2B313A]'
                }`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 focus:outline-none hover:bg-[#1E2329] transition-colors cursor-pointer min-h-[56px]"
                >
                  <span className="text-sm sm:text-base font-bold text-white">
                    {faq.q}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg bg-[#1E2329] text-[#F0B90B] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 bg-[#F0B90B]/15' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-3 text-xs sm:text-sm text-[#848E9C] leading-relaxed border-t border-[#2B313A] ox-page-enter">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
