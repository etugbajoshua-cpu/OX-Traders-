import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, CheckCircle2, Clock, X } from 'lucide-react';
import {
  DEFAULT_PLATFORM_SETTINGS,
  getPublicPlatformSettings,
  getPublicWithdrawalFeed,
  maskIdentifier,
  PublicWithdrawalFeedItem,
} from '../../lib/firestoreService.ts';

export type WithdrawalToastItem = {
  id: string;
  maskedIdentifier: string;
  amountUsd: number;
  status: 'approved' | 'processing' | 'completed';
  processedAt: string;
  isDemo: boolean;
};

export interface WithdrawalToastConfig {
  enabled: boolean;
  demoEnabled: boolean;
  statuses: Array<'approved' | 'processing' | 'completed'>;
  durationSec: number;
  minIntervalSec: number;
  maxIntervalSec: number;
}

export const SETTINGS_UPDATED_EVENT = 'ox:platform-settings-updated';
export const PREVIEW_TOAST_EVENT = 'ox:preview-withdrawal-toast';

const DEMO_FIRST_NAMES = [
  'john', 'maria', 'david', 'elena', 'marcus', 'sophia', 'liam', 'chloe',
  'nathan', 'amelia', 'lucas', 'hannah', 'omar', 'isabella', 'daniel', 'victor',
  'noah', 'olivia', 'ethan', 'grace', 'samuel', 'claire', 'gabriel', 'naomi',
];

const DEMO_LAST_INITIALS = ['k', 'm', 'r', 't', 's', 'b', 'w', 'd', 'p', 'v', 'h', 'c'];

const DEMO_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'proton.me',
  'hotmail.com',
];

const DEMO_CENTS = [0, 0, 0, 0.25, 0.5, 0.75, 0.4, 0.8, 0.15, 0.9];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function parseToastConfig(settings: Record<string, string>): WithdrawalToastConfig {
  const rawStatuses = String(
    settings.withdrawal_toast_statuses ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_statuses
  )
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is 'approved' | 'processing' | 'completed' =>
      s === 'approved' || s === 'processing' || s === 'completed'
    );

  const durationRaw = Number(
    settings.withdrawal_toast_duration_sec ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_duration_sec
  );
  const minRaw = Number(
    settings.withdrawal_toast_min_interval_sec ??
      DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_min_interval_sec
  );
  const maxRaw = Number(
    settings.withdrawal_toast_max_interval_sec ??
      DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_max_interval_sec
  );

  const durationSec = Number.isFinite(durationRaw) ? Math.min(20, Math.max(3, Math.round(durationRaw))) : 6;
  const minIntervalSec = Number.isFinite(minRaw) ? Math.min(180, Math.max(3, Math.round(minRaw))) : 5;
  const maxIntervalSec = Number.isFinite(maxRaw)
    ? Math.min(300, Math.max(minIntervalSec, Math.round(maxRaw)))
    : Math.max(minIntervalSec, 40);

  return {
    enabled: (settings.withdrawal_toast_enabled ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_enabled) !== 'false',
    demoEnabled:
      (settings.withdrawal_toast_demo_enabled ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_demo_enabled) === 'true',
    statuses: rawStatuses.length > 0 ? rawStatuses : ['completed', 'processing'],
    durationSec,
    minIntervalSec,
    maxIntervalSec,
  };
}

