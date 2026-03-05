
const pdfParse = require('pdf-parse');
console.log(typeof pdfParse);
try {
  const { PDFParse } = require('pdf-parse');
  console.log('Named export PDFParse:', typeof PDFParse);
} catch (e) {
  console.log('No named export PDFParse');
}
