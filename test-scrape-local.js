const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('test.html', 'utf8');
const $ = cheerio.load(html);

$(".table-products tr").each(function() {
    const cells = $(this).find("td");
    if (cells.length >= 2) {
         console.log($(cells[0]).text().trim(), ":", $(cells[1]).text().trim());
    }
});
