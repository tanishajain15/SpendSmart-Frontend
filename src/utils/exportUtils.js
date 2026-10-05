import * as XLSX from 'xlsx';

export const exportToExcel = (data, fileName = "transactions") => {
    if (!data || data.length === 0) {
        alert("No data to export!");
        return;
    }

    try {
        const worksheeet = XLSX.utils.json_to_sheet(data);
        //CREATE A WORBOOK
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheeet, "Transactions");

        //GENERATE AN EXCEL FILE AND TRIGGER DOWNLOAD
        XLSX.writeFile(workbook, `${fileName}.xlsx`, {
            booktype: 'xlsx',
            type: 'array'
        });
    }

    catch(error) {
        console.error("Export Error: ", error);
        alert("Error in exporting data. Please try again.");
    }
}