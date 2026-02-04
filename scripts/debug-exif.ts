// @ts-nocheck
import ExifReader from 'exifreader';

async function main() {
    const url = 'https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/Canon_40D.jpg';
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    if (!res.ok) {
        console.error('Failed to fetch image');
        return;
    }
    const buffer = await res.arrayBuffer();

    console.log('Parsing EXIF...');
    const tags_exif = ExifReader.load(buffer, { expanded: true });

    // Log keys in root
    console.log('Root keys:', Object.keys(tags_exif));

    // Log keys in 'file'
    if (tags_exif.file) {
        console.log('File group keys:', Object.keys(tags_exif.file));
        if (tags_exif.file.Make) console.log('File Make:', tags_exif.file.Make);
        if (tags_exif.file.Model) console.log('File Model:', tags_exif.file.Model);
    }

    // Log keys in 'exif'
    if (tags_exif.exif) {
        console.log('Exif group keys:', Object.keys(tags_exif.exif));
        if (tags_exif.exif.ExposureTime) console.log('Exif ExposureTime:', tags_exif.exif.ExposureTime);
        if (tags_exif.exif.ShutterSpeedValue) console.log('Exif ShutterSpeedValue:', tags_exif.exif.ShutterSpeedValue);
        if (tags_exif.exif.Make) console.log('Exif Make:', tags_exif.exif.Make);
    } else {
        console.log('No "exif" group found');
    }

    // Check mapping logic
    let cameraMake, cameraModel, shutterSpeed;

    // Current logic check
    if (tags_exif.exif?.Make) {
        cameraMake = String(tags_exif.exif.Make.description || tags_exif.exif.Make.value);
    }

    if (tags_exif.exif?.ExposureTime) {
        shutterSpeed = String(tags_exif.exif.ExposureTime.description || tags_exif.exif.ExposureTime.value);
    }

    console.log('--- Current Logic Result ---');
    console.log('Camera Make:', cameraMake); // likely undefined
    console.log('Shutter Speed:', shutterSpeed);

    // Proposed logic check
    if (tags_exif.file?.Make) {
        cameraMake = String(tags_exif.file.Make.description || tags_exif.file.Make.value);
    }

    console.log('--- Proposed Logic Result ---');
    console.log('Camera Make (from file):', cameraMake);
}

main().catch(console.error);
