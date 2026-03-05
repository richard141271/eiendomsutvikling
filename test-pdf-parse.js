
const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
console.log('Exports:', Object.keys(pdf));
if (typeof pdf === 'function') {
  console.log('It is a function');
}
try {
  const { PDFParse } = require('pdf-parse');
  console.log('PDFParse export:', PDFParse);
} catch (e) {
  console.log('Error importing PDFParse:', e.message);
}
