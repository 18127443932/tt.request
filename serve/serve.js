// 不要在小程序的终端中打开，建议在本机的 iTerm 等终端打开本文件，路径应脱离项目，否则 require 会报错
const express = require("express");
const bodyParser = require("body-parser");
const os = require("os");
const app = express();
const port = 8083;

function getIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "127.0.0.1";
}

// 解析 application/x-www-form-urlencoded 格式的请求体
app.use(bodyParser.urlencoded({ extended: false }));
// 解析 application/json 格式的请求体
app.use(bodyParser.json());

app.listen(port, function () {
    console.log(`服务启动成功， 访问路径：http://${getIPAddress()}:${port}`)
});

app.post('/test', function (req, res) {
    const timeout = 500
    // const timeout = 8000 + Math.random() * 5000
    console.log('收到请求 test, timeout: ', timeout, 'body: ', req.body)
    setTimeout(() => {
        res.send({
            list: ['张三', '李四', '王五', '张三', '李四', '王五'],
            total: 67
        })
    }, timeout);
})

app.post('/login', function (req, res) {
    const timeout = 1000
    // const timeout = 3000 + Math.random() * 5000
    const code = req.body.code
    console.log('收到 login 请求, timeout: ', timeout, 'code: ', code)

    setTimeout(() => {
        res.send({
            token: `${code || ''}`
        })
    }, timeout);
})