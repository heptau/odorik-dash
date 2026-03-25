import type { OdorikActiveCall } from '../api';
import { useT } from '../i18n';
import { unifyPhoneNo } from '../api';

interface ActiveCallsProps {
	calls: OdorikActiveCall[];
	onHangup: (callId: number) => void;
	loading: boolean;
}

export default function ActiveCalls({ calls, onHangup, loading }: ActiveCallsProps) {
	const t = useT();

	if (loading) {
		return (
			<div className="p-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
				{t('active_calls.loading')}
			</div>
		);
	}

	if (calls.length === 0) return null;

	return (
		<div className="max-w-4xl mx-auto mb-6">
			<div
				className="rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
				style={{ backgroundColor: 'var(--surface)', borderWidth: '1px', borderColor: 'var(--destructive)' }}
			>
				<div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--separator)' }}>
					<div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
					<h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
						{t('active_calls.title')} ({calls.length})
					</h2>
				</div>

				<div className="divide-y" style={{ borderColor: 'var(--separator)' }}>
					{calls.map((call) => (
						<div
							key={call.id}
							className="px-4 py-3 flex items-center justify-between gap-4"
						>
							<div className="flex-1 min-w-0">
								<div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
									{unifyPhoneNo(call.source_number)} → {unifyPhoneNo(call.destination_number)}
								</div>
								<div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
									{call.destination_name}
								</div>
								<div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
									{call.start_date && new Date(call.start_date).toLocaleTimeString()}
									{call.price_per_minute > 0 && (
										<span className="ml-2">{call.price_per_minute} Kč/min</span>
									)}
								</div>
							</div>
							<button
								onClick={() => onHangup(call.id)}
								className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors shrink-0"
								style={{ backgroundColor: 'var(--destructive)', color: 'white' }}
							>
								{t('active_calls.hangup')}
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
