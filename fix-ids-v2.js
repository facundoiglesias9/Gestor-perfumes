const fs = require('fs');
const path = require('path');

const replacements = [
    { file: 'proveedores/page.tsx', list: 'proveedores', prefix: 'P-' },
    { file: 'categorias/page.tsx', list: 'categorias', prefix: 'C-' },
    { file: 'esencias/page.tsx', list: 'esencias', prefix: 'E-' },
    { file: 'insumos/page.tsx', list: 'insumos', prefix: 'I-' },
    { file: 'inventario/page.tsx', list: 'inventario', prefix: 'INV-' },
    { file: 'caja/page.tsx', list: 'transacciones', prefix: 'T-' },
    { file: 'bases/page.tsx', list: 'bases', prefix: 'B-' },
    // pedidos and pedidos-solicitud have carts and transactions, maybe safer manually.
];

replacements.forEach(({ file, list, prefix }) => {
    const filePath = path.join(__dirname, 'src/app/(dashboard)', file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if getNextId is extracted from useAppContext
        if (!content.includes('getNextId')) {
            content = content.replace(/const\s+\{\s*([^{]+)\}\s*=\s*useAppContext\(\);/, (match, group1) => {
                return `const { ${group1.trim()}, getNextId } = useAppContext();`;
            });
        }

        // Replace id generation
        const regex = new RegExp(`id:\\s*\`(${prefix})\\$\\{Date\\.now\\(\\)\\}-\\$\\{Math\\.random\\(\\)\\.toString\\(36\\)\\.substring\\(2,\\s*8\\)\\}\``, 'g');

        content = content.replace(regex, `id: getNextId(${list}, "${prefix}")`);

        // For bases/page.tsx specifically, it has: editingId || \`B-\${Date.now()}...\`
        content = content.replace(
            new RegExp(`id:\\s*editingId\\s*\\|\\|\\s*\`(${prefix})\\$\\{Date\\.now\\(\\)\\}-\\$\\{Math\\.random\\(\\)\\.toString\\(36\\)\\.substring\\(2,\\s*8\\)\\}\``, 'g'),
            `id: editingId || getNextId(${list}, "${prefix}")`
        );

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
