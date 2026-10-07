import { redirect } from "next/navigation";

// Ya no hay cuentas de clientes: quien quiera comprar usa el catálogo público.
// (La pantalla de registro anterior queda en el historial de git.)
export default function RegistrarsePage() {
    redirect("/catalogo");
}
