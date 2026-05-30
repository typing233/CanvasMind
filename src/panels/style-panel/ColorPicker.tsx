import React from 'react';
import { useT } from '../../i18n';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const { t } = useT();
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{t(label)}</span>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-7 h-7 border border-gray-300 rounded cursor-pointer"
      />
    </div>
  );
};
