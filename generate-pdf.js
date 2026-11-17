const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    const filePath = path.resolve(__dirname, 'report.html');
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0', timeout: 30000 });
    
    await page.pdf({
        path: 'SnipLink_SE_Mini_Project_Report.pdf',
        format: 'A4',
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
        printBackground: true
    });
    
    await browser.close();
    console.log('PDF generated successfully: SnipLink_SE_Mini_Project_Report.pdf');
})();