export function generateRandomDemoNotification(
  allowedStatuses: Array<'approved' | 'processing' | 'completed'> = ['completed', 'processing'],
  previousIdentifier?: string
): WithdrawalToastItem {
  let maskedIdentifier = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    const first = pickRandom(DEMO_FIRST_NAMES);
    const suffix = Math.random() > 0.45 ? pickRandom(DEMO_LAST_INITIALS) + randomInt(1, 99) : pickRandom(DEMO_LAST_INITIALS);
    const useEmail = Math.random() > 0.14;
    const raw = useEmail ? `${first}${suffix}@${pickRandom(DEMO_DOMAINS)}` : `${first}_${suffix}`;
    maskedIdentifier = maskIdentifier(raw);
    if (maskedIdentifier !== previousIdentifier) break;
  }

  // Randomly mix payout amounts across hundreds ($180–$985), thousands ($1,150–$9,950),
  // tens/hundreds of thousands ($12,400–$485,000), and millions ($1,020,000–$4,850,000)
  const tierRoll = Math.random();
  const whole =
    tierRoll > 0.85
      ? randomInt(1020000, 4850000)
      : tierRoll > 0.6
        ? randomInt(12400, 485000)
        : tierRoll > 0.25
          ? randomInt(1150, 9950)
          : randomInt(180, 985);
  const cents = pickRandom(DEMO_CENTS);
  const amountUsd = Math.round((whole + cents) * 100) / 100;

  const statuses: Array<'approved' | 'processing' | 'completed'> =
    allowedStatuses.length > 0 ? allowedStatuses : ['completed', 'processing'];
  const status = pickRandom(statuses);

  // Recent randomized timestamp within 1–22 minutes ago
  const offsetMs = randomInt(45, 22 * 60) * 1000;
  const processedAt = new Date(Date.now() - offsetMs).toISOString();

  return {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    maskedIdentifier,
    amountUsd,
    status,
    processedAt,
    isDemo: true,
  };
}

export function triggerWithdrawalNotificationPreview(
  item?: Partial<WithdrawalToastItem>,
  durationSec = 6
) {
  window.dispatchEvent(
    new CustomEvent(PREVIEW_TOAST_EVENT, {
      detail: {
        item: {
          ...generateRandomDemoNotification(['completed', 'processing']),
          ...item,
          id: `preview-${Date.now()}`,
        },
        durationSec,
      },
    })
  );
}

