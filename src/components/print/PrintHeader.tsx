import logo from "./Plip.png";
import { BUSINESS_INFO } from "./businessInfo";

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  reference?: string;
  date?: Date;
}

export default function PrintHeader({ title, subtitle, reference, date = new Date() }: PrintHeaderProps) {
  return (
    <header className="grid grid-cols-3 items-start border-b pb-2">
      <div>
        <img src={logo} alt="Logo PLIPSHOP" className="h-20 object-contain" />
      </div>
      <div className="text-center">
        <p className="text-xs font-bold tracking-wide">{BUSINESS_INFO.name}</p>
        <h1 className="text-base font-bold">{title}</h1>
        {subtitle && <p className="text-xs">{subtitle}</p>}
      </div>
      <div className="text-right text-xs">
        {reference && <p>Nº <strong>{reference}</strong></p>}
        <p>Fecha: <strong>{date.toLocaleDateString("es-AR")}</strong></p>
      </div>
      <div className="col-span-3 mt-2 text-xs text-gray-700">
        <p><strong>Dirección:</strong> {BUSINESS_INFO.address}</p>
        <p><strong>Teléfono:</strong> {BUSINESS_INFO.phone}</p>
        <p><strong>Correo:</strong> {BUSINESS_INFO.email}</p>
        <p><strong>Web:</strong> {BUSINESS_INFO.web}</p>
      </div>
    </header>
  );
}
