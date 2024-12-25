const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.get("/convert", async (req, res) => {
  // Obtener la URL del archivo DOCX de los parámetros de la URL
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("URL del archivo no proporcionada.");
  }

  try {
    // Paso 1: Descargar el archivo DOCX desde la URL
    const filePath = path.resolve(__dirname, "temp_file.docx");
    const response = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
    });

    // Guardar el archivo en el sistema local
    fs.writeFileSync(filePath, response.data);
    console.log("Archivo descargado desde la URL...");

     try {
    // Intenta forzar la instalación de Chromium, si no está presente
    await puppeteer.install();
    console.log('Chromium instalado correctamente');
  } catch (error) {
    console.error('No se pudo instalar Chromium automáticamente', error);
  }

  const browser = await puppeteer.launch({
    headless: true, 
    executablePath: puppeteer.executablePath(), // Usa el binario de Chromium descargado
  });
    // Paso 2: Usar Puppeteer para cargar el archivo a Convertio
    const page = await browser.newPage();

    // Navegar a Convertio
    await page.goto("https://convertio.co/docx-html/");

    // Esperar a que el selector de cargar archivo esté disponible
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click(".file-source-button"), // Botón para abrir el explorador de archivos
    ]);

    // Subir el archivo que hemos descargado
    await fileChooser.accept([filePath]);

    console.log("Archivo subido a Convertio...");

    // Paso 3: Esperar a que el botón de conversión esté disponible
    const botones = await page.$$(".btn-xl");
    if (botones.length > 0) {
      await botones[0].click();
      console.log("Iniciando la conversión...");
    } else {
      throw new Error("No se encontró el botón de conversión.");
    }

    // Paso 4: Esperar que el enlace de descarga esté disponible
    await page.waitForSelector(".btn-blue", { visible: true, timeout: 60000 });

    // Obtener el enlace de descarga
    const downloadLink = await page.$eval(".btn-blue", (el) => el.href);
    console.log(`Enlace de descarga: ${downloadLink}`);

    // Descargar el archivo convertido
    const downloadResponse = await axios.get(downloadLink, { responseType: "arraybuffer" });

    // Paso 5: Guardar el archivo convertido
    const outputFilePath = path.resolve(__dirname, "output.html");
    fs.writeFileSync(outputFilePath, downloadResponse.data);
    console.log(`Archivo convertido y guardado: ${outputFilePath}`);

    // Devolver el archivo convertido al cliente
    res.download(outputFilePath, "output.html", (err) => {
      if (err) {
        console.error("Error al enviar el archivo:", err);
        res.status(500).send("Error al enviar el archivo.");
      }
    });

    // Cerrar el navegador
    await browser.close();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error al convertir el archivo.");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});