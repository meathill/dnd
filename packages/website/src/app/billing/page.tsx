import { redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { getRequestSession } from '@/lib/auth/session';
import { listBillingLedger } from '@/lib/db/billing-repo';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export default async function BillingPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login');
  }
  const ledger = await listBillingLedger(session.userId);
  const debit = ledger.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0);
  const credit = ledger.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">当前余额</p>
          <p className="text-4xl font-semibold text-zinc-950">{session.balance}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <dt className="text-zinc-500">累计消费</dt>
          <dd className="text-right font-medium text-zinc-900">{debit}</dd>
          <dt className="text-zinc-500">累计获得</dt>
          <dd className="text-right font-medium text-zinc-900">+{credit}</dd>
        </dl>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-950">账本</h2>
          <span className="text-xs text-zinc-500">{ledger.length} 条记录</span>
        </div>
        {ledger.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            还没有任何账单。
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {ledger.map((entry) => (
              <li className="flex items-start justify-between gap-4 py-3" key={entry.id}>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-zinc-900">{prettifyReason(entry.reason)}</p>
                  <p className="text-xs text-zinc-500">{formatDateTime(entry.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${entry.amount < 0 ? 'text-zinc-900' : 'text-emerald-700'}`}>
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                  </p>
                  <p className="text-xs text-zinc-500">余额 {entry.balanceAfter}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function prettifyReason(reason: string): string {
  return reason.replace(UUID_PATTERN, (match) => `${match.slice(0, 6)}…`);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}
