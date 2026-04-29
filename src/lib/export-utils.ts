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

export const exportToPDF = async (
    title: string,
    headers: string[],
    rows: any[][],
    filename: string
) => {
    const doc = new jsPDF();

    // Load cover page image (logo) and add Cover Page
    try {
        const logoImg = new Image();
        logoImg.src = "/logo-scenta.png";
        
        const waImg = new Image();
        waImg.src = "/whatsapp.png";

        await Promise.all([
            new Promise((resolve) => { logoImg.onload = resolve; logoImg.onerror = resolve; }),
            new Promise((resolve) => { waImg.onload = resolve; waImg.onerror = resolve; })
        ]);

        // Cover page styling
        doc.setFillColor(255, 255, 255); // white
        doc.rect(0, 0, 210, 297, 'F'); // Fill A4 background

        // Try to draw logo
        if (logoImg.complete && logoImg.naturalWidth > 0) {
            const imgWidth = 120;
            const imgHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * imgWidth;
            doc.addImage(logoImg, 'PNG', (210 - imgWidth) / 2, 40, imgWidth, imgHeight);
        } else {
            doc.setTextColor(15, 23, 42); // slate-900
            doc.setFontSize(40);
            doc.text("SCENTA", 105, 100, { align: 'center' });
        }

        // Title and Info
        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 105, 160, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Actualizado al ${new Date().toLocaleDateString('es-AR')}`, 105, 175, { align: 'center' });

        // WhatsApp Info
        const waText = "+54 9 11 2352-9147";
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getTextWidth(waText);
        const boxWidth = textWidth + 30; // space for icon + padding
        const boxX = (210 - boxWidth) / 2;
        
        // Draw elegant pill
        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200 border
        doc.roundedRect(boxX, 200, boxWidth, 20, 10, 10, 'FD'); // Fill and stroke

        if (waImg.complete && waImg.naturalWidth > 0) {
            doc.addImage(waImg, 'PNG', boxX + 8, 204, 12, 12);
            doc.setTextColor(30, 41, 59); // slate-800
            doc.text(waText, boxX + 24, 213.5, { align: 'left' });
        } else {
            doc.setTextColor(30, 41, 59); // slate-800
            doc.text(waText, 105, 213.5, { align: 'center' });
        }

        doc.addPage();
    } catch (e) {
        console.warn("Cover page generation issue:", e);
    }

    // Replace problematic characters like ° to avoid encoding issues in jsPDF default fonts
    const safeRows = rows.map(row => 
        row.map(cell => 
            typeof cell === 'string' ? cell.replace(/°/g, 'º').replace(/N°/gi, 'Nº') : cell
        )
    );

    // Header section for table page
    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text(title, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 30);

    // Table
    autoTable(doc, {
        startY: 35,
        head: [headers],
        body: safeRows,
        theme: 'grid',
        rowPageBreak: 'avoid',
        margin: { top: 25, bottom: 25 },
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
