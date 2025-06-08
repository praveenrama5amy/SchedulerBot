const hwid = require(`node-hwid`)
hwid({
    hash: true, // hash id output (sha256), if false - module will return original id
}).then(id =>
    console.log(id) // HWID here
)