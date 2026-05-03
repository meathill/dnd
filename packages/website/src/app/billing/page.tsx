import { redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { getRequestSession } from '@/lib/auth/session';
import { listBillingLedger } from '@/lib/db/repositories';

export default async function BillingPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login');
  }
  const ledger = await listBillingLedger(session.userId);
  return (
    <div className="space-y-6">
      <Card className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">余额</p>
        <h1 className="text-4xl font-semibold text-zinc-950">{session.balance}</h1>
      </Card>
      <Card className="space-y-4">
        <h2 className="text-2xl font-semibold text-zinc-950">账本</h2>
        <div className="space-y-3">
          {ledger.map((entry) => (
            <div className="flex items-center justify-between rounded-xl bg-zinc-100 px-4 py-3" key={entry.id}>
              <div>
                <p className="text-sm font-medium text-zinc-950">{entry.reason}</p>
                <p className="text-xs text-zinc-500">{entry.createdAt}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-950">{entry.amount}</p>
                <p className="text-xs text-zinc-500">余额 {entry.balanceAfter}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
