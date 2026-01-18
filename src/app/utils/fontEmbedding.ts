/**
 * Font Embedding for PDF Generation
 * 
 * This module provides CSS with embedded Google Fonts for reliable PDF rendering.
 * Google Fonts links are unreliable in headless browsers/PDF generators.
 */

const fs = require("fs");
const path = require("path");

/**
 * Returns CSS with @font-face rules using Google Fonts CDN
 * with proper font-display and preload hints for Puppeteer
 */
export const getSignatureFontCSS = (): string => {
  // Try to embed fonts from local files (recommended). If not present, fall back to system fonts.
  // Place files at: <repoRoot>/public/fonts/
  // Example filenames:
  // - dancing-script.woff2
  // - allura.woff2
  // - alex-brush.woff2
  // - kalam.woff2
  // - pacifico.woff2
  const tryReadFontBase64 = (fileName: string): string | null => {
    try {
      const abs = path.join(process.cwd(), "public", "fonts", fileName);
      if (!fs.existsSync(abs)) return null;
      const buf = fs.readFileSync(abs);
      return buf.toString("base64");
    } catch {
      return null;
    }
  };

  const fontFaces: string[] = [];

  const addFontFace = (family: string, fileName: string, weight: string = "400", style: string = "normal") => {
    const b64 = tryReadFontBase64(fileName);
    if (!b64) return;
    fontFaces.push(`
      @font-face {
        font-family: '${family}';
        src: url(data:font/woff2;base64,${b64}) format('woff2');
        font-weight: ${weight};
        font-style: ${style};
      }
    `);
  };

  // Embed the signature fonts if present
  addFontFace("Dancing Script", "dancing-script.woff2", "400", "normal");
  addFontFace("Allura", "allura.woff2", "400", "normal");
  addFontFace("Alex Brush", "alex-brush.woff2", "400", "normal");
  addFontFace("Kalam", "kalam.woff2", "400", "normal");
  addFontFace("Pacifico", "pacifico.woff2", "400", "normal");
  addFontFace("Great Vibes", "great-vibes.woff2", "400", "normal");
  addFontFace("Sacramento", "sacramento.woff2", "400", "normal");
  addFontFace("Satisfy", "satisfy.woff2", "400", "normal");
  addFontFace("Courgette", "courgette.woff2", "400", "normal");

  const hasEmbeddedFonts = fontFaces.length > 0;

  return `
    <style>
      /* Embedded fonts (if present in /public/fonts). */
      ${fontFaces.join("\n")}

      /* Fallback for environments without local font files.
         NOTE: remote fonts are less reliable for true embedding, but this prevents
         default font fallback and keeps UI functional until local fonts are added. */
      ${hasEmbeddedFonts ? "" : "@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Kalam:wght@400;700&family=Pacifico&family=Great+Vibes&family=Allura&family=Sacramento&family=Alex+Brush&family=Satisfy&family=Courgette&display=swap');"}
      
      /* Signature style classes - these map to frontend TEXT_STYLES */
      .signature-dancing {
        font-family: 'Dancing Script', cursive !important;
        font-weight: 400;
      }
      
      .signature-great-vibes {
        font-family: 'Great Vibes', cursive !important;
        font-weight: 400;
      }
      
      .signature-pacifico {
        font-family: 'Pacifico', cursive !important;
        font-weight: 400;
      }
      
      .signature-satisfy {
        font-family: 'Satisfy', cursive !important;
        font-weight: 400;
      }
      
      .signature-kalam {
        font-family: 'Kalam', cursive !important;
        font-weight: 400;
      }
      
      .signature-allura {
        font-family: 'Allura', cursive !important;
        font-weight: 400;
      }
      
      .signature-alex-brush {
        font-family: 'Alex Brush', cursive !important;
        font-weight: 400;
      }
      
      .signature-courgette {
        font-family: 'Courgette', cursive !important;
        font-weight: 400;
      }
      
      .signature-sacramento {
        font-family: 'Sacramento', cursive !important;
        font-weight: 400;
      }
      
      .signature-brush-script {
        font-family: 'Brush Script MT', cursive !important;
        font-weight: 400;
      }
      
      .signature-formal {
        font-family: 'Times New Roman', serif !important;
        font-weight: 400;
      }
      
      .signature-modern {
        font-family: 'Helvetica', 'Arial', sans-serif !important;
        font-weight: 400;
      }
      
      .signature-handwritten {
        font-family: 'Kalam', cursive !important;
        font-weight: 400;
      }
      
      .signature-stylish {
        font-family: 'Allura', cursive !important;
        font-weight: 400;
      }
      
      .signature-fancy {
        font-family: 'Alex Brush', cursive !important;
        font-weight: 400;
      }
      
      /* Ensure fonts are rendered properly in PDF */
      * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      /* PDF page-break handling - keep signatures together */
      .signature-section,
      .signatures-container {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* Make signatures show in a row when possible (HTML + PDF) */
      .signatures-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        flex-wrap: nowrap;
      }

      .signature-box {
        flex: 1 1 0;
        min-width: 0;
        text-align: center;
      }

      /* When we wrap an existing sender-only block inside a signature box,
         neutralize its outer spacing so it fits side-by-side. */
      .signature-box .signature-section {
        margin-top: 0 !important;
        padding: 0 !important;
        border-top: 0 !important;
      }
      
      /* If signatures would break, move entire block to new page */
      @media print {
        .signature-section,
        .signatures-container {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: auto;
        }

        /* Force side-by-side in PDFs */
        .signatures-row {
          flex-wrap: nowrap !important;
        }
      }
    </style>
  `;
};

/**
 * Wraps HTML content with font CSS for PDF generation
 * This ensures fonts are loaded before PDF rendering
 */
export const wrapHtmlWithFonts = (htmlContent: string): string => {
  const fontCSS = getSignatureFontCSS();
  
  // Check if HTML already has <html> tag
  if (htmlContent.trim().toLowerCase().startsWith('<!doctype') || 
      htmlContent.trim().toLowerCase().startsWith('<html')) {
    // Insert font CSS after <head> tag or create one
    if (htmlContent.includes('<head>')) {
      return htmlContent.replace('<head>', `<head>\n${fontCSS}`);
    } else if (htmlContent.includes('<html>')) {
      return htmlContent.replace('<html>', `<html>\n<head>\n${fontCSS}\n</head>`);
    }
    return htmlContent;
  }
  
  // Wrap in full HTML structure
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${fontCSS}
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;
};

/**
 * Map of signature style values to CSS class names
 * This should match the frontend TEXT_STYLES array
 */
export const SIGNATURE_STYLE_TO_CLASS: Record<string, string> = {
  'dancing': 'signature-dancing',
  'great-vibes': 'signature-great-vibes',
  'pacifico': 'signature-pacifico',
  'satisfy': 'signature-satisfy',
  'kalam': 'signature-kalam',
  'allura': 'signature-allura',
  'alex-brush': 'signature-alex-brush',
  'courgette': 'signature-courgette',
  'sacramento': 'signature-sacramento',
  'brush-script': 'signature-brush-script',
  'formal': 'signature-formal',
  'modern': 'signature-modern',
  'handwritten': 'signature-handwritten',
  'stylish': 'signature-stylish',
  'fancy': 'signature-fancy',
};
