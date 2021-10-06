const fs = require("fs");
const express = require("express");
process.on("unhandledRejection", e => {console.error(e)});
let config = require("./config.json"); // let cuz it should update in realtime

let fsout;
fs.watch("./config.json", (event,fn) => {
    if(!fsout) {
        fsout = 1;
        setTimeout(_=>{
            console.log("Updated config.json!")
            delete require.cache[require.resolve("./config.json")];
            config = require("./config.json");
            fsout=0
        }, 100)
    }
});

const app = express();

app.listen(config.port, e => {
    if (e) {console.error(e); return process.exit(1)}
    console.log("Server started at http://127.0.0.1:"+config.port);
});

app.get("/", (req,res) => res.send("ShareX file uploader API"))

/*   ~~~   FILES   ~~~   */
const os = require("os");
const filedir = (config.uploadHome ? os.homedir() : ".") + config.uploadDir + "/";
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const upload = multer({storage: multer.memoryStorage()});
app.post("/upload/", upload.single("file") ,async (req,res) => {
    if (!fs.existsSync(filedir)) fs.mkdirSync(filedir);
    if (!req.body.key) return res.status(401).json({error: "No upload key provided!"});
    if (req.body.key !== config.uploadKey) return res.status(403).json({error: "Wrong upload key!"});
    if (!req.file) return res.status(406).json({error: "Invalid form data!"});
    const file = req.file;
    const ext= path.extname(file.originalname);
    if (!config.uploadExts.includes(ext.slice(1))) return res.status(406).json({error: "File format is not allowed!"});
    const md5sum = crypto.createHash("md5").update(file.buffer).digest("hex");
    const filename = md5sum.slice(-8)+ext;
    if (!fs.existsSync(filedir+filename)) fs.writeFileSync(filedir+filename, file.buffer);
    const md5stamp = crypto.createHash("md5").update(fs.statSync(filedir+filename).birthtime.getTime().toString()).digest("hex");
    res.json({
        filename: filename,
        original: file.originalname,
        get: `/get/${filename}`,
        delete: `/delete/${filename}/${md5sum.slice(15,21)}_${md5stamp.slice(18,26)}`
    })
})
const mime = require("mime");
app.get("/get/:filename", async (req, res) => {
    const file = filedir + req.params.filename;
    if (!fs.existsSync(file)) return res.sendStatus(404);
    const buffer = fs.readFileSync(file);
    res.set({
        "Content-Type": mime.getType(path.extname(req.params.filename)),
        "Content-Length": buffer.length
    })
    res.send(buffer);
})
app.get("/delete/:filename/:key?", async (req,res) => {
    const file = filedir + req.params.filename;
    if (!fs.existsSync(file)) return res.sendStatus(404);
    const md5sum = crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex");
    const md5stamp = crypto.createHash("md5").update(fs.statSync(file).birthtime.getTime().toString()).digest("hex");
    if (req.params.key !== `${md5sum.slice(15,21)}_${md5stamp.slice(18,26)}`) return res.status(403).json({error: "Wrong delete key"});
    fs.rmSync(file);
    res.json({
        filename: req.params.filename
    })
})
