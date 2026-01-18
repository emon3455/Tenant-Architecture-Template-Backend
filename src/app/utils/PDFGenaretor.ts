import { chromePath } from "../config/config";
import { production } from "../constant/constant";
import { wrapHtmlWithFonts } from "./fontEmbedding";

const fs = require("fs");
const path = require("path");
const puppeteer = production ? require("puppeteer-core") : require("puppeteer");

async function generatePDF(htmlContent: string, filename: string, pathName: string = "../../../documents/PDFs") {
  const invoicesDirectory = path.join(__dirname, pathName);
  if (!fs.existsSync(invoicesDirectory)) {
    fs.mkdirSync(invoicesDirectory, { recursive: true });
  }

  const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, "") + ".pdf";
  const filePath = path.join(invoicesDirectory, sanitizedFilename);

  // Wrap HTML with font embedding CSS for proper PDF rendering
  const htmlWithFonts = wrapHtmlWithFonts(htmlContent);

  const launchOptions: any = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  };

  // In development, let puppeteer use its bundled Chromium.
  // In production (puppeteer-core), executablePath is required.
  if (production) {
    if (!chromePath) {
      throw new Error("chromePath is not configured for production PDF generation");
    }
    launchOptions.executablePath = chromePath;
  }

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  
  // Set viewport for consistent rendering
  await page.setViewport({ width: 1200, height: 800 });
  
  await page.goto("about:blank", { waitUntil: "domcontentloaded" });
  // Avoid networkidle0 here; remote fonts/resources can keep the network busy and cause timeouts.
  await page.setContent(htmlWithFonts, { waitUntil: "domcontentloaded", timeout: 60000 });
  
  // Wait for fonts to settle (loaded or failed) without blocking on remote requests.
  try {
    await page.evaluateHandle("document.fonts && document.fonts.ready");
  } catch (e) {
    // Ignore if Font Loading API isn't available
  }

  // Small delay for layout stabilization
  await new Promise((resolve) => setTimeout(resolve, 150));

  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", bottom: "5mm", left: "5mm", right: "5mm" },
    preferCSSPageSize: false,
  });

  await browser.close();
  console.log("PDF generated:", sanitizedFilename);
  return sanitizedFilename;
}

export { generatePDF };