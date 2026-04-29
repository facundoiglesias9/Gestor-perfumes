const Jimp = require('jimp');
const path = require('path');

async function removeCheckerboard() {
  try {
    const inputPath = 'C:/Users/facundo/Downloads/Gemini_Generated_Image_r4xf3vr4xf3vr4xf.png';
    const outputPath = 'C:/Users/facundo/Downloads/Lineas_Doradas_SIN_FONDO.png';

    console.log('Cargando imagen...');
    const image = await Jimp.read(inputPath);
    
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    console.log(`Procesando ${width}x${height} píxeles...`);

    image.scan(0, 0, width, height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // Lógica de detección:
      // El fondo de cuadraditos es Gris (R~G~B ~200) o Blanco (R~G~B ~255)
      // El dorado tiene mucho más Rojo y Verde que Azul (R > G > B)
      
      const isNeutral = Math.abs(r - g) < 25 && Math.abs(r - b) < 25 && Math.abs(g - b) < 25;
      const isVeryLight = r > 180 && g > 180 && b > 180;

      if (isNeutral || isVeryLight) {
        // Es fondo, lo hacemos 100% transparente
        this.bitmap.data[idx + 3] = 0;
      } else {
        // Es línea dorada, nos aseguramos que sea 100% opaca
        this.bitmap.data[idx + 3] = 255;
      }
    });

    console.log('Guardando resultado final...');
    await image.writeAsync(outputPath);
    console.log('¡Éxito! Imagen guardada en Descargas como Lineas_Doradas_SIN_FONDO.png');
  } catch (err) {
    console.error('Error procesando la imagen:', err);
  }
}

removeCheckerboard();
