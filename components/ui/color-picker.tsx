'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette } from 'lucide-react';
import { useState } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#808080', '#800000',
  '#008000', '#000080', '#808000', '#800080', '#008080',
  '#c0c0c0', '#ff9999', '#99ff99', '#9999ff', '#ffff99',
  '#ff99ff', '#99ffff', '#ffcc99', '#cc99ff', '#99ccff'
];

export function ColorPicker({ color, onChange, label, disabled = false }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(color);

  const handleColorChange = (newColor: string) => {
    setInputValue(newColor);
    onChange(newColor);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Validate hex color format
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onChange(value);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center space-x-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className="w-12 h-10 p-0 border-2"
              style={{ backgroundColor: color }}
            >
              <Palette size={16} className="text-white mix-blend-difference" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="start">
            <div className="space-y-4">
              <div>
                <Label htmlFor="color-input" className="text-sm font-label font-medium">
                  Custom Color
                </Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="color-input"
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-16 h-10 p-1 border-0"
                  />
                  <Input
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="#000000"
                    className="flex-1 font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-label font-medium">Preset Colors</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                        color === presetColor ? 'border-foreground' : 'border-border'
                      }`}
                      style={{ backgroundColor: presetColor }}
                      onClick={() => {
                        handleColorChange(presetColor);
                        setIsOpen(false);
                      }}
                      title={presetColor}
                    />
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono"
          disabled={disabled}
          maxLength={7}
        />
      </div>
    </div>
  );
}
