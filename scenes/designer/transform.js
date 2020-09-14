const TemplateHandler = require('vusion-api/out/fs/TemplateHandler').default;

const getClassName = function (styleStr) {
    if (/^\$style\[['"](.*)['"]\]$/g.test(styleStr)) {
        const classNameVarName = /^\$style\[['"](.*)['"]\]$/g.exec(styleStr);
        if (classNameVarName)
            return classNameVarName[1];
    } else if (/^\$style./g.test(styleStr)) {
        const classNameVarName = styleStr.split('.')[1];
        if (classNameVarName)
            return classNameVarName;
    }
    return undefined;
};

const getClassNames = function (styleStr) {
    if (/^\[(.*)\]$/g.test(styleStr)) {
        let styles = /^\[(.*)\]$/g.exec(styleStr);
        if (styles && styles[1]) {
            styles = styles[1].split(',');
            styles = styles.map((item) => getClassName(item.trim()));
            return styles;
        }
    } else {
        const styles = getClassName(styleStr);
        if (styles)
            return [styles];
        return [];
    }
};

/**
 * 该方法可以在两端(node, browser)运行
 */
exports.compilerPlugin = function compilerPlugin(ast, options, compiler) {
    const traverse = TemplateHandler.prototype.traverse;
    traverse.call({ ast }, (info) => {
        const el = info.node;
        el.nodePath = info.route;
        if (el.type !== 1) {
            return;

            // el.type = 1;
            // el.tag = 'd-text';
            // el.attrsList = [];
            // el.attrsMap = {};
            // el.attrs = [];
            // el.rawAttrsMap = {};
            // el.children = [];
        }

        if (!el.attrs)
            el.attrs = [];

        // 没有特别好的方法，scopeId 是 vue.runtime 实现的，vusion-node-path 目前只能通过添加属性解决
        if (!el.attrsMap.hasOwnProperty('vusion-node-path') && !el.attrsMap.hasOwnProperty(':vusion-node-path')) {
            el.attrsList.push({ name: 'vusion-node-path', value: info.route });
            el.attrsMap['vusion-node-path'] = info.route;
            const attr = { name: 'vusion-node-path', value: JSON.stringify(info.route) };
            el.attrs.push(attr);
            el.rawAttrsMap['vusion-node-path'] = attr;
            // 为了添加属性，只能全部开启 false
            el.plain = false;
        }

        // 改成直接实例化页面，:class需要转换成class
        if (el.attrsMap[':class'] && options.cssSuffix) {
            let classNames = getClassNames(el.classBinding);
            if (classNames.length) {
                classNames = classNames.map((item) => `${item}_${options.cssSuffix}`);
                let classValue = classNames.join(' ');
                if (el.attrsMap.class) {
                    classValue = el.attrsMap.class + ' ' + classValue;
                }
                el.attrsList.push({ name: 'class', value: classValue });
                el.attrsMap.class = classValue;
                const attr = { name: 'class', value: JSON.stringify(classValue) };
                el.attrs.push(attr);
                el.rawAttrsMap.class = attr;
                delete el.attrsMap[':class'];
                delete el.classBinding;
                delete el.rawAttrsMap[':class'];
            }
        }
        // 打包之后
        // if (!el.attrsMap.hasOwnProperty('vusion-scope-id') && !el.attrsMap.hasOwnProperty(':vusion-scope-id')) {
        //     const shortScopeId = options.scopeId.replace(/^data-v-/, '');
        //     el.attrsList.push({ name: 'vusion-scope-id', value: shortScopeId });
        //     el.attrsMap['vusion-scope-id'] = shortScopeId;
        //     const attr = { name: 'vusion-scope-id', value: JSON.stringify(shortScopeId) };
        //     el.attrs.push(attr);
        //     el.rawAttrsMap['vusion-scope-id'] = attr;
        //     // 为了添加属性，只能全部开启 false
        //     el.plain = false;
        // }
    });

    if (options && /\/d-[a-zA-Z0-9-_]+\.vue$|\/helper\.vue$|\/cloud-ui\/src\/components/.test(options.filename))
        return;

    traverse.call({ ast }, (info) => {
        const el = info.node;
        if (el.tag === 'u-linear-layout' || el.tag === 'u-grid-layout-column') {
            const children = el.children = el.children || [];

            const subOptions = {
                scopeId: options.scopeId,
                whitespace: 'condense',
            };

            let display = 'block';
            if (el.tag === 'u-linear-layout') {
                if (el.attrsMap.direction !== 'vertical')
                    display = 'inline';
            }

            const tmp = compiler.compile(`
    <div>
    <d-slot tag="${el.tag}" display="${display}" :nodeInfo="{ scopeId: '${options.scopeId}', nodePath: '${el.nodePath}' }"></d-slot>
    </div>`, subOptions).ast;
            children.push(...tmp.children);
        }

        //     if (el.tag === 'div' && (!el.children || !el.children.length || el.children[0].tag === 'router-view')) {
        //         const children = el.children = el.children || [];

        //         const subOptions = {
        //             scopeId: options.scopeId,
        //             whitespace: 'condense',
        //         };

    //         const tmp = compiler.compile(`
    // <div>
    // <d-slot tag="u-linear-layout" display="block" :nodeInfo="{ scopeId: '${options.scopeId}', nodePath: '${el.nodePath}' }"></d-slot>
    // </div>`, subOptions).ast;
    //         children.push(...tmp.children);
    //     }
    });

    const depthTraverse = (ast) => {
        const stack = [];
        stack.push(ast.ast);
        let node;
        while (stack.length) {
            node = stack.pop();
            if ((node.tag && node.tag.startsWith('d-')) || (node.attrsMap && node.attrsMap.class && node.attrsMap.class.startsWith('d-')))
                continue;
            let children = node.children = node.children || [];
            if (node.scopedSlots) {
                children = children.concat(Object.keys(node.scopedSlots).map((key) => node.scopedSlots[key]));
            }
            const texts = children.filter((item) => item.type === 3);
            if (texts.length) {
                texts.forEach((text) => {
                    const tmp = compiler.compile(`<d-text text="${text.text}" nodePath="${text.nodePath}" parentNodePath="${node.nodePath}"></d-text>`).ast;
                    tmp.parent = node;
                    Object.assign(text, tmp);
                });
            }

            // 表达式处添加占位，用于添加节点操作
            const expressions = children.filter((item) => item.type === 2);
            if (expressions.length) {
                expressions.forEach((expression) => {
                    const tmp = compiler.compile(`<d-placeholder nodePath="${expression.nodePath}" parentNodePath="${node.nodePath}">${expression.text}</d-placeholder>`).ast;
                    tmp.parent = node;
                    Object.assign(expression, tmp);
                });
            }

            const routes = children.filter((item) => item.type === 1 && item.tag === 'router-view');
            if (routes.length) {
                routes.forEach((route) => {
                    const tmp = compiler.compile(`<d-router-view nodePath="${route.nodePath}"></d-router-view>`).ast;
                    tmp.parent = node;
                    const index = children.indexOf(route);
                    ~index && children.splice(index, 1, tmp);
                });
            }

            const noChildren = children.filter((item) => item.type === 1 && !item.tag.startsWith('d-') && (!item.children || !item.children.length));
            if (noChildren.length) {
                noChildren.forEach((tempNode) => {
                    tempNode.children = tempNode.children || [];

                    const subOptions = {
                        scopeId: options.scopeId,
                        whitespace: 'condense',
                    };

                    const tmp = compiler.compile(`
            <div>
            <d-slot tag="u-linear-layout" display="inline" slotName="default" nodeTag="${tempNode.tag}" :nodeInfo="{ scopeId: '${options.scopeId}', nodePath: '${tempNode.nodePath}' }"></d-slot>
            </div>`, subOptions).ast;
                    tempNode.children.push(...tmp.children);
                });
            }

            if (children.length) {
                for (let i = children.length - 1; i >= 0; i--) {
                    if (children[i].tag && !children[i].tag.startsWith('d-'))
                        stack.push(children[i]);
                }
            }
        }
    };

    depthTraverse({ ast });

/* <d-skeleton ${el.attrsMap.direction === 'vertical' ? '' : 'display="inline"'}></d-skeleton>
<d-skeleton ${el.attrsMap.direction === 'vertical' ? '' : 'display="inline"'}></d-skeleton> */
};

