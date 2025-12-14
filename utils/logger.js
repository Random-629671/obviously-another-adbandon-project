const fs = require("fs");
const path = require("path");
//const chalk = require("chalk");

const startDate = new Date();
const formattedDate = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, "0")}-${startDate.getDate().toString().padStart(2, "0")}`;
const formattedTime = `${startDate.getHours().toString().padStart(2, "0")}-${startDate.getMinutes().toString().padStart(2, "0")}-${startDate.getSeconds().toString().padStart(2, "0")}`;
const logDir = path.join(__dirname, '..', 'data', 'logs');
fs.mkdirSync(logDir, { recursive: true });
const logFileName = path.join(logDir, `logs_${formattedDate}_${formattedTime}.log`);

let sendLogToUI = null;

function info(title, data) {
    logging(title, data, 1, "INFO");
}

function warn(title, data) {
    logging(title, data, 1, "WARN");
}

function alert(title, data) {
    logging(title, data, 1, "ALRT");
}

function logging(title, data, color, type) {
    let dataFormatted;

    switch (true) {
        case data instanceof Error:
            dataFormatted = `${data.stack}`;
            break;
        case data instanceof Map:
            dataFormatted = JSON.stringify(Array.from(data.entries()), null, 2);
            break;
        case typeof data === 'function':
            dataFormatted = `[Function: ${data.name || 'anonymous'}]`;
            break;
        case typeof data === 'string':
            dataFormatted = data;
            break;
        default:
            try {
                dataFormatted = JSON.stringify(data, null, 2);
            } catch (e) {
                dataFormatted = `[Unserializable Object: ${e.message}]`;
            }
            break;
    }

    const titlePart = (title !== null && title !== undefined) ? title : "Data below";
    const logMessageLine = `[${new Date().toLocaleTimeString()}] ${type} | ${titlePart}`;
    //const logMessageLineColored = `[${new Date().toLocaleTimeString()}] ${type} | ${color(titlePart)}`;
    const invalid = ["", null, undefined, "null", "undefined"];
    const logMsg = logMessageLine + (!invalid.includes(dataFormatted) ? "\nData: " + dataFormatted : "");
    //const logMsgColored = logMessageLineColored + ((dataFormatted != '' || null) ? "\n" : ' >> ') + dataFormatted + "\n";

    fs.appendFile(logFileName, logMsg + "\n", (err) => {
        if (err) {
            console.log("Error writing log:");
            console.error(err);
        }
    });

    console.log(logMsg);

    if (sendLogToUI) sendLogToUI(logMsg + "\n");

    //delete old log file
    try {
        fs.readdir("./data/logs", (err, files) => {
            const logFiles = files
                .filter((file) => file.endsWith(".log"))
                .map((file) => {
                    const fullPath = path.join("./data/logs", file);
                    try {
                        const stats = fs.statSync(fullPath);
                        return {
                            name: file,
                            time: stats.mtime.getTime(),
                        };
                    } catch (err) {
                        return null;
                    }
                })
                .filter(Boolean)
                .sort((a, b) => a.time - b.time);

            if (logFiles.length > 10) {
                logFiles
                    .slice(0, logFiles.length - 10)
                    .forEach((file) =>
                        fs.unlink(path.join("./data/logs", file.name), (err) => { }),
                    );
            }
        });
    } catch (e) {
        console.log("Error deleting old log:");
        console.error(e);
    }
}

module.exports = {
    info,
    warn,
    alert,
    initLogger: (uiSender) => { sendLogToUI = uiSender; },
    getLogFilePath: () => logFileName
};