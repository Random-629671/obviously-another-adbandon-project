const tempFunc = {
    name: "seriousFunction",
    description: "this is a very serious and critical function need to be call",
    parameters: {
        type: "OBJECT",
        properties: {
            callThis: {
                type: "BOOLEAN",
                description: "if true, will call this function"
            },
            otherParam: {
                type: "NUMBER",
                description: "another parameter need to fill"
            }
        },
        required: ["callThis", "otherParam"]
    },
    response: {
        type: "OBJECT",
        properties: {
            type: "BOOLEAN",
            description: "the result of this serious function"
        }
    }
}

let functionList = [];

functionList.push(tempFunc);

module.exports = functionList;