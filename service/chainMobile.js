// mobile env
const { manifestPlatformOptions } = require('@dcloudio/vue-cli-plugin-uni/lib/env');
const {
    assetsDir,
} = require('./lib/copy-webpack-options');

module.exports = function registerMobile(api, options, vusionConfig) {
    // const type = ['app-plus', 'h5'].includes(process.env.UNI_PLATFORM)
    // ? process.env.UNI_PLATFORM
    // : 'mp'

    const type = 'h5'; // 目前只支持h5

    const platformOptions = require('@dcloudio/vue-cli-plugin-uni/lib/' + type);

    const vueConfig = platformOptions.vueConfig;

    if (options.pages) {
    // h5平台 允许 vue.config.js pages 覆盖，其他平台移除 pages 配置
        if (process.env.UNI_PLATFORM === 'h5') {
            delete vueConfig.pages;
        } else {
            delete options.pages;
        }
    }

    Object.assign(options, { // TODO 考虑非 HBuilderX 运行时，可以支持自定义输出目录
        outputDir: process.env.UNI_OUTPUT_TMP_DIR || process.env.UNI_OUTPUT_DIR,
        assetsDir,
    }, vueConfig); // 注意，此处目前是覆盖关系，后续考虑改为webpack merge逻辑

    require('@dcloudio/vue-cli-plugin-uni/lib/options')(options);

    api.configureWebpack(require('@dcloudio/vue-cli-plugin-uni/lib/configure-webpack')(platformOptions, manifestPlatformOptions, options, api));
    api.chainWebpack(require('@dcloudio/vue-cli-plugin-uni/lib/chain-webpack')(platformOptions, options, api));

    global.uniPlugin.configureWebpack.forEach((configureWebpack) => {
        api.configureWebpack((webpackConfig) => configureWebpack(webpackConfig, options));
    });
    global.uniPlugin.chainWebpack.forEach((chainWebpack) => {
        api.chainWebpack((webpackConfig) => chainWebpack(webpackConfig, options));
    });
};
