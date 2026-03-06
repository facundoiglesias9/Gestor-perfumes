import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const exportToPDF = (
    title: string,
    headers: string[],
    rows: any[][],
    filename: string
) => {
    const doc = new jsPDF();

    // Header section
    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text(title, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

    // Table
    autoTable(doc, {
        startY: 35,
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 41, 55], // Gray-800
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 10,
            cellPadding: 4,
            valign: 'middle'
        },
        columnStyles: {
            0: { fontStyle: 'bold' }, // Producto
            3: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] } // Precio
        }
    });

    doc.save(`${filename}.pdf`);
};
