import * as ExcelJS from 'exceljs';

export const exportToExcel = async (data: any[], filename: string, title?: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lista de Precios');

    // Title row
    if (title) {
        const titleRow = worksheet.addRow([title]);
        titleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        titleRow.alignment = { horizontal: 'center' };
        worksheet.mergeCells(`A1:${String.fromCharCode(64 + Object.keys(data[0] || {}).length)}1`);
        titleRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' }, // Indigo-600
        };
    }

    // Header row
    const headers = Object.keys(data[0] || {});
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F2937' }, // Gray-800
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
    });

    // Data rows
    data.forEach((item) => {
        const row = worksheet.addRow(Object.values(item));
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
            // Format price column as currency if it contains numbers/money symbols
            if (typeof cell.value === 'string' && cell.value.includes('$')) {
                cell.font = { bold: true, color: { argb: 'FF059669' } }; // Emerald-600
            }
        });
    });

    // Column widths
    worksheet.columns.forEach((col) => {
        col.width = 25;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xlsx`;
    link.click();
};

export const exportMultiSheetExcel = async (sheets: { sheetName: string; title?: string; data: any[] }[], filename: string) => {
    const workbook = new ExcelJS.Workbook();

    sheets.forEach(({ sheetName, title, data }) => {
        if (!data || data.length === 0) return;
        const worksheet = workbook.addWorksheet(sheetName.substring(0, 31)); // Nombres de hoja max 31 chars

        // Title row
        if (title) {
            const titleRow = worksheet.addRow([title]);
            titleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
            titleRow.alignment = { horizontal: 'center' };
            const colCount = Object.keys(data[0] || {}).length;
            if (colCount > 0) {
                // Determine excel column letter (A, B, C... Z, AA, AB)
                const getColLetter = (num: number) => {
                    let temp, letter = '';
                    while (num > 0) {
                        temp = (num - 1) % 26;
                        letter = String.fromCharCode(temp + 65) + letter;
                        num = (num - temp - 1) / 26;
                    }
                    return letter;
                };
                worksheet.mergeCells(`A1:${getColLetter(colCount)}1`);
            }
            titleRow.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4F46E5' }, // Indigo-600
            };
        }

        // Header row
        const headers = Object.keys(data[0] || {});
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1F2937' }, // Gray-800
            };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Data rows
        data.forEach((item) => {
            const row = worksheet.addRow(Object.values(item));
            row.eachCell((cell) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                if (typeof cell.value === 'string' && cell.value.includes('$')) {
                    cell.font = { bold: true, color: { argb: 'FF059669' } }; // Emerald-600
                }
            });
        });

        // Column widths
        worksheet.columns.forEach((col) => {
            col.width = 20;
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xlsx`;
    link.click();
};
