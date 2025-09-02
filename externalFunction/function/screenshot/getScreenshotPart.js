const { Window, Monitor } = require('node-screenshots');
const log = require('../../../utils/logger.js');

module.exports = async (xStart, yStart, xEnd, yEnd, desktop) => {
    const monitors = Monitor.all();
    let target = null;
    if (desktop) target = monitors[desktop];
    const height = target.height;
    const width = target.width;

    xStart *= width;
    yStart *= height;
    xEnd *= width;
    yEnd *= height;

    if ((xStart < 0 || xEnd < 0 || yStart < 0 || yEnd < 0) ||
        (xStart > xEnd || yStart > yEnd)) {
            log.alert("Invalid coordinates");
            return "Invalid coordinates";
        }
    
    try {
        target.captureImageSync().then((img) => {
            const cropped = img.cropSync(xStart, yStart, xEnd, yEnd);
            const raw = cropped.toPngSync(true);
            const buffer = Buffer.from(raw);
            return buffer.toString('base64');
        });
    } catch (error) {
        log.alert("Screenshot failed", error);
        return "Failed to take screenshot";
    }
}