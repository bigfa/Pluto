// @ts-nocheck
import ExifReader from 'exifreader';

// Copy of the helper function for verification
function safeGet(exif: any, tags: string[], groups: string[] = ['exif', 'file', 'ifd0']): string | undefined {
    if (!exif) return undefined;

    for (const group of groups) {
        if (exif[group]) {
            for (const tag of tags) {
                if (exif[group][tag]) {
                    const node = exif[group][tag];
                    // Prefer description if available and safe, otherwise value
                    if (node.description && typeof node.description === 'string') return node.description;
                    if (node.value) {
                        // Handle array values (e.g. [1, 160] for shutter speed sometimes)
                        if (Array.isArray(node.value)) return String(node.value[0]);
                        return String(node.value);
                    }
                }
            }
        }
    }
    return undefined;
}

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

    console.log('--- Verification Results ---');
    console.log('Camera Make:', safeGet(tags_exif, ['Make'], ['ifd0', 'file', 'exif']));
    console.log('Camera Model:', safeGet(tags_exif, ['Model'], ['ifd0', 'file', 'exif']));
    console.log('Shutter Speed:', safeGet(tags_exif, ['ExposureTime', 'ShutterSpeedValue'], ['exif']));
    console.log('Aperture:', safeGet(tags_exif, ['FNumber', 'ApertureValue'], ['exif']));
    console.log('ISO:', safeGet(tags_exif, ['ISOSpeedRatings', 'ISO'], ['exif']));
}

main().catch(console.error);
