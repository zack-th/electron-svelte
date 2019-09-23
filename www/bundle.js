
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement !== 'undefined') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set() {
                // overridden by instance, if it has props
            }
        };
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/pages/Dashboard.svelte generated by Svelte v3.12.1 */

    const file = "src/pages/Dashboard.svelte";

    function create_fragment(ctx) {
    	var header, div4, nav0, div0, a0, img0, t0, a1, span0, i0, t1, t2, a2, t4, a3, t6, a4, t8, button0, span1, t9, span2, t10, span3, t11, div3, a5, t13, a6, t15, a7, t17, a8, t19, a9, span4, i1, t20, span5, t22, div2, a10, figure, img1, t23, t24, div1, a11, span6, i2, t25, t26, hr, t27, a12, span7, i3, t28, t29, div98, div97, aside, nav1, p0, t31, ul0, li0, a13, span8, i4, t32, t33, p1, t35, ul2, li1, a14, span9, i5, t36, t37, li2, a15, span10, i6, t38, t39, li3, a16, span11, i7, t40, t41, li4, a17, span12, i8, t42, t43, li8, a18, i9, t44, t45, ul1, li5, a19, t47, li6, a20, t49, li7, a21, t51, p2, t53, ul3, li9, a22, span13, i10, t54, t55, li10, a23, span14, i11, t56, t57, li11, a24, span15, i12, t58, t59, main, nav2, ul4, li12, a25, t61, li13, a26, t63, div10, div7, div6, div5, i13, t64, t65, div9, div8, button1, t67, div79, div27, div26, div11, t69, div12, t71, div25, div16, div15, div13, t73, div14, t75, div20, div19, div17, t77, div18, t79, div24, div23, div21, t81, div22, t83, div44, div43, div28, t85, div29, t87, div42, div33, div32, div30, t89, div31, t91, div37, div36, div34, t93, div35, t95, div41, div40, div38, t97, div39, t99, div61, div60, div45, t101, div46, t103, div59, div50, div49, div47, t105, div48, t107, div54, div53, div51, t109, div52, t111, div58, div57, div55, t113, div56, t115, div78, div77, div62, t117, div63, t119, div76, div67, div66, div64, t121, div65, t123, div71, div70, div68, t125, div69, t127, div75, div74, div72, t129, div73, t131, div96, div83, article0, div80, p3, t133, div82, div81, t134, div87, article1, div84, p4, t136, div86, div85, t137, div91, article2, div88, p5, t139, div90, div89, t140, div95, article3, div92, p6, t142, div94, div93;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div4 = element("div");
    			nav0 = element("nav");
    			div0 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t0 = space();
    			a1 = element("a");
    			span0 = element("span");
    			i0 = element("i");
    			t1 = text("Home");
    			t2 = space();
    			a2 = element("a");
    			a2.textContent = "Github";
    			t4 = space();
    			a3 = element("a");
    			a3.textContent = "Resume Template";
    			t6 = space();
    			a4 = element("a");
    			a4.textContent = "About";
    			t8 = space();
    			button0 = element("button");
    			span1 = element("span");
    			t9 = space();
    			span2 = element("span");
    			t10 = space();
    			span3 = element("span");
    			t11 = space();
    			div3 = element("div");
    			a5 = element("a");
    			a5.textContent = "Home";
    			t13 = space();
    			a6 = element("a");
    			a6.textContent = "Github";
    			t15 = space();
    			a7 = element("a");
    			a7.textContent = "Resume Template";
    			t17 = space();
    			a8 = element("a");
    			a8.textContent = "About";
    			t19 = space();
    			a9 = element("a");
    			span4 = element("span");
    			i1 = element("i");
    			t20 = space();
    			span5 = element("span");
    			span5.textContent = "6";
    			t22 = space();
    			div2 = element("div");
    			a10 = element("a");
    			figure = element("figure");
    			img1 = element("img");
    			t23 = text("\n              mazipan");
    			t24 = space();
    			div1 = element("div");
    			a11 = element("a");
    			span6 = element("span");
    			i2 = element("i");
    			t25 = text("\n                    Profile");
    			t26 = space();
    			hr = element("hr");
    			t27 = space();
    			a12 = element("a");
    			span7 = element("span");
    			i3 = element("i");
    			t28 = text("\n                    Logout");
    			t29 = space();
    			div98 = element("div");
    			div97 = element("div");
    			aside = element("aside");
    			nav1 = element("nav");
    			p0 = element("p");
    			p0.textContent = "General";
    			t31 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a13 = element("a");
    			span8 = element("span");
    			i4 = element("i");
    			t32 = text(" Dashboard");
    			t33 = space();
    			p1 = element("p");
    			p1.textContent = "Administration";
    			t35 = space();
    			ul2 = element("ul");
    			li1 = element("li");
    			a14 = element("a");
    			span9 = element("span");
    			i5 = element("i");
    			t36 = text(" Forms");
    			t37 = space();
    			li2 = element("li");
    			a15 = element("a");
    			span10 = element("span");
    			i6 = element("i");
    			t38 = text(" UI Elements");
    			t39 = space();
    			li3 = element("li");
    			a16 = element("a");
    			span11 = element("span");
    			i7 = element("i");
    			t40 = text(" Tables");
    			t41 = space();
    			li4 = element("li");
    			a17 = element("a");
    			span12 = element("span");
    			i8 = element("i");
    			t42 = text(" Presentations");
    			t43 = space();
    			li8 = element("li");
    			a18 = element("a");
    			i9 = element("i");
    			t44 = text(" Settings");
    			t45 = space();
    			ul1 = element("ul");
    			li5 = element("li");
    			a19 = element("a");
    			a19.textContent = "Members";
    			t47 = space();
    			li6 = element("li");
    			a20 = element("a");
    			a20.textContent = "Plugins";
    			t49 = space();
    			li7 = element("li");
    			a21 = element("a");
    			a21.textContent = "Add a member";
    			t51 = space();
    			p2 = element("p");
    			p2.textContent = "Live On";
    			t53 = space();
    			ul3 = element("ul");
    			li9 = element("li");
    			a22 = element("a");
    			span13 = element("span");
    			i10 = element("i");
    			t54 = text(" Additional Pages");
    			t55 = space();
    			li10 = element("li");
    			a23 = element("a");
    			span14 = element("span");
    			i11 = element("i");
    			t56 = text(" Extras");
    			t57 = space();
    			li11 = element("li");
    			a24 = element("a");
    			span15 = element("span");
    			i12 = element("i");
    			t58 = text(" Landing Page");
    			t59 = space();
    			main = element("main");
    			nav2 = element("nav");
    			ul4 = element("ul");
    			li12 = element("li");
    			a25 = element("a");
    			a25.textContent = "Home";
    			t61 = space();
    			li13 = element("li");
    			a26 = element("a");
    			a26.textContent = "Dashboard";
    			t63 = space();
    			div10 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			i13 = element("i");
    			t64 = text(" Dashboard");
    			t65 = space();
    			div9 = element("div");
    			div8 = element("div");
    			button1 = element("button");
    			button1.textContent = "March 8, 2017 - April 6, 2017";
    			t67 = space();
    			div79 = element("div");
    			div27 = element("div");
    			div26 = element("div");
    			div11 = element("div");
    			div11.textContent = "Top Seller Total";
    			t69 = space();
    			div12 = element("div");
    			div12.textContent = "56,950";
    			t71 = space();
    			div25 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			div13 = element("div");
    			div13.textContent = "Sales $";
    			t73 = space();
    			div14 = element("div");
    			div14.textContent = "250K";
    			t75 = space();
    			div20 = element("div");
    			div19 = element("div");
    			div17 = element("div");
    			div17.textContent = "Overall $";
    			t77 = space();
    			div18 = element("div");
    			div18.textContent = "750K";
    			t79 = space();
    			div24 = element("div");
    			div23 = element("div");
    			div21 = element("div");
    			div21.textContent = "Sales %";
    			t81 = space();
    			div22 = element("div");
    			div22.textContent = "25%";
    			t83 = space();
    			div44 = element("div");
    			div43 = element("div");
    			div28 = element("div");
    			div28.textContent = "Revenue / Expenses";
    			t85 = space();
    			div29 = element("div");
    			div29.textContent = "55% / 45%";
    			t87 = space();
    			div42 = element("div");
    			div33 = element("div");
    			div32 = element("div");
    			div30 = element("div");
    			div30.textContent = "Rev Prod $";
    			t89 = space();
    			div31 = element("div");
    			div31.textContent = "30%";
    			t91 = space();
    			div37 = element("div");
    			div36 = element("div");
    			div34 = element("div");
    			div34.textContent = "Rev Serv $";
    			t93 = space();
    			div35 = element("div");
    			div35.textContent = "25%";
    			t95 = space();
    			div41 = element("div");
    			div40 = element("div");
    			div38 = element("div");
    			div38.textContent = "Exp %";
    			t97 = space();
    			div39 = element("div");
    			div39.textContent = "45%";
    			t99 = space();
    			div61 = element("div");
    			div60 = element("div");
    			div45 = element("div");
    			div45.textContent = "Feedback Activity";
    			t101 = space();
    			div46 = element("div");
    			div46.textContent = "78% ↑";
    			t103 = space();
    			div59 = element("div");
    			div50 = element("div");
    			div49 = element("div");
    			div47 = element("div");
    			div47.textContent = "Pos";
    			t105 = space();
    			div48 = element("div");
    			div48.textContent = "1560";
    			t107 = space();
    			div54 = element("div");
    			div53 = element("div");
    			div51 = element("div");
    			div51.textContent = "Neg";
    			t109 = space();
    			div52 = element("div");
    			div52.textContent = "368";
    			t111 = space();
    			div58 = element("div");
    			div57 = element("div");
    			div55 = element("div");
    			div55.textContent = "Pos/Neg %";
    			t113 = space();
    			div56 = element("div");
    			div56.textContent = "77% / 23%";
    			t115 = space();
    			div78 = element("div");
    			div77 = element("div");
    			div62 = element("div");
    			div62.textContent = "Orders / Returns";
    			t117 = space();
    			div63 = element("div");
    			div63.textContent = "75% / 25%";
    			t119 = space();
    			div76 = element("div");
    			div67 = element("div");
    			div66 = element("div");
    			div64 = element("div");
    			div64.textContent = "Orders $";
    			t121 = space();
    			div65 = element("div");
    			div65.textContent = "425K";
    			t123 = space();
    			div71 = element("div");
    			div70 = element("div");
    			div68 = element("div");
    			div68.textContent = "Returns $";
    			t125 = space();
    			div69 = element("div");
    			div69.textContent = "106K";
    			t127 = space();
    			div75 = element("div");
    			div74 = element("div");
    			div72 = element("div");
    			div72.textContent = "Success %";
    			t129 = space();
    			div73 = element("div");
    			div73.textContent = "+ 28,5%";
    			t131 = space();
    			div96 = element("div");
    			div83 = element("div");
    			article0 = element("article");
    			div80 = element("div");
    			p3 = element("p");
    			p3.textContent = "Chart";
    			t133 = space();
    			div82 = element("div");
    			div81 = element("div");
    			t134 = space();
    			div87 = element("div");
    			article1 = element("article");
    			div84 = element("div");
    			p4 = element("p");
    			p4.textContent = "Chart";
    			t136 = space();
    			div86 = element("div");
    			div85 = element("div");
    			t137 = space();
    			div91 = element("div");
    			article2 = element("article");
    			div88 = element("div");
    			p5 = element("p");
    			p5.textContent = "Chart";
    			t139 = space();
    			div90 = element("div");
    			div89 = element("div");
    			t140 = space();
    			div95 = element("div");
    			article3 = element("article");
    			div92 = element("div");
    			p6 = element("p");
    			p6.textContent = "Chart";
    			t142 = space();
    			div94 = element("div");
    			div93 = element("div");
    			attr_dev(img0, "class", "navbar-brand-logo");
    			attr_dev(img0, "src", "/bulma-admin-dashboard-template/logo.png");
    			attr_dev(img0, "alt", "Bulma Admin Template logo");
    			add_location(img0, file, 10, 12, 248);
    			attr_dev(a0, "class", "navbar-item is--brand");
    			add_location(a0, file, 9, 10, 202);
    			attr_dev(i0, "class", "fa fa-home");
    			add_location(i0, file, 12, 96, 470);
    			attr_dev(span0, "class", "icon is-medium");
    			add_location(span0, file, 12, 67, 441);
    			attr_dev(a1, "class", "navbar-item is-tab is-hidden-mobile is-active");
    			add_location(a1, file, 12, 10, 384);
    			attr_dev(a2, "class", "navbar-item is-tab is-hidden-mobile");
    			attr_dev(a2, "href", "https://github.com/mazipan/bulma-admin-dashboard-template");
    			add_location(a2, file, 13, 10, 522);
    			attr_dev(a3, "class", "navbar-item is-tab is-hidden-mobile");
    			attr_dev(a3, "href", "https://mazipan.github.io/bulma-resume-template/");
    			add_location(a3, file, 14, 10, 655);
    			attr_dev(a4, "class", "navbar-item is-tab is-hidden-mobile");
    			attr_dev(a4, "href", "#about");
    			add_location(a4, file, 15, 10, 788);
    			add_location(span1, file, 18, 12, 942);
    			add_location(span2, file, 19, 12, 968);
    			add_location(span3, file, 20, 12, 994);
    			attr_dev(button0, "class", "button navbar-burger");
    			attr_dev(button0, "data-target", "navMenu");
    			add_location(button0, file, 17, 10, 870);
    			attr_dev(div0, "class", "navbar-brand");
    			add_location(div0, file, 7, 8, 164);
    			attr_dev(a5, "class", "navbar-item is-tab is-hidden-tablet is-active");
    			add_location(a5, file, 27, 10, 1114);
    			attr_dev(a6, "class", "navbar-item is-tab is-hidden-tablet");
    			attr_dev(a6, "href", "https://github.com/mazipan/bulma-admin-dashboard-template");
    			add_location(a6, file, 28, 10, 1190);
    			attr_dev(a7, "class", "navbar-item is-tab is-hidden-tablet");
    			attr_dev(a7, "href", "https://mazipan.github.io/bulma-resume-template/");
    			add_location(a7, file, 29, 10, 1323);
    			attr_dev(a8, "class", "navbar-item is-tab is-hidden-tablet");
    			attr_dev(a8, "href", "#about");
    			add_location(a8, file, 30, 10, 1456);
    			attr_dev(i1, "class", "fa fa-envelope-o");
    			add_location(i1, file, 33, 14, 1624);
    			attr_dev(span4, "class", "icon is-small");
    			add_location(span4, file, 32, 12, 1581);
    			attr_dev(span5, "class", "tag is-primary tag-notif");
    			add_location(span5, file, 35, 12, 1689);
    			attr_dev(a9, "class", "navbar-item nav-tag");
    			add_location(a9, file, 31, 10, 1537);
    			attr_dev(img1, "src", "https://avatars1.githubusercontent.com/u/7221389?v=4&s=32");
    			add_location(img1, file, 40, 16, 1939);
    			attr_dev(figure, "class", "image is-32x32");
    			set_style(figure, "margin-right", ".5em");
    			add_location(figure, file, 39, 14, 1864);
    			attr_dev(a10, "class", "navbar-link");
    			add_location(a10, file, 38, 12, 1826);
    			attr_dev(i2, "class", "fa fa-user-o");
    			add_location(i2, file, 48, 20, 2231);
    			attr_dev(span6, "class", "icon is-small");
    			add_location(span6, file, 47, 18, 2182);
    			attr_dev(a11, "class", "navbar-item");
    			add_location(a11, file, 46, 16, 2140);
    			attr_dev(hr, "class", "navbar-divider");
    			add_location(hr, file, 52, 16, 2356);
    			attr_dev(i3, "class", "fa fa-power-off");
    			add_location(i3, file, 55, 20, 2491);
    			attr_dev(span7, "class", "icon is-small");
    			add_location(span7, file, 54, 18, 2442);
    			attr_dev(a12, "class", "navbar-item");
    			add_location(a12, file, 53, 16, 2400);
    			attr_dev(div1, "class", "navbar-dropdown is-right");
    			add_location(div1, file, 45, 12, 2085);
    			attr_dev(div2, "class", "navbar-item has-dropdown is-hoverable");
    			add_location(div2, file, 37, 10, 1762);
    			attr_dev(div3, "class", "navbar-menu navbar-end");
    			attr_dev(div3, "id", "navMenu");
    			add_location(div3, file, 26, 8, 1054);
    			attr_dev(nav0, "class", "navbar has-shadow");
    			attr_dev(nav0, "role", "navigation");
    			attr_dev(nav0, "aria-label", "main navigation");
    			add_location(nav0, file, 6, 6, 77);
    			attr_dev(div4, "class", "hero-head");
    			add_location(div4, file, 5, 4, 47);
    			attr_dev(header, "class", "hero");
    			add_location(header, file, 4, 0, 21);
    			attr_dev(p0, "class", "menu-label");
    			add_location(p0, file, 70, 10, 2817);
    			attr_dev(i4, "class", "fa fa-tachometer");
    			add_location(i4, file, 74, 74, 2982);
    			attr_dev(span8, "class", "icon is-small");
    			add_location(span8, file, 74, 46, 2954);
    			attr_dev(a13, "class", "is-active");
    			attr_dev(a13, "href", "#");
    			add_location(a13, file, 74, 16, 2924);
    			add_location(li0, file, 74, 12, 2920);
    			attr_dev(ul0, "class", "menu-list");
    			add_location(ul0, file, 73, 10, 2885);
    			attr_dev(p1, "class", "menu-label");
    			add_location(p1, file, 76, 10, 3067);
    			attr_dev(i5, "class", "fa fa-pencil-square-o");
    			add_location(i5, file, 80, 97, 3262);
    			attr_dev(span9, "class", "icon is-small");
    			add_location(span9, file, 80, 69, 3234);
    			attr_dev(a14, "href", "/bulma-admin-dashboard-template/forms.html");
    			add_location(a14, file, 80, 16, 3181);
    			add_location(li1, file, 80, 12, 3177);
    			attr_dev(i6, "class", "fa fa-desktop");
    			add_location(i6, file, 81, 103, 3425);
    			attr_dev(span10, "class", "icon is-small");
    			add_location(span10, file, 81, 75, 3397);
    			attr_dev(a15, "href", "/bulma-admin-dashboard-template/ui-elements.html");
    			add_location(a15, file, 81, 16, 3338);
    			add_location(li2, file, 81, 12, 3334);
    			attr_dev(i7, "class", "fa fa-table");
    			add_location(i7, file, 82, 98, 3581);
    			attr_dev(span11, "class", "icon is-small");
    			add_location(span11, file, 82, 70, 3553);
    			attr_dev(a16, "href", "/bulma-admin-dashboard-template/tables.html");
    			add_location(a16, file, 82, 16, 3499);
    			add_location(li3, file, 82, 12, 3495);
    			attr_dev(i8, "class", "fa fa-bar-chart");
    			add_location(i8, file, 83, 105, 3737);
    			attr_dev(span12, "class", "icon is-small");
    			add_location(span12, file, 83, 77, 3709);
    			attr_dev(a17, "href", "/bulma-admin-dashboard-template/presentations.html");
    			add_location(a17, file, 83, 16, 3648);
    			add_location(li4, file, 83, 12, 3644);
    			attr_dev(i9, "class", "fa fa-cog");
    			add_location(i9, file, 86, 26, 3843);
    			attr_dev(a18, "class", "");
    			add_location(a18, file, 86, 14, 3831);
    			add_location(a19, file, 88, 20, 3921);
    			add_location(li5, file, 88, 16, 3917);
    			add_location(a20, file, 89, 20, 3961);
    			add_location(li6, file, 89, 16, 3957);
    			add_location(a21, file, 90, 20, 4001);
    			add_location(li7, file, 90, 16, 3997);
    			add_location(ul1, file, 87, 14, 3896);
    			add_location(li8, file, 85, 12, 3812);
    			attr_dev(ul2, "class", "menu-list");
    			add_location(ul2, file, 79, 10, 3142);
    			attr_dev(p2, "class", "menu-label");
    			add_location(p2, file, 94, 10, 4090);
    			attr_dev(i10, "class", "fa fa-bug");
    			add_location(i10, file, 98, 47, 4228);
    			attr_dev(span13, "class", "icon is-small");
    			add_location(span13, file, 98, 19, 4200);
    			add_location(a22, file, 98, 16, 4197);
    			add_location(li9, file, 98, 12, 4193);
    			attr_dev(i11, "class", "fa fa-windows");
    			add_location(i11, file, 99, 47, 4334);
    			attr_dev(span14, "class", "icon is-small");
    			add_location(span14, file, 99, 19, 4306);
    			add_location(a23, file, 99, 16, 4303);
    			add_location(li10, file, 99, 12, 4299);
    			attr_dev(i12, "class", "fa fa-laptop");
    			add_location(i12, file, 100, 47, 4434);
    			attr_dev(span15, "class", "icon is-small");
    			add_location(span15, file, 100, 19, 4406);
    			add_location(a24, file, 100, 16, 4403);
    			add_location(li11, file, 100, 12, 4399);
    			attr_dev(ul3, "class", "menu-list");
    			add_location(ul3, file, 97, 10, 4158);
    			attr_dev(nav1, "class", "menu");
    			add_location(nav1, file, 69, 8, 2788);
    			attr_dev(aside, "class", "column is-2 aside");
    			add_location(aside, file, 68, 6, 2746);
    			attr_dev(a25, "href", "#");
    			add_location(a25, file, 108, 16, 4670);
    			add_location(li12, file, 108, 12, 4666);
    			attr_dev(a26, "href", "#");
    			attr_dev(a26, "aria-current", "page");
    			add_location(a26, file, 109, 34, 4730);
    			attr_dev(li13, "class", "is-active");
    			add_location(li13, file, 109, 12, 4708);
    			add_location(ul4, file, 107, 10, 4649);
    			attr_dev(nav2, "class", "breadcrumb is-small");
    			attr_dev(nav2, "aria-label", "breadcrumbs");
    			add_location(nav2, file, 106, 8, 4580);
    			attr_dev(i13, "class", "fa fa-tachometer");
    			add_location(i13, file, 116, 50, 4963);
    			attr_dev(div5, "class", "title has-text-primary");
    			add_location(div5, file, 116, 14, 4927);
    			attr_dev(div6, "class", "level-item");
    			add_location(div6, file, 115, 12, 4888);
    			attr_dev(div7, "class", "level-left");
    			add_location(div7, file, 114, 10, 4851);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "button is-small");
    			add_location(button1, file, 121, 14, 5135);
    			attr_dev(div8, "class", "level-item");
    			add_location(div8, file, 120, 12, 5096);
    			attr_dev(div9, "class", "level-right");
    			add_location(div9, file, 119, 10, 5058);
    			attr_dev(div10, "class", "level");
    			add_location(div10, file, 113, 8, 4821);
    			attr_dev(div11, "class", "heading");
    			add_location(div11, file, 131, 14, 5446);
    			attr_dev(div12, "class", "title");
    			add_location(div12, file, 132, 14, 5504);
    			attr_dev(div13, "class", "heading");
    			add_location(div13, file, 136, 20, 5664);
    			attr_dev(div14, "class", "title is-5");
    			add_location(div14, file, 137, 20, 5719);
    			attr_dev(div15, "class", "");
    			add_location(div15, file, 135, 18, 5629);
    			attr_dev(div16, "class", "level-item");
    			add_location(div16, file, 134, 16, 5586);
    			attr_dev(div17, "class", "heading");
    			add_location(div17, file, 142, 20, 5896);
    			attr_dev(div18, "class", "title is-5");
    			add_location(div18, file, 143, 20, 5953);
    			attr_dev(div19, "class", "");
    			add_location(div19, file, 141, 18, 5861);
    			attr_dev(div20, "class", "level-item");
    			add_location(div20, file, 140, 16, 5818);
    			attr_dev(div21, "class", "heading");
    			add_location(div21, file, 148, 20, 6130);
    			attr_dev(div22, "class", "title is-5");
    			add_location(div22, file, 149, 20, 6185);
    			attr_dev(div23, "class", "");
    			add_location(div23, file, 147, 18, 6095);
    			attr_dev(div24, "class", "level-item");
    			add_location(div24, file, 146, 16, 6052);
    			attr_dev(div25, "class", "level");
    			add_location(div25, file, 133, 14, 5550);
    			attr_dev(div26, "class", "box notification is-primary");
    			add_location(div26, file, 130, 12, 5390);
    			attr_dev(div27, "class", "column");
    			add_location(div27, file, 129, 10, 5357);
    			attr_dev(div28, "class", "heading");
    			add_location(div28, file, 157, 14, 6423);
    			attr_dev(div29, "class", "title");
    			add_location(div29, file, 158, 14, 6483);
    			attr_dev(div30, "class", "heading");
    			add_location(div30, file, 162, 20, 6646);
    			attr_dev(div31, "class", "title is-5");
    			add_location(div31, file, 163, 20, 6704);
    			attr_dev(div32, "class", "");
    			add_location(div32, file, 161, 18, 6611);
    			attr_dev(div33, "class", "level-item");
    			add_location(div33, file, 160, 16, 6568);
    			attr_dev(div34, "class", "heading");
    			add_location(div34, file, 168, 20, 6880);
    			attr_dev(div35, "class", "title is-5");
    			add_location(div35, file, 169, 20, 6938);
    			attr_dev(div36, "class", "");
    			add_location(div36, file, 167, 18, 6845);
    			attr_dev(div37, "class", "level-item");
    			add_location(div37, file, 166, 16, 6802);
    			attr_dev(div38, "class", "heading");
    			add_location(div38, file, 174, 20, 7114);
    			attr_dev(div39, "class", "title is-5");
    			add_location(div39, file, 175, 20, 7167);
    			attr_dev(div40, "class", "");
    			add_location(div40, file, 173, 18, 7079);
    			attr_dev(div41, "class", "level-item");
    			add_location(div41, file, 172, 16, 7036);
    			attr_dev(div42, "class", "level");
    			add_location(div42, file, 159, 14, 6532);
    			attr_dev(div43, "class", "box notification is-warning");
    			add_location(div43, file, 156, 12, 6367);
    			attr_dev(div44, "class", "column");
    			add_location(div44, file, 155, 10, 6334);
    			attr_dev(div45, "class", "heading");
    			add_location(div45, file, 183, 14, 7402);
    			attr_dev(div46, "class", "title");
    			add_location(div46, file, 184, 14, 7461);
    			attr_dev(div47, "class", "heading");
    			add_location(div47, file, 188, 20, 7625);
    			attr_dev(div48, "class", "title is-5");
    			add_location(div48, file, 189, 20, 7676);
    			attr_dev(div49, "class", "");
    			add_location(div49, file, 187, 18, 7590);
    			attr_dev(div50, "class", "level-item");
    			add_location(div50, file, 186, 16, 7547);
    			attr_dev(div51, "class", "heading");
    			add_location(div51, file, 194, 20, 7853);
    			attr_dev(div52, "class", "title is-5");
    			add_location(div52, file, 195, 20, 7904);
    			attr_dev(div53, "class", "");
    			add_location(div53, file, 193, 18, 7818);
    			attr_dev(div54, "class", "level-item");
    			add_location(div54, file, 192, 16, 7775);
    			attr_dev(div55, "class", "heading");
    			add_location(div55, file, 200, 20, 8080);
    			attr_dev(div56, "class", "title is-5");
    			add_location(div56, file, 201, 20, 8137);
    			attr_dev(div57, "class", "");
    			add_location(div57, file, 199, 18, 8045);
    			attr_dev(div58, "class", "level-item");
    			add_location(div58, file, 198, 16, 8002);
    			attr_dev(div59, "class", "level");
    			add_location(div59, file, 185, 14, 7511);
    			attr_dev(div60, "class", "box notification is-info");
    			add_location(div60, file, 182, 12, 7349);
    			attr_dev(div61, "class", "column");
    			add_location(div61, file, 181, 10, 7316);
    			attr_dev(div62, "class", "heading");
    			add_location(div62, file, 209, 14, 8380);
    			attr_dev(div63, "class", "title");
    			add_location(div63, file, 210, 14, 8438);
    			attr_dev(div64, "class", "heading");
    			add_location(div64, file, 214, 20, 8601);
    			attr_dev(div65, "class", "title is-5");
    			add_location(div65, file, 215, 20, 8657);
    			attr_dev(div66, "class", "");
    			add_location(div66, file, 213, 18, 8566);
    			attr_dev(div67, "class", "level-item");
    			add_location(div67, file, 212, 16, 8523);
    			attr_dev(div68, "class", "heading");
    			add_location(div68, file, 220, 20, 8834);
    			attr_dev(div69, "class", "title is-5");
    			add_location(div69, file, 221, 20, 8891);
    			attr_dev(div70, "class", "");
    			add_location(div70, file, 219, 18, 8799);
    			attr_dev(div71, "class", "level-item");
    			add_location(div71, file, 218, 16, 8756);
    			attr_dev(div72, "class", "heading");
    			add_location(div72, file, 226, 20, 9068);
    			attr_dev(div73, "class", "title is-5");
    			add_location(div73, file, 227, 20, 9125);
    			attr_dev(div74, "class", "");
    			add_location(div74, file, 225, 18, 9033);
    			attr_dev(div75, "class", "level-item");
    			add_location(div75, file, 224, 16, 8990);
    			attr_dev(div76, "class", "level");
    			add_location(div76, file, 211, 14, 8487);
    			attr_dev(div77, "class", "box notification is-danger");
    			add_location(div77, file, 208, 12, 8325);
    			attr_dev(div78, "class", "column");
    			add_location(div78, file, 207, 10, 8292);
    			attr_dev(div79, "class", "columns is-multiline");
    			add_location(div79, file, 128, 8, 5312);
    			add_location(p3, file, 239, 16, 9468);
    			attr_dev(div80, "class", "message-header");
    			add_location(div80, file, 238, 14, 9423);
    			attr_dev(div81, "id", "chartLine");
    			set_style(div81, "width", "100%");
    			add_location(div81, file, 242, 16, 9559);
    			attr_dev(div82, "class", "message-body");
    			add_location(div82, file, 241, 14, 9516);
    			attr_dev(article0, "class", "message is-dark");
    			add_location(article0, file, 237, 12, 9375);
    			attr_dev(div83, "class", "column is-6");
    			add_location(div83, file, 236, 10, 9337);
    			add_location(p4, file, 249, 16, 9809);
    			attr_dev(div84, "class", "message-header");
    			add_location(div84, file, 248, 14, 9764);
    			attr_dev(div85, "id", "chartScatter");
    			set_style(div85, "width", "100%");
    			add_location(div85, file, 252, 16, 9900);
    			attr_dev(div86, "class", "message-body");
    			add_location(div86, file, 251, 14, 9857);
    			attr_dev(article1, "class", "message is-dark");
    			add_location(article1, file, 247, 12, 9716);
    			attr_dev(div87, "class", "column is-6");
    			add_location(div87, file, 246, 10, 9678);
    			add_location(p5, file, 259, 16, 10153);
    			attr_dev(div88, "class", "message-header");
    			add_location(div88, file, 258, 14, 10108);
    			attr_dev(div89, "id", "chartDoughnut");
    			set_style(div89, "width", "100%");
    			add_location(div89, file, 262, 16, 10244);
    			attr_dev(div90, "class", "message-body");
    			add_location(div90, file, 261, 14, 10201);
    			attr_dev(article2, "class", "message is-dark");
    			add_location(article2, file, 257, 12, 10060);
    			attr_dev(div91, "class", "column is-6");
    			add_location(div91, file, 256, 10, 10022);
    			add_location(p6, file, 269, 16, 10498);
    			attr_dev(div92, "class", "message-header");
    			add_location(div92, file, 268, 14, 10453);
    			attr_dev(div93, "id", "chartBar");
    			set_style(div93, "width", "100%");
    			add_location(div93, file, 272, 16, 10589);
    			attr_dev(div94, "class", "message-body");
    			add_location(div94, file, 271, 14, 10546);
    			attr_dev(article3, "class", "message is-dark");
    			add_location(article3, file, 267, 12, 10405);
    			attr_dev(div95, "class", "column is-6");
    			add_location(div95, file, 266, 10, 10367);
    			attr_dev(div96, "class", "columns is-multiline");
    			add_location(div96, file, 235, 8, 9292);
    			attr_dev(main, "class", "column main");
    			add_location(main, file, 105, 6, 4545);
    			attr_dev(div97, "class", "columns");
    			add_location(div97, file, 67, 4, 2718);
    			attr_dev(div98, "class", "wrapper");
    			add_location(div98, file, 66, 2, 2692);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div4);
    			append_dev(div4, nav0);
    			append_dev(nav0, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img0);
    			append_dev(div0, t0);
    			append_dev(div0, a1);
    			append_dev(a1, span0);
    			append_dev(span0, i0);
    			append_dev(a1, t1);
    			append_dev(div0, t2);
    			append_dev(div0, a2);
    			append_dev(div0, t4);
    			append_dev(div0, a3);
    			append_dev(div0, t6);
    			append_dev(div0, a4);
    			append_dev(div0, t8);
    			append_dev(div0, button0);
    			append_dev(button0, span1);
    			append_dev(button0, t9);
    			append_dev(button0, span2);
    			append_dev(button0, t10);
    			append_dev(button0, span3);
    			append_dev(nav0, t11);
    			append_dev(nav0, div3);
    			append_dev(div3, a5);
    			append_dev(div3, t13);
    			append_dev(div3, a6);
    			append_dev(div3, t15);
    			append_dev(div3, a7);
    			append_dev(div3, t17);
    			append_dev(div3, a8);
    			append_dev(div3, t19);
    			append_dev(div3, a9);
    			append_dev(a9, span4);
    			append_dev(span4, i1);
    			append_dev(a9, t20);
    			append_dev(a9, span5);
    			append_dev(div3, t22);
    			append_dev(div3, div2);
    			append_dev(div2, a10);
    			append_dev(a10, figure);
    			append_dev(figure, img1);
    			append_dev(a10, t23);
    			append_dev(div2, t24);
    			append_dev(div2, div1);
    			append_dev(div1, a11);
    			append_dev(a11, span6);
    			append_dev(span6, i2);
    			append_dev(a11, t25);
    			append_dev(div1, t26);
    			append_dev(div1, hr);
    			append_dev(div1, t27);
    			append_dev(div1, a12);
    			append_dev(a12, span7);
    			append_dev(span7, i3);
    			append_dev(a12, t28);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, div98, anchor);
    			append_dev(div98, div97);
    			append_dev(div97, aside);
    			append_dev(aside, nav1);
    			append_dev(nav1, p0);
    			append_dev(nav1, t31);
    			append_dev(nav1, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a13);
    			append_dev(a13, span8);
    			append_dev(span8, i4);
    			append_dev(a13, t32);
    			append_dev(nav1, t33);
    			append_dev(nav1, p1);
    			append_dev(nav1, t35);
    			append_dev(nav1, ul2);
    			append_dev(ul2, li1);
    			append_dev(li1, a14);
    			append_dev(a14, span9);
    			append_dev(span9, i5);
    			append_dev(a14, t36);
    			append_dev(ul2, t37);
    			append_dev(ul2, li2);
    			append_dev(li2, a15);
    			append_dev(a15, span10);
    			append_dev(span10, i6);
    			append_dev(a15, t38);
    			append_dev(ul2, t39);
    			append_dev(ul2, li3);
    			append_dev(li3, a16);
    			append_dev(a16, span11);
    			append_dev(span11, i7);
    			append_dev(a16, t40);
    			append_dev(ul2, t41);
    			append_dev(ul2, li4);
    			append_dev(li4, a17);
    			append_dev(a17, span12);
    			append_dev(span12, i8);
    			append_dev(a17, t42);
    			append_dev(ul2, t43);
    			append_dev(ul2, li8);
    			append_dev(li8, a18);
    			append_dev(a18, i9);
    			append_dev(a18, t44);
    			append_dev(li8, t45);
    			append_dev(li8, ul1);
    			append_dev(ul1, li5);
    			append_dev(li5, a19);
    			append_dev(ul1, t47);
    			append_dev(ul1, li6);
    			append_dev(li6, a20);
    			append_dev(ul1, t49);
    			append_dev(ul1, li7);
    			append_dev(li7, a21);
    			append_dev(nav1, t51);
    			append_dev(nav1, p2);
    			append_dev(nav1, t53);
    			append_dev(nav1, ul3);
    			append_dev(ul3, li9);
    			append_dev(li9, a22);
    			append_dev(a22, span13);
    			append_dev(span13, i10);
    			append_dev(a22, t54);
    			append_dev(ul3, t55);
    			append_dev(ul3, li10);
    			append_dev(li10, a23);
    			append_dev(a23, span14);
    			append_dev(span14, i11);
    			append_dev(a23, t56);
    			append_dev(ul3, t57);
    			append_dev(ul3, li11);
    			append_dev(li11, a24);
    			append_dev(a24, span15);
    			append_dev(span15, i12);
    			append_dev(a24, t58);
    			append_dev(div97, t59);
    			append_dev(div97, main);
    			append_dev(main, nav2);
    			append_dev(nav2, ul4);
    			append_dev(ul4, li12);
    			append_dev(li12, a25);
    			append_dev(ul4, t61);
    			append_dev(ul4, li13);
    			append_dev(li13, a26);
    			append_dev(main, t63);
    			append_dev(main, div10);
    			append_dev(div10, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, i13);
    			append_dev(div5, t64);
    			append_dev(div10, t65);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, button1);
    			append_dev(main, t67);
    			append_dev(main, div79);
    			append_dev(div79, div27);
    			append_dev(div27, div26);
    			append_dev(div26, div11);
    			append_dev(div26, t69);
    			append_dev(div26, div12);
    			append_dev(div26, t71);
    			append_dev(div26, div25);
    			append_dev(div25, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div13);
    			append_dev(div15, t73);
    			append_dev(div15, div14);
    			append_dev(div25, t75);
    			append_dev(div25, div20);
    			append_dev(div20, div19);
    			append_dev(div19, div17);
    			append_dev(div19, t77);
    			append_dev(div19, div18);
    			append_dev(div25, t79);
    			append_dev(div25, div24);
    			append_dev(div24, div23);
    			append_dev(div23, div21);
    			append_dev(div23, t81);
    			append_dev(div23, div22);
    			append_dev(div79, t83);
    			append_dev(div79, div44);
    			append_dev(div44, div43);
    			append_dev(div43, div28);
    			append_dev(div43, t85);
    			append_dev(div43, div29);
    			append_dev(div43, t87);
    			append_dev(div43, div42);
    			append_dev(div42, div33);
    			append_dev(div33, div32);
    			append_dev(div32, div30);
    			append_dev(div32, t89);
    			append_dev(div32, div31);
    			append_dev(div42, t91);
    			append_dev(div42, div37);
    			append_dev(div37, div36);
    			append_dev(div36, div34);
    			append_dev(div36, t93);
    			append_dev(div36, div35);
    			append_dev(div42, t95);
    			append_dev(div42, div41);
    			append_dev(div41, div40);
    			append_dev(div40, div38);
    			append_dev(div40, t97);
    			append_dev(div40, div39);
    			append_dev(div79, t99);
    			append_dev(div79, div61);
    			append_dev(div61, div60);
    			append_dev(div60, div45);
    			append_dev(div60, t101);
    			append_dev(div60, div46);
    			append_dev(div60, t103);
    			append_dev(div60, div59);
    			append_dev(div59, div50);
    			append_dev(div50, div49);
    			append_dev(div49, div47);
    			append_dev(div49, t105);
    			append_dev(div49, div48);
    			append_dev(div59, t107);
    			append_dev(div59, div54);
    			append_dev(div54, div53);
    			append_dev(div53, div51);
    			append_dev(div53, t109);
    			append_dev(div53, div52);
    			append_dev(div59, t111);
    			append_dev(div59, div58);
    			append_dev(div58, div57);
    			append_dev(div57, div55);
    			append_dev(div57, t113);
    			append_dev(div57, div56);
    			append_dev(div79, t115);
    			append_dev(div79, div78);
    			append_dev(div78, div77);
    			append_dev(div77, div62);
    			append_dev(div77, t117);
    			append_dev(div77, div63);
    			append_dev(div77, t119);
    			append_dev(div77, div76);
    			append_dev(div76, div67);
    			append_dev(div67, div66);
    			append_dev(div66, div64);
    			append_dev(div66, t121);
    			append_dev(div66, div65);
    			append_dev(div76, t123);
    			append_dev(div76, div71);
    			append_dev(div71, div70);
    			append_dev(div70, div68);
    			append_dev(div70, t125);
    			append_dev(div70, div69);
    			append_dev(div76, t127);
    			append_dev(div76, div75);
    			append_dev(div75, div74);
    			append_dev(div74, div72);
    			append_dev(div74, t129);
    			append_dev(div74, div73);
    			append_dev(main, t131);
    			append_dev(main, div96);
    			append_dev(div96, div83);
    			append_dev(div83, article0);
    			append_dev(article0, div80);
    			append_dev(div80, p3);
    			append_dev(article0, t133);
    			append_dev(article0, div82);
    			append_dev(div82, div81);
    			append_dev(div96, t134);
    			append_dev(div96, div87);
    			append_dev(div87, article1);
    			append_dev(article1, div84);
    			append_dev(div84, p4);
    			append_dev(article1, t136);
    			append_dev(article1, div86);
    			append_dev(div86, div85);
    			append_dev(div96, t137);
    			append_dev(div96, div91);
    			append_dev(div91, article2);
    			append_dev(article2, div88);
    			append_dev(div88, p5);
    			append_dev(article2, t139);
    			append_dev(article2, div90);
    			append_dev(div90, div89);
    			append_dev(div96, t140);
    			append_dev(div96, div95);
    			append_dev(div95, article3);
    			append_dev(article3, div92);
    			append_dev(div92, p6);
    			append_dev(article3, t142);
    			append_dev(article3, div94);
    			append_dev(div94, div93);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(header);
    				detach_dev(t29);
    				detach_dev(div98);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    class Dashboard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Dashboard", options, id: create_fragment.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    function create_fragment$1(ctx) {
    	var current;

    	var dashboard = new Dashboard({ $$inline: true });

    	const block = {
    		c: function create() {
    			dashboard.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(dashboard, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(dashboard.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(dashboard.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(dashboard, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { name } = $$props;

    	const writable_props = ['name'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    	};

    	$$self.$capture_state = () => {
    		return { name };
    	};

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    	};

    	return { name };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$1, safe_not_equal, ["name"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$1.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
