const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Cambia a `true` para headless
  const page = await browser.newPage();

  // Navegar al sitio de Convertio
  await page.goto("https://convertio.co/docx-html/");

  // Ruta del archivo local a subir
  const filePath = path.resolve("D:\\downloads\\JJSC_E2EvAp_Lit.docx");

  // Subir el archivo
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click(".file-source-button"), // Botón para abrir el explorador de archivos
  ]);
  await fileChooser.accept([filePath]);

  console.log("Archivo subido...");

  // Esperar a que el botón de conversión esté disponible
  const botones = await page.$$(".btn-xl"); // Lista de botones de acción
  if (botones.length > 0) {
    await botones[0].click();
    console.log("Iniciando conversión...");
  } else {
    console.error("No se encontró el botón de conversión.");
    await browser.close();
    return;
  }

  // Esperar a que la conversión se complete
  await page.waitForSelector(".btn-blue", { visible: true, timeout: 60000 });

  // Obtener el enlace de descarga
  const downloadLink = await page.$eval(".btn-blue", (el) => el.href);
  console.log(`Enlace de descarga: ${downloadLink}`);

  // Descargar el archivo convertido
  const response = await axios.get(downloadLink, { responseType: "arraybuffer" });

  // Guardar el archivo descargado
  const outputFilePath = path.resolve("D:\\downloads\\output.html");
  fs.writeFileSync(outputFilePath, response.data);
  console.log(response.data);
  console.log(`Archivo descargado: ${outputFilePath}`);

  await browser.close();
})();
