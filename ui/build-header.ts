import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath: string = path.join(__dirname, 'dist', 'index.html');
const outputPath: string = path.join(__dirname, '..', 'src', 'internal', 'provision_html.h');

try {
    const htmlContent: string = fs.readFileSync(htmlPath, 'utf8');

    const headerContent: string = `#ifndef PROVISION_HTML_H
#define PROVISION_HTML_H

#include <Arduino.h>

// Automatisch generiert von Svelte 5 / Tailwind v4 - Bitte nicht manuell bearbeiten!
static constexpr const char index_html[] PROGMEM = R"rawliteral(
${htmlContent}
)rawliteral";

#endif // PROVISION_HTML_H
`;

    fs.writeFileSync(outputPath, headerContent);
    console.log('✅ provision_html.h erfolgreich kompiliert!');

} catch (error) {
    console.error('❌ Fehler beim Generieren:', error);
    process.exit(1);
}