import { Layers } from "lucide-react";
import type { ReactNode } from "react";
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
  action?: ReactNode;
};

export function LayerSwitcher({ value, onValueChange, action }: LayerSwitcherProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="inline-flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" />
          Layer
        </Label>
        {action}
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {imageryProviders.map((provider) => (
            <SelectItem key={provider.id} value={provider.id}>
              {provider.name} · {provider.category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
