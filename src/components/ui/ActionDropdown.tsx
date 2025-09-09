import { useState } from "react";
import { performAction } from "../../actions/performAction";
import type { ActionName } from "../../actions/types";

interface Option {
  label: string;
  action: ActionName;
  args?: any;
}

interface ActionDropdownProps {
  options: Option[];
}

export default function ActionDropdown({ options }: ActionDropdownProps) {
  const [loadingAction, setLoadingAction] = useState<ActionName | null>(null);

  const handleSelect = async (option: Option) => {
    setLoadingAction(option.action);
    const result = await performAction(option.action, option.args);
    console.log("Resultado acción:", result);
    setLoadingAction(null);
  };

  return (
    <select
      className="border rounded p-2"
      onChange={(e) => {
        const selected = options.find((o) => o.action === e.target.value);
        if (selected) handleSelect(selected);
      }}
    >
      <option value="">-- Seleccionar acción --</option>
      {options.map((opt) => (
        <option key={opt.action} value={opt.action}>
          {loadingAction === opt.action ? `⏳ ${opt.label}` : opt.label}
        </option>
      ))}
    </select>
  );
}
