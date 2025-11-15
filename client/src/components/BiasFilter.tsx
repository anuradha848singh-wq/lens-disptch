import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Bias = "left" | "center" | "right";

interface BiasFilterProps {
  selectedBias: Bias[];
  onBiasChange: (bias: Bias[]) => void;
}

export function BiasFilter({ selectedBias, onBiasChange }: BiasFilterProps) {
  const biasOptions: { value: Bias; label: string; color: string }[] = [
    { value: "left", label: "Left", color: "text-blue-600 dark:text-blue-400" },
    { value: "center", label: "Center", color: "text-purple-600 dark:text-purple-400" },
    { value: "right", label: "Right", color: "text-red-600 dark:text-red-400" },
  ];

  const handleChange = (bias: Bias, checked: boolean) => {
    if (checked) {
      onBiasChange([...selectedBias, bias]);
    } else {
      onBiasChange(selectedBias.filter((b) => b !== bias));
    }
    console.log(`Bias filter ${bias} ${checked ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Bias Filter</h3>
      {biasOptions.map((option) => (
        <div key={option.value} className="flex items-center gap-2">
          <Checkbox
            id={`bias-${option.value}`}
            checked={selectedBias.includes(option.value)}
            onCheckedChange={(checked) => handleChange(option.value, checked as boolean)}
            data-testid={`checkbox-bias-${option.value}`}
          />
          <Label
            htmlFor={`bias-${option.value}`}
            className={`text-sm cursor-pointer ${option.color}`}
          >
            {option.label}
          </Label>
        </div>
      ))}
    </div>
  );
}
