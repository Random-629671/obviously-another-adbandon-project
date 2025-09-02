module.exports = [
{
    name: "getScreenshot",
    group: "screenshot",
    description: "Take a full screenshot of all active monitor.",
    parameters: null, //if no param, just leave it null
    returnType: "image", //return data type
    returnMethod: "inline" //where to put return data, inline mean use inline part, prompt mean put in text prompt, file mean use file api (if possible, need read other api docs)
},
{
    name: "getScreenshotPart", //this (obviously) is function name, but also file name
    group: "screenshot", //if some function have similar uses/mechanic, they will be put in same folder, this define the folder name
    description: "Take a part of screenshot on an active monitor.", //the rest field name explain itself, obviously
    parameters: {
        properties: {
            xStart: {
                type: "NUMBER",
                description: "Start of the horizontal X-axis in percent"
            },
            yStart: {
                type: "NUMBER",
                description: "Start of the vertical Y-axis in percent"
            },
            xEnd: {
                type: "NUMBER",
                description: "End of the horizontal X-axis in percent"
            },
            yEnd: {
                type: "NUMBER",
                description: "End of the vertical Y-axis in percent"
            },
            desktop: {
                type: "NUMBER",
                description: "The active monitor need to take screenshot. If blank, capture primary display",
                enum: [1, 2]
            }
        },
        required: ["xStart", "yStart", "xEnd", "yEnd"],
        call: "xStart, yStart, xEnd, yEnd, desktop" //example how the param fill in real function as example.
        // E.g. this function: getScreenshotPart(xStart, yStart, xEnd, yEnd, desktop)
        // not add the () in this plz
        // i am the only one accessing this but, yea, my brain almost forgotted
    },
    returnType: "image",
    returnMethod: "inline"
},
{
    name: "getActiveWindow",
    group: "general",
    description: "Get an array of all active windows running along with process name.",
    parameters: null,
    returnType: "text",
    returnMethod: "prompt"
}
];