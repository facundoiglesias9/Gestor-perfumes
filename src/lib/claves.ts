import crypto from "node:crypto";

// Contraseñas guardadas con scrypt: "scrypt$<sal>$<resultado>" (los dos en base64).
// Nunca se guarda la contraseña en sí; para revisarla se repite la cuenta con la misma sal.
// scripts/crear-admin.mjs y scripts/proteger-claves.mjs usan exactamente este formato.

const PREFIJO = "scrypt$";
const LARGO = 64;

function scrypt(clave: string, sal: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) =>
        crypto.scrypt(clave.normalize("NFKC"), sal, LARGO, (err, res) => (err ? reject(err) : resolve(res))),
    );
}

export async function cifrarClave(clave: string): Promise<string> {
    const sal = crypto.randomBytes(16);
    const resultado = await scrypt(clave, sal);
    return `${PREFIJO}${sal.toString("base64")}$${resultado.toString("base64")}`;
}

export const estaCifrada = (guardada: string | null | undefined) => !!guardada && guardada.startsWith(PREFIJO);

// ok: la contraseña es correcta. vieja: estaba guardada sin cifrar (hay que cifrarla).
export async function revisarClave(clave: string, guardada: string | null | undefined): Promise<{ ok: boolean; vieja: boolean }> {
    if (!guardada) return { ok: false, vieja: false };

    if (estaCifrada(guardada)) {
        const [salB64, resultadoB64] = guardada.slice(PREFIJO.length).split("$");
        if (!salB64 || !resultadoB64) return { ok: false, vieja: false };
        const esperado = Buffer.from(resultadoB64, "base64");
        const calculado = await scrypt(clave, Buffer.from(salB64, "base64"));
        return { ok: esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado), vieja: false };
    }

    // Contraseña anterior al cifrado: se compara igual, sin revelar por tiempo cuánto coincide
    const a = crypto.createHash("sha256").update(clave).digest();
    const b = crypto.createHash("sha256").update(guardada).digest();
    return { ok: crypto.timingSafeEqual(a, b), vieja: true };
}
