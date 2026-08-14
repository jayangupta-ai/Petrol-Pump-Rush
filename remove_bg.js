const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imgDir = 'c:\\Users\\GFG\\Desktop\\GeeksforGeeks\\Petrol-Pump-Rush\\public\\images';

async function removeBackground(filename) {
  const filepath = path.join(imgDir, filename);
  if (!fs.existsSync(filepath)) return;
  
  try {
    const { data, info } = await sharp(filepath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Read top-left pixel to determine the background color to remove
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];

    const tolerance = 10;
    let transparentCount = 0;

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (Math.abs(r - bgR) <= tolerance && Math.abs(g - bgG) <= tolerance && Math.abs(b - bgB) <= tolerance) {
        data[i + 3] = 0; // Set alpha to 0
        transparentCount++;
      }
    }

    if (transparentCount > 0) {
      await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels
        }
      })
      .png()
      .toFile(filepath);
      console.log(`Removed background for ${filename}`);
    } else {
      console.log(`No background removed for ${filename}`);
    }
  } catch (err) {
    console.error(`Error processing ${filename}: ${err}`);
  }
}

async function main() {
  const files = [
    'car_blue.png', 'car_yellow.png', 'car_truck.png',
    'pump_petrol.png', 'pump_diesel.png', 'pump_cng.png',
    'worker_idle.png', 'worker_walk_1.png', 'worker_walk_2.png',
  ];
  for (const file of files) {
    await removeBackground(file);
  }
}

main().catch(console.error);
