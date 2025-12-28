import * as XLSX from 'xlsx';

export interface ExcelRow {
    [key: string]: unknown;
}

export interface ExcelData {
    headers: string[];
    rows: ExcelRow[];
}

/**
 * Parses a Dutch date string (dd-mm-yyyy) into a standard Date object.
 * Returns null if parsing fails.
 */
export const parseDutchDate = (dateString: string): Date | null => {
    if (!dateString || typeof dateString !== 'string') return null;

    // Handle dd-mm-yyyy or dd/mm/yyyy
    const parts = dateString.split(/[-/]/);
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    const date = new Date(year, month, day);

    // Validate that the date is correct (e.g., 31-02-2023 should be invalid)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
    }

    return date;
};

export const parseExcel = async (file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                // Assume the first sheet is the one we want
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Parse with specific header option to get raw data first
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (jsonData.length === 0) {
                    resolve({ headers: [], rows: [] });
                    return;
                }

                const headers = jsonData[0] as string[];
                // Remove header row and filter empty rows
                const rawRows = jsonData.slice(1).filter((row: unknown) => Array.isArray(row) && row.length > 0) as unknown[][];

                // Map back to object structure
                const rows = rawRows.map((row: unknown[], rowIndex: number) => {
                    const rowData: ExcelRow = { _id: rowIndex.toString() }; // Internal ID
                    headers.forEach((header, index) => {
                        // Keep distinct keys even if headers are duplicate (though ideally headers are unique)
                        rowData[header] = row[index];
                    });
                    return rowData;
                });

                resolve({ headers, rows });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};
