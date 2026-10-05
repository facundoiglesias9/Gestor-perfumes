// Separa el nombre del producto de la marca (ej: "212 VIP (CAROLINA HERRERA)").
export const extractBrand = (name: string) => {
    if (name.includes('(') && name.includes(')')) {
        const parts = name.split('(');
        return {
            title: parts[0].trim(),
            brand: parts[1].split(')')[0].trim()
        };
    }

    const KNOWN_BRANDS = [
        "CAROLINA HERRERA", "C. HERRERA", "PACO RABANNE", "DIOR", "CHANEL",
        "CALVIN KLEIN", "ARMANI", "GIORGIO ARMANI", "NINA RICCI", "KENZO",
        "VERSACE", "GIVENCHY", "HUGO BOSS", "RALPH LAUREN", "JEAN PAUL GAULTIER",
        "YVES SAINT LAURENT", "YSL", "DOLCE & GABBANA", "ISSEY MIYAKE", "GUERLAIN",
        "BVLGARI", "LANCOME", "THIERRY MUGLER", "MUGLER", "ANTONIO BANDERAS", "CHER",
        "TOM FORD", "VICTORIA SECRET", "VICTORIA'S SECRET", "POLO", "TOMMY HILFIGER",
        "LACOSTE", "MOSCHINO", "BURBERRY", "AZZARO", "GUCCI", "BENSE"
    ];

    const upperName = name.toUpperCase();
    for (const brand of KNOWN_BRANDS) {
        if (upperName.includes(brand)) {
            const regex = new RegExp(`\\s*${brand}\\s*`, "i");
            let title = name.replace(regex, " ").trim();
            if (title.endsWith('-')) title = title.slice(0, -1).trim();
            return { title, brand };
        }
    }

    return { title: name, brand: null };
};
