const jp        = require('jsonpath');
const memoize   = require('memoizee');

function type(obj) {
    return Array.isArray(obj) ? 'array' : typeof obj;
}

const render = memoize((tmpl, data, return_list = false) => {
    let resp = null;
    switch (type(tmpl)) {
        case 'array':
            resp = render_array(tmpl, data, return_list);
            break;
        case 'object':
            resp = render_object(tmpl, data, return_list);
            break;
        case 'string':
            resp = render_string(tmpl, data, return_list);
            break;
        default:
            resp = tmpl;
    }
    //console.log(`render:   ${JSON.stringify(tmpl)} (${type(tmpl)}, ${JSON.stringify(data)}) => ${JSON.stringify(resp)}`);
    return resp;
});

function arr_has_path(tmpl) {
    for(let i = 0; i < tmpl.length; i++) {
        if(has_path(tmpl[i])) return true;
    }
    return false;
}

function obj_has_path(tmpl) {
    for(let key in tmpl) {
        if(has_path(key) || has_path(tmpl[key])) return true;
    }
    return false;
}

function str_has_path(tmpl) {
    //console.log(`str: ${tmpl}`);
    return !!tmpl.match(/^\s*\$/);
}

const has_path = memoize(tmpl => {
    switch (type(tmpl)) {
        case 'array':
            resp = arr_has_path(tmpl);
            break;
        case 'object':
            resp = obj_has_path(tmpl);
            break;
        case 'string':
            resp = str_has_path(tmpl);
            break;
        default:
            resp = false;
    }
    //console.log(`has_path: ${JSON.stringify(tmpl)} (${type(tmpl)}) => ${resp}`);
    return resp;
});

function render_array(tmpl, data, return_list = false) {
    if(tmpl.length == 0) return tmpl;
    if(!has_path(tmpl))  return tmpl;
    let arr = [];
    for(let i = 0; i < tmpl.length; i++) {
        //console.log(`${i}: ${tmpl[i]}`);
        if(!has_path(tmpl[i])) {
            arr.push(tmpl[i]);
        } else if(i+1 < tmpl.length && has_path(tmpl[i + 1])) {
            //console.log(`AQUI: ${i+1} < ${tmpl.length}: ${JSON.stringify(tmpl[i])}`);
            let values = render(tmpl[i], data, true);
            let sub_tmpl = tmpl[++i];
            //console.log(`sub_tmpl: ${JSON.stringify(sub_tmpl)}`);
            values.forEach(
                item => arr.push(render(sub_tmpl, item))
            );
        } else {
            render(tmpl[i], data, true).forEach(item => arr.push(item));
        }
    }
    return arr;
}

function render_object(tmpl, data, return_list = false) {
    if(Object.keys(tmpl).length == 0)   return tmpl;
    if(!has_path(tmpl))                 return tmpl;
    if(!return_list) {
        let hash = {};
        if('@' in tmpl) {
            let obj = Object.assign({}, tmpl);
            delete obj['@'];
            render(tmpl['@'], data, true)
                .forEach(
                    item => {
                        let resp = render_object(obj, item);
                        for(let key in resp) {
                            hash[key] = resp[key]
                        }
                    }
                );
        } else {
            Object.keys(tmpl).forEach(
                key => {
                    let okey = key;
                    if(has_path(key))
                        key = render_string(key, data);
                    if(has_path(tmpl[okey]))
                        hash[key] = render(tmpl[okey], data)
                    else
                        hash[key] = tmpl[okey]
                }
            );
        }
        return hash;
    }
    throw new Error("NYI");
}

function render_string(tmpl, data, return_list = false) {
    if(!has_path(tmpl)) return tmpl;
    if(tmpl.match(/^\s*\$/)) {
        let ret = jp.query(data, tmpl, return_list ? undefined : 1);
        if(!return_list) return ret[0];
        return ret;
    }
    throw new Error("NYI");
}




module.exports  = render;