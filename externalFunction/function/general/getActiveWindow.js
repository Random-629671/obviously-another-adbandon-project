const log = require('../../../utils/logger.js');
const { Window } = require('node-screenshots');

module.exports = async () => {
    try {
        return Window.all().join(", ");
    } catch (error) {
        log.alert("Cannot get windows list", error);
        return "Cannot get windows list";
    }
}