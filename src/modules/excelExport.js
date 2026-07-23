/**
 * Excel Export Module — client-side XML spreadsheet download.
 */

const ExcelExportModule = {
  name: 'ExcelExport',

  methods: {
    async ExcelExportAsync(grid, properties) {
      const { escapeXml } = grid.helpers;
      const cols = grid._orderedCols().filter(c => c.field && c.type !== 'checkbox');

      const header = cols.map(c =>
        '<Cell><Data ss:Type="String">' + escapeXml(c.headerText || c.field || '') + '</Data></Cell>'
      ).join('');

      // Export all data (not just current page)
      const allData = grid._dataSource || [];
      const rows = allData.map(row =>
        '<Row>' + cols.map(c =>
          '<Cell><Data ss:Type="String">' + escapeXml(String(row[c.field] || '')) + '</Data></Cell>'
        ).join('') + '</Row>'
      ).join('');

      const xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>' +
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
        '<Worksheet ss:Name="Grid Data"><Table><Row>' + header + '</Row>' + rows + '</Table></Worksheet></Workbook>';

      const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ((properties && properties.fileName) || 'export') + '.xls';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    async PdfExportAsync() {
      // Stub — server-side implementation
    },
  },
};

export default ExcelExportModule;
export { ExcelExportModule };