function formatToastTimestamp(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 'Just now';

  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const clock = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (diffSec < 60) return `Just now · ${clock}`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago · ${clock}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago · ${clock}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${clock}`;
}

export function formatUsdPayout(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface WithdrawalNotificationCardProps {
  item: WithdrawalToastItem;
  durationSec?: number;
  onDismiss?: () => void;
  animateProgress?: boolean;
}

export const WithdrawalNotificationCard: React.FC<WithdrawalNotificationCardProps> = ({
  item,
  durationSec = 6,
  onDismiss,
  animateProgress = true,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const isCompleted = item.status === 'completed';
  const headline = isCompleted ? 'Withdrawal Successful' : 'Withdrawal Processed';

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative w-full max-w-[356px] overflow-hidden rounded-2xl bg-[#11141A]/96 backdrop-blur-md border border-[#F0B90B]/40 shadow-[0_18px_45px_-12px_rgba(0,0,0,0.85)] text-white"
    >
      {/* Top subtle yellow highlight hairline */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#F0B90B] via-[#FCD535] to-transparent opacity-90" />

      <div className="p-3.5 pr-9 flex items-start gap-3">
        {/* Icon emblem */}
        <div
          className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            isCompleted
              ? 'bg-[#F0B90B] text-[#0B0E11] border-[#FCD535]'
              : 'bg-[#1B1F27] text-[#F0B90B] border-[#F0B90B]/40'
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          )}
        </div>

        {/* Text body following exact requested hierarchy */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] font-black tracking-tight text-[#F0B90B]">
            <span>{headline}</span>
          </div>

          <div className="text-[12px] font-mono text-white/95 truncate">
            &ldquo;{item.maskedIdentifier}&rdquo;
          </div>

          <div className="text-[13px] font-semibold text-white leading-snug">
            Successfully withdrew{' '}
            <span className="font-mono font-black text-[#F0B90B] tabular-nums">
              {formatUsdPayout(item.amountUsd)}
            </span>
          </div>

          <div className="pt-0.5 flex items-center gap-1.5 text-[10px] text-[#9AA3B2] font-medium">
            <Clock className="w-3 h-3 text-[#F0B90B]/75 shrink-0" />
            <span className="truncate">{formatToastTimestamp(item.processedAt)}</span>
            {!item.isDemo && (
              <>
                <span aria-hidden="true" className="text-[#5E6673]">
                  ·
                </span>
                <span className="text-white/75 font-semibold">Verified Payout</span>
              </>
            )}
          </div>
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss withdrawal notification"
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-[#848E9C] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Auto-dismiss countdown progress track */}
      {animateProgress && !shouldReduceMotion && (
        <motion.div
          key={item.id}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: durationSec, ease: 'linear' }}
          style={{ transformOrigin: 'left center' }}
          className="h-[2px] w-full bg-[#F0B90B]/70"
        />
      )}
    </div>
  );
};

interface FloatingWithdrawalNotificationsProps {
  currentView: 'public' | 'login' | 'register' | 'dashboard' | 'admin';
}

export const FloatingWithdrawalNotifications: React.FC<FloatingWithdrawalNotificationsProps> = ({
  currentView,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [config, setConfig] = useState<WithdrawalToastConfig>(() =>
    parseToastConfig(DEFAULT_PLATFORM_SETTINGS)
  );
  const [liveFeed, setLiveFeed] = useState<PublicWithdrawalFeedItem[]>([]);
  const [activeToast, setActiveToast] = useState<{
    item: WithdrawalToastItem;
    durationSec: number;
  } | null>(null);

  const scheduleTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const lastIdentifierRef = useRef<string>('');
  const lastLiveIdRef = useRef<string>('');
  const configRef = useRef(config);
  const liveFeedRef = useRef(liveFeed);
  const viewRef = useRef(currentView);

  configRef.current = config;
  liveFeedRef.current = liveFeed;
  viewRef.current = currentView;

  const clearTimers = useCallback(() => {
    if (scheduleTimerRef.current !== null) {
      window.clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const loadConfigAndFeed = useCallback(async () => {
    try {
      const settings = await getPublicPlatformSettings();
      const parsed = parseToastConfig(settings);
      setConfig(parsed);
      configRef.current = parsed;

      if (parsed.enabled) {
        const items = await getPublicWithdrawalFeed(parsed.statuses);
        setLiveFeed(items);
        liveFeedRef.current = items;
      } else {
        setLiveFeed([]);
        liveFeedRef.current = [];
      }
    } catch {
      // Keep existing/default state silently
    }
  }, []);

  const buildNextToast = useCallback((): WithdrawalToastItem | null => {
    const cfg = configRef.current;
    if (!cfg.enabled) return null;

    const records = liveFeedRef.current;
    if (records.length > 0) {
      const pool =
        records.length > 1
          ? records.filter((r) => r.id !== lastLiveIdRef.current)
          : records;
      const chosen = pickRandom(pool);
      lastLiveIdRef.current = chosen.id;
      lastIdentifierRef.current = chosen.maskedIdentifier;
      return {
        id: `live-${chosen.id}-${Date.now()}`,
        maskedIdentifier: chosen.maskedIdentifier,
        amountUsd: chosen.amountUsd,
        status: chosen.status,
        processedAt: chosen.processedAt,
        isDemo: false,
      };
    }

    if (cfg.demoEnabled) {
      const demo = generateRandomDemoNotification(cfg.statuses, lastIdentifierRef.current);
      lastIdentifierRef.current = demo.maskedIdentifier;
      return demo;
    }

    return null;
  }, []);

  const scheduleNextCycle = useCallback(
    (initialShortDelay = false) => {
      clearTimers();

      const cfg = configRef.current;
      if (!cfg.enabled || viewRef.current === 'admin') return;

      const minMs = cfg.minIntervalSec * 1000;
      const maxMs = Math.max(minMs, cfg.maxIntervalSec * 1000);
      const delayMs = initialShortDelay
        ? randomInt(Math.min(3500, minMs), Math.min(9000, maxMs))
        : randomInt(minMs, maxMs);

      scheduleTimerRef.current = window.setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          scheduleNextCycle(false);
          return;
        }

        const nextItem = buildNextToast();
        if (!nextItem) {
          scheduleNextCycle(false);
          return;
        }

        const displaySec = configRef.current.durationSec;
        setActiveToast({ item: nextItem, durationSec: displaySec });

        hideTimerRef.current = window.setTimeout(() => {
          setActiveToast(null);
          scheduleTimerRef.current = window.setTimeout(() => {
            scheduleNextCycle(false);
          }, 360);
        }, displaySec * 1000);
      }, delayMs);
    },
    [buildNextToast, clearTimers]
  );

  // Initial load + periodic background refresh
  useEffect(() => {
    void loadConfigAndFeed();
    const refreshId = window.setInterval(() => {
      void loadConfigAndFeed();
    }, 90_000);

    const handleSettingsUpdate = () => {
      void loadConfigAndFeed().then(() => {
        setActiveToast(null);
        scheduleNextCycle(true);
      });
    };

    const handleManualPreview = (ev: Event) => {
      const custom = ev as CustomEvent<{
        item?: WithdrawalToastItem;
        durationSec?: number;
      }>;
      clearTimers();
      const previewItem =
        custom.detail?.item ||
        generateRandomDemoNotification(configRef.current.statuses, lastIdentifierRef.current);
      const previewDuration = Math.min(
        20,
        Math.max(3, Number(custom.detail?.durationSec || configRef.current.durationSec || 6))
      );

      setActiveToast({ item: previewItem, durationSec: previewDuration });
      hideTimerRef.current = window.setTimeout(() => {
        setActiveToast(null);
        if (viewRef.current !== 'admin') {
          scheduleNextCycle(false);
        }
      }, previewDuration * 1000);
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    window.addEventListener(PREVIEW_TOAST_EVENT, handleManualPreview);

    return () => {
      window.clearInterval(refreshId);
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
      window.removeEventListener(PREVIEW_TOAST_EVENT, handleManualPreview);
      clearTimers();
    };
  }, [clearTimers, loadConfigAndFeed, scheduleNextCycle]);

  // Restart cycle cleanly whenever route/view or config enablement changes
  useEffect(() => {
    clearTimers();
    setActiveToast(null);
    if (currentView !== 'admin' && config.enabled) {
      scheduleNextCycle(true);
    }
    return () => {
      clearTimers();
    };
  }, [
    currentView,
    config.enabled,
    config.demoEnabled,
    config.minIntervalSec,
    config.maxIntervalSec,
    config.durationSec,
    config.statuses.join(','),
    clearTimers,
    scheduleNextCycle,
  ]);

  const handleDismiss = () => {
    clearTimers();
    setActiveToast(null);
    if (currentView !== 'admin' && config.enabled) {
      scheduleTimerRef.current = window.setTimeout(() => {
        scheduleNextCycle(false);
      }, 360);
    }
  };

  // Safe non-obstructive placement tailored to DashboardLayout vs Public/Auth views
  const positionClasses =
    currentView === 'dashboard'
      ? 'bottom-20 left-3 right-3 sm:right-auto sm:left-4 lg:bottom-6 lg:left-[17.5rem]'
      : 'bottom-4 left-3 right-3 sm:right-auto sm:bottom-6 sm:left-6';

  return (
    <div
      className={`fixed z-40 pointer-events-none flex justify-start ${positionClasses}`}
      aria-label="Recent withdrawal activity"
    >
      <AnimatePresence mode="wait">
        {activeToast && (
          <motion.div
            key={activeToast.item.id}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -24, y: 12, scale: 0.97 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -16, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto w-full sm:w-auto"
          >
            <WithdrawalNotificationCard
              item={activeToast.item}
              durationSec={activeToast.durationSec}
              onDismiss={handleDismiss}
              animateProgress
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
