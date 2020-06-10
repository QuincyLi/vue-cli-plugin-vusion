const fs = require('fs');
const path = require('path');
const HTMLPlugin = require('html-webpack-plugin');
const autoLoaderPath = require.resolve('../scenes/designer/loaders/auto-loader');

function readAndWriteFile(filePath, newRelativePath = '', handler) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = handler(content);
    const newPath = path.resolve(filePath, newRelativePath);
    fs.writeFileSync(newPath, content, 'utf8');
    return newPath;
}

module.exports = function registerDesigner(api, vueConfig, vusionConfig, args) {
    if (args._[0] === 'designer') {
        process.env.DESIGNER = true;
        vueConfig.devServer.open = false;
    }

    const serveCommand = api.service.commands.serve;

    api.registerCommand('designer', {
        description: 'Run designer server for vusion-vscode',
        usage: 'vue-cli-service designer',
        options: serveCommand.opts.options,
    }, (args) => {
        process.env.NODE_ENV = 'development';

        vueConfig.devServer = vueConfig.devServer || {};
        vueConfig.devServer.port = 12800;
        vueConfig.runtimeCompiler = true;
        vueConfig.productionSourceMap = false;

        api.chainWebpack((config) => {
            const entryPath = require.resolve('../scenes/designer/views/index.js');
            const entryKeys = Object.keys(config.entryPoints.entries());
            entryKeys.forEach((key) => config.entry(key).add(entryPath));

            // config.devtool('eval');

            // config.module.rule('designer-config')
            //     .test(/vue-cli-plugin-vusion[\\/]scenes[\\/]designer[\\/]views[\\/]empty\.js$/)
            //     .use('auto-loader')
            //     .loader(autoLoaderPath)
            //     .options(vusionConfig);

            //     const defineOptions = {
            //         type: vusionConfig.type,
            //         DOCS_PATH: fs.existsSync(docsPath) ? JSON.stringify(docsPath) : undefined,
            //         DOCS_COMPONENTS_PATH: fs.existsSync(docsComponentsPath) ? JSON.stringify(docsComponentsPath) : undefined,
            //         DOCS_VIEWS_PATH: fs.existsSync(docsViewsPath) ? JSON.stringify(docsViewsPath) : undefined,
            //         DOCS_IMPORTS_PATH: fs.existsSync(docsImportsPath) ? JSON.stringify(docsImportsPath) : undefined,
            //     };

            // 很多 loader 与 Plugin 有结合，所以 thread-loader 不能开启
            config.module.rule('js').uses.delete('thread-loader');
            // dev 和 designer server 同时跑好像会有问题
            config.module.rule('js').uses.delete('cache-loader');
            config.module.rule('vue').uses.delete('cache-loader');

            config.module.rule('vue').use('vue-loader').tap((options) => {
                // options.compiler = require('../scenes/designer/fork/build');
                options.compilerOptions.plugins = [require('../scenes/designer/transform').compilerPlugin];
                return options;
            });

            const vueTemplateCompilerPath = require.resolve('vue-template-compiler');
            const vueTemplateCompilerBrowserPath = path.resolve(vueTemplateCompilerPath, '../browser.js');
            const vueTemplateCompilerBuildPath = path.resolve(vueTemplateCompilerPath, '../build.js');
            readAndWriteFile(vueTemplateCompilerBrowserPath, '', (content) => content
                .replace(/(ast = parse\(template\.trim\(\), options\);)\s+(if|optimize)/g, `$1
                    (options.plugins || []).forEach((plugin) => plugin(ast, options, exports));
                $2`)
                .replace('exports.compile = compile;\n  exports.compileToFunctions', 'exports.compile = compile;\n  exports.generate = generate;\n  exports.compileToFunctions')
                .replace('exports.ssrCompile = compile$1;\n  exports.ssrCompileToFunctions', 'exports.ssrCompile = compile$1;\n  exports.ssrGenerate = generate$1;\n  exports.ssrCompileToFunctions'));
            // .replace('// _scopedId\n', `  if (el.nodePath) {
            //     segments.push({ type: RAW, value: ' vusion-node-path="' + el.nodePath + '"' });
            // }\n`));

            readAndWriteFile(vueTemplateCompilerBuildPath, '', (content) => content
                .replace(/(ast = parse\(template\.trim\(\), options\);)\s+(if|optimize)/g, `$1
                (options.plugins || []).forEach((plugin) => plugin(ast, options, exports));\n$2`)
                .replace('exports.compile = compile;\nexports.compileToFunctions', 'exports.compile = compile;\nexports.generate = generate;\nexports.compileToFunctions')
                .replace('exports.ssrCompile = compile$1;\nexports.ssrCompileToFunctions', 'exports.ssrCompile = compile$1;\nexports.ssrGenerate = generate$1;\nexports.ssrCompileToFunctions'));
            // .replace(/(if \(options\) \{)(\s+if \(process)/, `$1
            // if (options.filename) {
            //     if (!options.filename.endsWith('.vue'))
            //         options.filename = require('path').dirname(options.filename);
            //     if (options.filename.endsWith('.vue')) {
            //         const vusion = require('vusion-api');
            //         options.vueFile = new vusion.VueFile(options.filename);
            //     }
            // }
            // $2`));
            //             .replace('// _scopedId\n', `  if (el.nodePath) {
            //     segments.push({ type: RAW, value: ' vusion-node-path="' + el.nodePath + '"' });
            // }\n`));

            //             const vueComponentCompilerUtilsPath = require.resolve('@vue/component-compiler-utils');
            //             const compileTemplatePath = path.resolve(vueComponentCompilerUtilsPath, '../compileTemplate.js');
            //             readAndWriteFile(compileTemplatePath, '', (content) => content
            //                 // .replace(/\+ `var staticRenderFns/g, ' + (process.env.DESIGNER ? `var ast = ""\n` : "")$0')
            //                 // .replace('(render|staticRenderFns)', '(render|ast|staticRenderFns)')
            //                 .replace(/(var __staticRenderFns__.+);/g, `$1 +
            // (process.env.DESIGNER ? "staticRenderFns.source = \`" + source.replace(/\\\\/g, '\\\\\\\\').replace(/\`/g, "\\\`") + "\`\\n" : '');
            //             `));

            const vueLoaderPath = require.resolve('vue-loader');
            // const templateLoaderPath = path.resolve(vueLoaderPath, '../loaders/templateLoader.js');
            // readAndWriteFile(templateLoaderPath, '', (content) => content
            //     .replace('scopeId: query.scoped ? `data-v-${id}` : null,\n    comments', 'scopeId: query.scoped ? `data-v-${id}` : null,\n'
            //     + `  filename: require('path').relative(loaderContext.rootContext, this.resourcePath),`
            //     + '\n    comments'));
            //     .replace('scopeId: query.scoped ? `data-v-${id}` : null,', 'scopeId: `data-v-${id}`,\n  filename: this.resourcePath,'));

            readAndWriteFile(vueLoaderPath, '', (content) => content
                .replace('const hasScoped = descriptor.styles.some(s => s.scoped)', 'const hasScoped = true')
                .replace(/(if \(needsHotReload\) \{)\s+(code \+=)/, `
    $1
    if (process.env.DESIGNER && !resourcePath.includes('node_modules')) {
        code += \`\\ncomponent.options.__source = \${JSON.stringify(source)}\`
        code += \`\\ncomponent.options.__template = \${JSON.stringify(descriptor.template && descriptor.template.content)}\`
        code += \`\\ncomponent.options.__script = \${JSON.stringify(descriptor.script && descriptor.script.content)}\`
        code += \`\\ncomponent.options.__style = \${JSON.stringify(descriptor.styles[0] && descriptor.styles[0].content)}\`
    }
    $2`));

            // console.log(config.toString());
            // process.exit(0);
        //     config.plugin('define-docs')
        //         .use(webpack.DefinePlugin, [defineOptions]);
        });
        return serveCommand.fn(args);
    });
};
