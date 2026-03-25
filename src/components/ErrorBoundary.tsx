import { Component, type ReactNode } from 'react';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('ErrorBoundary caught an error:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="p-6 bg-red-50 rounded-2xl border border-red-100 shadow-sm m-4">
					<h2 className="text-lg font-bold text-red-600 mb-2">Něco se pokazilo</h2>
					<p className="text-sm text-red-500 mb-4">{this.state.error?.message}</p>
					<button
						onClick={() => this.setState({ hasError: false, error: null })}
						className="px-4 py-2 bg-white text-gray-800 rounded-xl shadow-sm text-sm font-semibold border border-gray-200 hover:bg-gray-50"
					>
						Zkusit znovu
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}