import React from 'react';

interface KPIProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export const KPI: React.FC<KPIProps> = ({ title, value, subtitle }) => {
  return (
    <div className="glass-panel p-6 flex flex-col justify-center">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
      <div className="mt-2 text-3xl font-bold text-gray-800">{value}</div>
      {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
    </div>
  );
};
