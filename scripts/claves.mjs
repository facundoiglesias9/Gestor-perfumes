// Cifrado de contraseñas para los scripts de la terminal.
// Mismo formato que src/lib/claves.ts ("scrypt$<sal>$<resultado>"): si se cambia uno, cambiar el otro.

import crypto from "node:crypto";

const PREFIJO = "scrypt$";

export const estaCifrada = (guardada) => typeof guardada === "string" && guardada.startsWith(PREFIJO);

export function cifrarClave(clave) {
    const sal = crypto.randomBytes(16);
    const resultado = crypto.scryptSync(clave.normalize("NFKC"), sal, 64);
    return `${PREFIJO}${sal.toString("base64")}$${resultado.toString("base64")}`;
}
