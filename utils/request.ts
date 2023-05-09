type Methods = "POST" | "GET" | "OPTIONS" | "PUT" | "HEAD" | "DELETE" | "PATCH"
type ReqConfig = Config & { complete: (value: any) => void }
type Config = {
    url: string,
    method?: Methods,
    data?: Record<string, any> | string | ArrayBuffer,
    header?: Record<string, any>
}

const timeout: number = 10000;      // 请求超时时间
const loginTimeout: number = 5000;  // 登录请求的超时时间
const loginRetryCount = 3;          // 登录接口重试次数（含端上获取 code）
const reqRetryCount = 3;            // 业务请求接口重试次数
const method: Methods = "POST";     // 默认的请求方式
const baseUrl: string = "http://10.71.169.216:8083";    // 这里写上服务地址
const loginUrl: string = "http://10.71.169.216:8083/login";
const statusCodeArr: number[] = [200, 304]; // 正确请求的状态码列表

const globalData = getApp();
const resArr: Array<(value: string) => void> = [];
const reqTaskMap: Record<string, any> = {};

function dealError(err: any): void {
    console.error(err);
    tt.showToast({
        title: "登录失败",
        icon: "fail",
        duration: 1500,
    });
    // 可以做一些埋点操作
    // ...
    throw new Error(err);
}
function login(retryCount = loginRetryCount): Promise<false | string> {
    return new Promise((resolve) => {
        tt.login({
            force: true,
            success: (res) => {
                tt.showToast({
                    title: "登录中",
                    icon: "loading",
                    duration: loginTimeout,
                });
                // 与服务端进行登录， code 换取 token
                tt.request({
                    url: loginUrl,
                    method: "POST",
                    // 将抖开的 code 传入 data
                    data: {
                        code: res.code,
                    },
                    timeout: loginTimeout,
                    success: (res: any) => {
                        if (res?.statusCode !== 200) {
                            dealError(res)
                            resolve(false);
                        } else {
                            const { token } = res.data;
                            tt.showToast({
                                title: "登录成功",
                                icon: "success",
                                duration: 1500,
                            });
                            // 将 token 设置在 globalData 中
                            globalData.token = token;
                            resolve(token);
                        }
                    },
                    fail: (err) => {
                        if (retryCount < 0) {
                            dealError(err);
                            resolve(false);
                        } else if (err.errNo === 21103) {
                            login(--retryCount).then((res) => {
                                resolve(res);
                            });
                        } else {
                            dealError(err);
                            resolve(false);
                        }
                    },
                });
            },
            fail: () => {
                if (retryCount <= 0) {
                    tt.showToast({
                        title: "登录失败，请检查你的网络",
                        icon: "none",
                    });
                    resolve(false);
                } else {
                    setTimeout(() => {
                        login(--retryCount).then((res) => {
                            resolve(res);
                        });
                    }, 500);
                }
            },
        });
    });
}

function getToken(): Promise<false | string> {
    return new Promise((resolve) => {
        const { token } = globalData;
        if (token) {
            resolve(token);
        } else {
            resArr.push(resolve);
            resArr?.length === 1 && login().then((res) => {
                while (res && resArr.length) {
                    resArr.shift()?.(res);
                }
            });
        }
    });
}

async function createRequest(
    config: ReqConfig,
    timeoutRetryCount = reqRetryCount
) {
    const { url: action } = config; // 请求前做一些事情
    const key = JSON.stringify({ // 判断请求相同情况，key 值构成
        url: action,
        data: config.data,
    });

    config.url = `${baseUrl}${config.url ? ('/' + config.url) : ''}`;
    config.header = {
        "Access-Token": await getToken(),
    };
    
    if (timeoutRetryCount <= 0) {
        tt.showToast({
            title: "请求超时",
            icon: "fail",
        });
        config.complete(false);
        delete reqTaskMap[key];
        return
    }
    const reqTask = tt.request({
        timeout,
        method,
        ...config,
        complete: (res) => {
            const { data, statusCode, errNo } = res;

            if (errNo === 21103) {
                // 请求超时，重试
                createRequest({ ...config, url: action }, --timeoutRetryCount);
            } else if (!statusCodeArr.includes(statusCode as number)) {
                // 请求失败, 做一些事情
                config.complete(false);
                delete reqTaskMap[key];
            } else {
                // 请求成功，你可以在此之前对 res 做一些事情
                config.complete(res);
                delete reqTaskMap[key];
            }
        },
    });
    reqTaskMap[key]?.abort();
    reqTaskMap[key] = reqTask;
}

export function request(config: Config): Promise<any> {
    return new Promise(resolve => {
        createRequest({
        ...config,
        complete: resolve,
      })
    })
}