import * as XLSX from 'xlsx';

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const escapeCsvValue = (value: unknown) => {
  const text = String(value ?? '');
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const downloadCsv = (
  rows: Array<Record<string, unknown>>,
  fileName: string,
  delimiter = ';'
) => {
  if (rows.length === 0) {
    return;
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [
    headers.join(delimiter),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(delimiter))
  ].join('\n');

  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), fileName);
};

export const downloadWorkbook = (
  sheets: Array<{ name: string; rows: Array<Record<string, unknown>> }>,
  fileName: string
) => {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  });
  const arrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });
  triggerDownload(
    new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }),
    fileName
  );
};

