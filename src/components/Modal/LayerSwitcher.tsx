import { Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { imageryProviders } from "@/providers/registry";

type LayerSwitcherProps = {
  value: string;
  onValueChange: (value: string) => void;
};

export function LayerSwitcher({ value, onValueChange }: LayerSwitcherProps) {
  return (
    <div className="space-y-2">
      <Label className="inline-flex items-center gap-2">
        <Layers className="h-3.5 w-3.5" />
        Layer
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {imageryProviders.map((provider) => (
            <SelectItem key={provider.id} value={provider.id}>
              {provider.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
