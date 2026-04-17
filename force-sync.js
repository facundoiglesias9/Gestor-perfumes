require('dotenv').config({path: '.env.local'});
const postgres = require('postgres');
const cheerio = require('cheerio');
const sql = postgres(process.env.DATABASE_URL);

// Base URLs
const FEMALE_BASE_URL = "https://vanrossum.com.ar/productos/00021";
const MALE_BASE_URL = "https://vanrossum.com.ar/productos/00022";
const UNISEX_BASE_URL = "https://vanrossum.com.ar/productos/00024";

async function scrapeProductPrices(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        let price30g = "consultar";
        let price100g = "consultar";

        $(".table-products tr").each((_, row) => {
            const cells = $(row).find("td");
            if (cells.length >= 2) {
                const presentation = $(cells[0]).text().toLowerCase();
                const priceText = $(cells[1]).text().trim();

                const is30g = presentation.includes("30") && presentation.includes("gramos");
                const is100g = presentation.includes("100") && presentation.includes("gramos");

                if (is30g || is100g) {
                    let priceValue = "consultar";
                    if (!priceText.toLowerCase().includes("consultar")) {
                        const sanitized = priceText.replace("$", "").replace(/\./g, "").replace(",", ".").trim();
                        priceValue = parseFloat(sanitized);
                    }
                    if (is30g) price30g = priceValue;
                    if (is100g) price100g = priceValue;
                }
            }
        });
        return { price30g, price100g };
    } catch (error) {
        return { price30g: "consultar", price100g: "consultar" };
    }
}

async function getProductsFromCategory(baseUrl, gender, maxPages) {
    const products = [];
    for (let page = 1; page <= maxPages; page++) {
        try {
            const url = `${baseUrl}?page=${page}`;
            const response = await fetch(url);
            const html = await response.text();
            const $ = cheerio.load(html);

            const items = $(".product-item-name");
            if (items.length === 0) break;

            for (const item of items.toArray()) {
                const name = $(item).text().trim();
                const relativeUrl = $(item).attr("href");
                if (relativeUrl) {
                    const fullUrl = relativeUrl.startsWith("http") ? relativeUrl : `https://vanrossum.com.ar${relativeUrl}`;
                    const prices = await scrapeProductPrices(fullUrl);
                    const deterministicId = `VR-${name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
                    
                    products.push({
                        id: deterministicId,
                        name: name,
                        category: "Perfumería Fina",
                        gender: gender,
                        provider: "Van Rossum",
                        cost: typeof prices.price30g === "number" ? prices.price30g : 0,
                        qty: 0,
                        price30g: prices.price30g === "consultar" ? null : prices.price30g,
                        price100g: prices.price100g === "consultar" ? null : prices.price100g,
                        price250g: null,
                        price100g_usd: null,
                        price250g_usd: null,
                        last_update: new Date().toLocaleDateString(),
                        source: "scraped"
                    });
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
    return products;
}

async function forceSync() {
    console.log("Fetching existing DB esencias...");
    const dbEsencias = await sql`SELECT * FROM esencias`;

    const normalize = (name) => name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const existingMap = new Map();
    dbEsencias.forEach((e) => {
        const key = `${normalize(e.name)}_${(e.gender || "U").toUpperCase()}`;
        existingMap.set(key, e);
    });

    console.log("Scraping vanrossum.com.ar...");
    const female = await getProductsFromCategory(FEMALE_BASE_URL, "Femenino", 9);
    console.log(`Scraped Female: ${female.length}`);
    const male = await getProductsFromCategory(MALE_BASE_URL, "Masculino", 6);
    console.log(`Scraped Male: ${male.length}`);
    const unisex = await getProductsFromCategory(UNISEX_BASE_URL, "Unisex", 3);
    console.log(`Scraped Unisex: ${unisex.length}`);

    const allScraped = [...female, ...male, ...unisex];
    
    // Merge
    const toUpsert = [];
    for (const scraped of allScraped) {
        const key = `${normalize(scraped.name)}_${(scraped.gender || "U").toUpperCase()}`;
        const existing = existingMap.get(key);

        if (existing) {
            toUpsert.push({
                id: existing.id, // preserve existing pk
                name: scraped.name,
                category: existing.category || "Perfumería Fina",
                gender: scraped.gender,
                provider: existing.provider || "Van Rossum",
                cost: typeof scraped.price30g === "number" ? String(scraped.price30g) : String(existing.cost || 0),
                qty: existing.qty || 0,
                price30g: scraped.price30g !== null ? String(scraped.price30g) : existing.price30g,
                price100g: scraped.price100g !== null ? String(scraped.price100g) : existing.price100g,
                price250g: existing.price250g,
                price100g_usd: existing.price100g_usd,
                price250g_usd: existing.price250g_usd,
                last_update: new Date().toLocaleDateString(),
                source: "scraped"
            });
        } else {
            toUpsert.push({
                id: scraped.id,
                name: scraped.name,
                category: "Perfumería Fina",
                gender: scraped.gender,
                provider: "Van Rossum",
                cost: typeof scraped.price30g === "number" ? String(scraped.price30g) : "0",
                qty: 0,
                price30g: scraped.price30g !== null ? String(scraped.price30g) : null,
                price100g: scraped.price100g !== null ? String(scraped.price100g) : null,
                price250g: null,
                price100g_usd: null,
                price250g_usd: null,
                last_update: new Date().toLocaleDateString(),
                source: "scraped"
            });
        }
    }

    console.log(`Upserting ${toUpsert.length} records to Postgres!`);
    const tableName = "esencias";
    const columns = Object.keys(toUpsert[0]);
    const updateColumns = columns.filter(c => c !== 'id');
    const setClause = updateColumns.map(col => `"${col}" = EXCLUDED."${col}"`).join(', ');

    for (let i = 0; i < toUpsert.length; i += 50) {
        const chunk = toUpsert.slice(i, i + 50);
        try {
            await sql`
              INSERT INTO ${sql(tableName)} ${sql(chunk)}
              ON CONFLICT (id) DO UPDATE SET
                ${sql.unsafe(setClause)}
            `;
        } catch(e) {
            console.error(`Chunk error:`, e.message || e);
        }
    }
    console.log("DONE");
    process.exit(0);
}

forceSync();
