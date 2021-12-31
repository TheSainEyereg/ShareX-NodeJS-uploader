const os = require("os");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const express = require("express");

const upload = multer({storage: multer.memoryStorage()});
process.on("unhandledRejection", e => {console.error(e)});
let config, filePath;
let loadConfig = () => {
	if (fs.existsSync("./config.json")) {
		config = {error: "No config file found! Create one like GitHub example."};
	}
	try {
		config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
		filePath = (config.uploadHome ? os.homedir() : ".") + config.uploadDir + "/";
	} catch (e) {
		config = {
			error: "Config file is not valid! Please check your config file.",
			errorDetails: e.message
		}	
	}
	if (config.error) return console.error(config.error+" ("+config.errorDetails+")");
	console.log("Loaded config.json!");
}
loadConfig();

let fsout;
fs.watch("./config.json", (event,fn) => {
	if(!fsout) {
		fsout = 1;
		setTimeout(_=>{
			loadConfig();
			fsout=0;
		}, 100)
	}
});

const app = express();

app.listen(config.port || 5050, e => {
	if (e) {console.error(e); return process.exit(1)};
	console.log("Server started at http://127.0.0.1:" + (config.port || 5050 + "/"));
});
app.use((req, res, next) => {
	res.setHeader("Olejka-Service", "API");
	res.setHeader("Content-Type", "application/json");
	if (config.error) return res.status(500).json(config);
	next();
});

app.get("/", (req,res) => res.setHeader("Content-Type", "application/json").send("ShareX file uploader API"))

app.post("/upload/", upload.single("file"), async (req,res, next) => {
	if (!fs.existsSync(filePath)) fs.mkdirSync(filePath);
	
	if (!req.headers["content-length"]) return res.status(400).json({error: "Content-length header should be specified!"});
	if (parseInt(req.headers["content-length"]) < 53) return res.status(400).json({error: "Content-length is too small!"});

	if (!req.headers["content-type"]?.includes("multipart/form-data")) return res.status(400).json({error: "Invalid content-type! Body not a multipart form-data!"});

	if (!req.body.key) return res.status(401).json({error: "No upload key provided!"});
	if (req.body.key !== config.uploadKey) return res.status(403).json({error: "Wrong upload key!"});

	if (!req.file) return res.status(406).json({error: "No file provided!"});

	const file = req.file;
	const ext= path.extname(file.originalname);
	if (!config.uploadExts.includes(ext.slice(1))) return res.status(415).json({error: "File format is not allowed!"});
	const md5sum = crypto.createHash("md5").update(file.buffer).digest();
	const filename = md5sum.toString("hex").slice(-10)+ext;
	if (!fs.existsSync(filePath+filename)) fs.writeFileSync(filePath+filename, file.buffer);
	const md5stamp = crypto.createHash("md5").update(fs.statSync(filePath+filename).birthtime.getTime().toString()).digest("base64url");
	res.json({
		filename: filename,
		original: file.originalname,
		get: `/get/${filename}`,
		delete: `/delete/${filename}/${md5sum.toString("base64url").slice(5,15)+md5stamp.slice(12,18)}`
	})
}, async (e, req, res, next) => {
	switch (e.toString()) {
		case "Error: Unexpected end of multipart data":
			console.log("Unexpected end of multipart data (wrong Content-Length?)");
			return res.status(400).json({error: "Unexpected end of multipart data (wrong Content-Length?)"});
		default:
			console.log("Unknown error: "+e);
			return res.status(500).json({error: "Unknown server error!"});
	}
});
const mime = require("mime");
app.get("/get/:filename", async (req, res) => {
	const file = filePath + req.params.filename;
	if (!fs.existsSync(file)) return res.sendStatus(404);
	const buffer = fs.readFileSync(file);
	res.set({
		"Content-Type": mime.getType(path.extname(req.params.filename)),
		"Content-Length": buffer.length
	})
	res.send(buffer);
})
app.get("/delete/:filename/:key?", async (req,res) => {
	const file = filePath + req.params.filename;
	if (!fs.existsSync(file)) return res.sendStatus(404);
	const md5sum = crypto.createHash("md5").update(fs.readFileSync(file)).digest("base64url");
	const md5stamp = crypto.createHash("md5").update(fs.statSync(file).birthtime.getTime().toString()).digest("base64url");
	if (req.params.key.slice(0,10) != md5sum.slice(5,15) || req.params.key.slice(-6) != md5stamp.slice(12,18)) return res.status(403).json({error: "Wrong delete key"});
	fs.rmSync(file);
	res.sendStatus(200);
})
