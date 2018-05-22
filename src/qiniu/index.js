// 七牛小程序SDK
// https://github.com/gpake/qiniu-wxapp-sdk/
// created by gpake
(function () {

    let config = {
        qiniuRegion: '',
        qiniuImageURLPrefix: '',
        qiniuUploadToken: '',
        qiniuUploadTokenURL: '',
        qiniuUploadTokenFunction: null,
        qiniuShouldUseQiniuFileName: false
    }

    module.exports = {
        init: init,
        upload: upload,
    }

    // 在整个程序生命周期中，只需要 init 一次即可
    // 如果需要变更参数，再调用 init 即可
    function init(options) {
        config = {
            qiniuRegion: '',
            qiniuImageURLPrefix: '',
            qiniuUploadToken: '',
            qiniuUploadTokenURL: '',
            qiniuUploadTokenFunction: null,
            qiniuShouldUseQiniuFileName: false
        };
        updateConfigWithOptions(options);
    }

    function updateConfigWithOptions(options) {
        if (options.region) {
            config.qiniuRegion = options.region;
        } else {
            console.error('qiniu uploader need your bucket region');
        }
        if (options.uptoken) {
            config.qiniuUploadToken = options.uptoken;
        } else if (options.uptokenURL) {
            config.qiniuUploadTokenURL = options.uptokenURL;
        } else if (options.uptokenFunc) {
            config.qiniuUploadTokenFunction = options.uptokenFunc;
        }
        if (options.domain) {
            config.qiniuImageURLPrefix = options.domain;
        }
        config.qiniuShouldUseQiniuFileName = options.shouldUseQiniuFileName
    }

    function upload(filePath, success, fail, options, progress, cancelTask) {
        if (null == filePath) {
            console.error('qiniu uploader need filePath to upload');
            return;
        }
        if (options) {
            updateConfigWithOptions(options);
        }
        if (config.qiniuUploadToken) {
            doUpload(filePath, success, fail, options, progress, cancelTask);
        } else if (config.qiniuUploadTokenURL) {
            getQiniuToken(function () {
                doUpload(filePath, success, fail, options, progress, cancelTask);
            });
        } else if (config.qiniuUploadTokenFunction) {
            config.qiniuUploadToken = config.qiniuUploadTokenFunction();
            if (null == config.qiniuUploadToken && config.qiniuUploadToken.length > 0) {
                console.error('qiniu UploadTokenFunction result is null, please check the return value');
                return
            }
            doUpload(filePath, success, fail, options, progress, cancelTask);
        } else {
            console.error('qiniu uploader need one of [uptoken, uptokenURL, uptokenFunc]');
            return;
        }
    }

    function doUpload(filePath, success, fail, options, progress, cancelTask) {
        if (null == config.qiniuUploadToken && config.qiniuUploadToken.length > 0) {
            console.error('qiniu UploadToken is null, please check the init config or networking');
            return
        }
        const url = uploadURLFromRegionCode(config.qiniuRegion);
        let fileName = filePath.split('//')[1];
        if (options && options.key) {
            fileName = options.key;
        }
        const formData = {
            'token': config.qiniuUploadToken
        };
        if (!config.qiniuShouldUseQiniuFileName) {
            formData['key'] = fileName
        }
        let uploadTask = wx.uploadFile({
            url,
            filePath,
            formData,
            name: 'file',
            success: function (res) {
                let dataString = res.data
                if (res.data.hasOwnProperty('type') && res.data.type === 'Buffer') {
                    dataString = String.fromCharCode.apply(null, res.data.data)
                }
                try {
                    const data = JSON.parse(dataString);
                    if (success) {
                        success(data);
                    }
                } catch (e) {
                    console.error('parse JSON failed, origin String is: ' + dataString)
                    if (fail) {
                        fail(e);
                    }
                }
            },
            fail: function (err) {
                console.error(err);
                if (fail) {
                    fail(err);
                }
            }
        })

        uploadTask.onProgressUpdate((res) => {
            progress && progress(res)
        })

        cancelTask && cancelTask(() => {
            uploadTask.abort()
        })
    }

    function getQiniuToken(callback) {
        wx.request({
            url: config.qiniuUploadTokenURL,
            success: function (res) {
                let token = res.data.uptoken;
                if (token && token.length > 0) {
                    config.qiniuUploadToken = token;
                    if (callback) {
                        callback();
                    }
                } else {
                    console.error('qiniuUploader cannot get your token, please check the uptokenURL or server')
                }
            },
            fail: function (error) {
                console.error('qiniu UploadToken is null, please check the init config or networking: ' + error);
            }
        })
    }

    function uploadURLFromRegionCode(code) {
        let uploadURL = null;
        switch (code) {
            case 'ECN': uploadURL = 'https://up.qbox.me'; break;
            case 'NCN': uploadURL = 'https://up-z1.qbox.me'; break;
            case 'SCN': uploadURL = 'https://up-z2.qbox.me'; break;
            case 'NA': uploadURL = 'https://up-na0.qbox.me'; break;
            case 'ASG': uploadURL = 'https://up-as0.qbox.me'; break;
            default: console.error('please make the region is with one of [ECN, SCN, NCN, NA, ASG]');
        }
        return uploadURL;
    }

})();