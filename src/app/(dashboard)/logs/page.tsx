import { redirect } from "next/navigation";

// La vieja página de logs se reemplazó por el agente de Logs (en /agentes), que revisa los mismos
// registros y además busca errores repetidos. Quien entre a /logs llega directo a él.
export default function LogsPage() {
    redirect("/agentes?agente=logs");
}
