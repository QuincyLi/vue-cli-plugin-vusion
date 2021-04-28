const chainDoc = require('./chainDoc');
const chainMobile = require('./chainMobile');

module.exports = function registerDoc(api, vueConfig, vusionConfig) {
    const serveCommand = api.service.commands.serve;

    api.registerCommand('doc', {
        description: 'Run documentation server',
        usage: 'vue-cli-service doc',
        options: serveCommand.opts.options,
    }, (args) => {
        chainDoc(api, vueConfig, vusionConfig);
        chainMobile(api, vueConfig, vusionConfig);
        return serveCommand.fn(args);
    });
};
