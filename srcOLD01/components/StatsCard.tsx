import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color: 'purple' | 'blue' | 'green' | 'orange';
  subtitle?: string;
}

export function StatsCard({ icon: Icon, label, value, color, subtitle }: StatsCardProps) {
  const colorClasses = {
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/50 text-purple-400',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/50 text-blue-400',
    green: 'from-green-500/20 to-green-600/20 border-green-500/50 text-green-400',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/50 text-orange-400',
  };

  const iconBgClasses = {
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl rounded-xl border p-6 transition-transform hover:scale-105`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-300 text-sm mb-2">{label}</p>
          <p className="text-white mb-1">{value}</p>
          {subtitle && <p className="text-slate-400 text-xs">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${iconBgClasses[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
