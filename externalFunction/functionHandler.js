const path = require('path');
const log = require('../utils/logger.js');
const functionList = require('./functionEntry.js');

// A simple cache for function modules
let functionModuleCache = {}, callback = null;

async function exec(name, args) {
    const funcDef = functionList.find(f => f.name === name);
    if (!funcDef) {
        log.warn(`Function '${name}' not found in functionEntry.js`);
        return `Function '${name}' not found.`;
    }

    try {
        const modulePath = path.join(__dirname, 'function', funcDef.group, funcDef.name + '.js');
        if (!functionModuleCache[modulePath]) {
            functionModuleCache[modulePath] = require(modulePath);
        }
        
        const func = functionModuleCache[modulePath];

        if (typeof func !== 'function') {
            log.warn(`Module for '${name}' at '${modulePath}' did not export a function.`);
            return `Function '${name}' could not be executed (module error).`;
        }

        let finalArgs = [];
        if (funcDef.parameters) {
            if (typeof args != 'string' || !args) {
                log.alert(`Obviously something wrong because args will never being not in string`);
                return 'Something wrong, very wrong';
            }

            if (!args || args.length <= 0) {
                log.alert('The args is empty');
                return 'The args is dropped somewhere';
            }

            try {
                finalArgs = JSON.parse(args);
                if (!Array.isArray(finalArgs)) {
                    log.alert('Parsed args is empty array');
                    return 'Parsed args is empty array';
                }
            } catch (error) {
                log.alert('Error parsing args', error);
                return 'Error parsing args';
            }
        }

        log.info(`Executing function '${name}' with args:`, args);
        // Using spread syntax to pass array elements as arguments to the function
        const result = await func(...args);
        const returnThis = {
            message: `Function '${name}' with args '${args}' executed successfully.`,
            datatype: funcDef.returnType,
            method: funcDef.returnMethod,
            inline: funcDef.returnMethod == "inline" ? result : null,
            result: result
        };
        callback(returnThis, true);
    } catch (error) {
        log.alert(`Error executing function '${name}'`, error);
        const errMsg = `An error occurred while executing function '${name}'.`;
        return { message: errMsg };
    }
}

function sendMessageCallback(handlercallback) {
    callback = handlercallback;
}

module.exports = {
    exec,
    sendMessageCallback
};