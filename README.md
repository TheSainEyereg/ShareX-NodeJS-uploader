# ShareX NodeJS uploader
 File uploader for ShareX writed in NodeJS

---

### How to use: 
```sh
git clone https://github.com/TheSainEyereg/ShareX-NodeJS-uploader.git
cd ShareX-NodeJS-uploader
npm i && node index
```
### `Config.json` example:
```json
{
    "port": 5050,
    "uploadKey": "1337",
    "uploadExts": ["png", "jpg", "bmp", "ico", "gif", "rar", "zip", "7z", "mp4", "avi", "mp3", "wav", "txt", "h", "cpp", "java", "cs", "lua", "html", "css", "js", "exe", "dll"],
    "uploadDir": "/uploads",
    "uploadHome": false
}
```
Flag `uploadHome` enables home dir as start point. Example:  
**With flag:** `/home/ubuntu/uploads`  
**Without flag:** `/home/ubuntu/NodeProjects/ShareX-NodeJS-uploader/uploads`  
