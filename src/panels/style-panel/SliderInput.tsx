import React from 'react';
import { useT } from '../../i18n';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export const SliderInput: React.FC<SliderInputProps> = ({ label, value, min, max, step = 1, onChange }) => {
  const { t } = useT();
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600 whitespace-nowrap">{t(label)}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1.5"
      />
      <span className="text-xs text-gray-500 w-6 text-right">{value}</span>
    </div>
  );
};
