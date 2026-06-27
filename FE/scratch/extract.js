const fs = require('fs');
const path = require('path');

const xmlPath = path.join(__dirname, 'extracted_docx', 'word', 'document.xml');
const xml = fs.readFileSync(xmlPath, 'utf8');

// Simple regex to match <w:t> tags and extract their content
const matches = xml.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
if (matches) {
  const texts = matches.map(m => {
    const content = m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
    return content;
  });
  
  // Output in chunks or lines
  fs.writeFileSync(path.join(__dirname, 'extracted_text.txt'), texts.join(' | '));
  console.log('Extracted', texts.length, 'text nodes.');
} else {
  console.log('No text nodes found.');
}
