const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const imgDir = 'c:\\Users\\GFG\\Desktop\\GeeksforGeeks\\Petrol-Pump-Rush\\public\\images';

async function extractSprite(filename, names) {
  const filepath = path.join(imgDir, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`${filepath} does not exist.`);
    return;
  }
  
  const metadata = await sharp(filepath).metadata();
  const width = metadata.width;
  const height = metadata.height;
  const sliceWidth = Math.floor(width / names.length);
  
  for (let i = 0; i < names.length; i++) {
    const sliceName = names[i];
    await sharp(filepath)
      .extract({ left: i * sliceWidth, top: 0, width: sliceWidth, height: height })
      .toFile(path.join(imgDir, sliceName));
    console.log(`Saved ${sliceName}`);
  }
}

async function main() {
  await extractSprite('cars.png', ['car_blue.png', 'car_yellow.png', 'car_truck.png']);
  await extractSprite('pumps.png', ['pump_petrol.png', 'pump_diesel.png', 'pump_cng.png']);
  await extractSprite('worker.png', ['worker_idle.png', 'worker_walk_1.png', 'worker_walk_2.png']);
}

main().catch(console.error);
