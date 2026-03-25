interface SkeletonProps {
	className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
	return (
		<div className={`animate-pulse bg-gray-200 rounded ${className}`} />
	);
}

export function SkeletonList({ count = 5 }: { count?: number }) {
	return (
		<div className="space-y-3">
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="flex items-center gap-4 p-4">
					<Skeleton className="w-12 h-12 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-1/3" />
						<Skeleton className="h-3 w-1/2" />
					</div>
					<Skeleton className="w-9 h-9 rounded-xl" />
				</div>
			))}
		</div>
	);
}