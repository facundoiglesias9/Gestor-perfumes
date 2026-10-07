// Quién puede entrar al sistema interno. Ya no hay cuentas de clientes (minoristas/mayoristas):
// los compradores usan el catálogo público y el sistema es solo para administradores.

export function puedeVer(role: string | undefined | null, _pathname?: string): boolean {
    return role === "admin";
}
