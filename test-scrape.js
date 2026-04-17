const cheerio = require('cheerio');

async function testScrape() {
    const url = "https://vanrossum.com.ar/productos/212-carolina-herrera-on-ice-f-x-kg";
    const response = await fetch(url);
    if (!response.ok) {
        console.log("NOT FOUND?", url);
        return;
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    console.log("Prices for 212 CAROLINA HERRERA ON ICE:");
    $(".table-products tr").each(function() {
        const cells = $(this).find("td");
        if (cells.length >= 2) {
            console.log($(cells[0]).text().trim(), ":", $(cells[1]).text().trim());
        }
    });
}
testScrape();
