const log = require('../../../utils/logger.js');
const { Monitor } = require('node-screenshots');

module.exports = async () => {
    try {
        const monitors = Monitor.all();
        let imgs = [];
        monitors.forEach((monitor) => {
            const img = monitor.captureImageSync();
            const jpeg = img.toJpegSync();
            const buffer = Buffer.from(jpeg);
            imgs.push(buffer);
        });
        return imgs.map(img => img.toString('base64'));
    } catch (error) {
        log.alert("Error taking screenshot", error);
        return "Failed to get screenshot.";
    }
}