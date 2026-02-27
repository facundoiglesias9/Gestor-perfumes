import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const FEMALE_BASE_URL = "https://vanrossum.com.ar/productos/00021";
const MALE_BASE_URL = "https://vanrossum.com.ar/productos/00022";
const UNISEX_BASE_URL = "https://vanrossum.com.ar/productos/00024";

async function scrapeProductPrices(url: string) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        let price30g: number | "consultar" = "consultar";
        let price100g: number | "consultar" = "consultar";

        $(".table-products tr").each((_, row) => {
            const cells = $(row).find("td");
            if (cells.length >= 2) {
                const presentation = $(cells[0]).text().toLowerCase();
                const priceText = $(cells[1]).text().trim();

                const is30g = presentation.includes("30") && presentation.includes("gramos");
                const is100g = presentation.includes("100") && presentation.includes("gramos");

                if (is30g || is100g) {
                    let priceValue: number | "consultar" = "consultar";
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
        console.error(`Error scraping ${url}:`, error);
        return { price30g: "consultar", price100g: "consultar" };
    }
}

async function getProductsFromCategory(baseUrl: string, gender: "Femenino" | "Masculino" | "Unisex", maxPages: number) {
    const products: any[] = [];

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

                    products.push({
                        id: `VR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        name: name,
                        category: "Perfumería Fina",
                        gender: gender,
                        provider: "Van Rossum",
                        cost: typeof prices.price30g === "number" ? prices.price30g : 0,
                        qty: 0,
                        price30g: prices.price30g,
                        price100g: prices.price100g,
                        lastUpdate: new Date().toLocaleDateString()
                    });
                }
            }
        } catch (error) {
            console.error(`Error scraping page ${page} of ${gender}:`, error);
        }
    }
    return products;
}

export async function GET() {
    try {
        const femaleProducts = await getProductsFromCategory(FEMALE_BASE_URL, "Femenino", 9);
        const maleProducts = await getProductsFromCategory(MALE_BASE_URL, "Masculino", 6);
        const unisexProducts = await getProductsFromCategory(UNISEX_BASE_URL, "Unisex", 3);

        const allProducts = [...femaleProducts, ...maleProducts, ...unisexProducts];

        return NextResponse.json({ success: true, esencias: allProducts });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
