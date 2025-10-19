import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Memuat...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
      <p className="text-slate-400">{message}</p>
    </div>
  );
}
