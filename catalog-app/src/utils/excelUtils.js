import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const downloadCustomerTemplate = () => {
  const headers = [
    ['שם עסק (חובה)', 'שם איש קשר', 'אימייל', 'טלפון', 'כתובת']
  ];
  
  const wb = XLSX.utils.book_new();
  
  // Set RTL for the workbook
  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.Views) wb.Workbook.Views = [];
  wb.Workbook.Views[0] = { RTL: true };

  const ws = XLSX.utils.aoa_to_sheet(headers);
  
  // Set the sheet to RTL
  ws['!views'] = [{ RTL: true }];
  
  // Set all cells to text format (@)
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
      if (!ws[cell_ref]) continue;
      ws[cell_ref].z = '@'; // Force text format
      ws[cell_ref].t = 's'; // Ensure type is string
    }
  }
  
  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Business Name
    { wch: 20 }, // Contact Name
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 40 }  // Address
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'תבנית לקוחות');
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'customer_template.xlsx');
};

export const parseCustomerExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Map Hebrew headers to keys
        const mappedData = jsonData.map(row => ({
          business_name: row['שם עסק (חובה)'] || row['שם עסק'],
          contact_name: row['שם איש קשר'],
          email: row['אימייל'],
          phone: row['טלפון'],
          address: row['כתובת']
        })).filter(row => row.business_name); // Filter out rows without business name
        
        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
