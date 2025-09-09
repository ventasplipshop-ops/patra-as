// src/components/ui/SimpleTable.tsx
import Button from "./Button";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface Action {
  label: string;
  onClick: (row: any) => void;
}

interface SimpleTableProps {
  data: any[];
  columns: Column[];
  actions?: Action[];
}

export default function SimpleTable({ data, columns, actions = [] }: SimpleTableProps) {
  return (
    <table className="w-full border rounded">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="p-2 border-b text-left">{col.label}</th>
          ))}
          {actions.length > 0 && <th className="p-2 border-b">Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 && (
          <tr>
            <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="p-4 text-center text-gray-500">
              Sin datos
            </td>
          </tr>
        )}
        {data.map((row, i) => (
          <tr key={i} className="border-b hover:bg-gray-50">
            {columns.map((col) => (
              <td key={col.key} className="p-2">
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
            {actions.length > 0 && (
              <td className="p-2 flex gap-2">
                {actions.map((a, j) => (
                  <Button key={j} size="sm" variant="outline" onClick={() => a.onClick(row)}>
                    {a.label}
                  </Button>
                ))}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
