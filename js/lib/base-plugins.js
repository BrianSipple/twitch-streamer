// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

// Place any jQuery/helper plugins in here.
// Optional application namespace for bundling all exported modules
//    It’s common in client-side code to have a build step that wraps all of your modules together in a single outer
//    function. If you pass your application object into that wrapper function as a parameter
//    called exports, you’re in business:
var BS = {};

(function (exports) {


    (function (exports) {

        // Object.create polyfill (useful for prototyping objects with shared state)
        if (!Object.create) {
            Object.create = function (obj) {
                if (arguments.length > 1) {
                    throw new Error(
                        'Object.create implementation only accepts the first ' +
                        'parameter.'
                    );
                }

                function F() {
                }

                F.prototype = obj;

                return new F();
            };
        }

        if (!Function.prototype.softBind) {
            Function.prototype.softBind = function (obj) {

                var fn = this,
                    curried = [].slice.call(arguments, 1),
                    bound = function bound () {
                        return fn.apply(
                            (!this ||
                                (typeof window !== 'undefined' &&
                                    this === window) ||
                                (typeof global !== 'undefined' &&
                                    this === global)
                            ) ? obj : this,
                            curried.concat.apply( curried, arguments )
                        );
                    };

                bound.prototype = Object.create( fn.prototype );
                return bound;
            };
        }

        /**
         * Object Cloning mixin helper
         * Usefull for prototying objects with non-shared state
         */
        var compose = function compose(target) {

            // ECMAScript 5+ supported! -- we can clone property
            // descriptions as well
            var descriptorCloningEnabled = !!(Object.getOwnPropertyDescriptor);

            var objects = [].slice.call(arguments, 1);

            // Iterate through each object passed in after "target", cloning
            // its properties to "target"
            if (objects.length > 0) {
                objects.forEach(function (obj) {

                    if (descriptorCloningEnabled) {

                        // NOTE: Keep in mind that Object.keys() returns only
                        // enumerable properties. If we want to also copy
                        // over nonenumerable properties, we can use
                        // Object.getOwnPropertyNames() instead.
                        Object.keys(obj).forEach(function (prop) {

                            var descriptor =
                                Object.getOwnPropertyDescriptor(obj, prop);

                            Object.defineProperty(target, prop, descriptor);
                        });

                    } else {  // fallback to cloning properties only

                        for (var prop in obj) {

                            if (obj.hasOwnProperty(prop)) {
                                target[prop] = obj[prop];
                            }
                        }
                    }
                });
            }

            return target;
        };

        /**
         * Create the actual "api" object -- which we'll then use to extend the
         * exports object that was passed into our loader.
         */
        var api = {
            compose: compose
        };

        compose(exports, api);


    }((typeof exports === 'undefined') ? window : exports));

}(BS));
