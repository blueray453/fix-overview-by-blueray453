
/* exported PrototypeInjector */
export const PrototypeInjector = class PrototypeInjector {
    constructor() {
        this.injections = {};
        this.prototypes = new Set();
    }

    injectOrOverrideFunction(objectPrototype, functionName, mode, targetFunction) {
        let originalFunction = objectPrototype[functionName];

        objectPrototype[functionName] = function () {
            let returnValue;

            // 'before': call injected function first, then original
            if (mode === 'before') {
                let injectedReturnValue = targetFunction.apply(this, arguments);
                if (originalFunction !== undefined) {
                    returnValue = originalFunction.apply(this, arguments);
                }
                if (returnValue === undefined) {
                    returnValue = injectedReturnValue;
                }
            }
            // 'after': call original first, then injected function
            else if (mode === 'after') {
                if (originalFunction !== undefined) {
                    returnValue = originalFunction.apply(this, arguments);
                }
                let injectedReturnValue = targetFunction.apply(this, arguments);
                if (returnValue === undefined) {
                    returnValue = injectedReturnValue;
                }
            }
            // 'override': only call injected function
            else if (mode === 'override') {
                returnValue = targetFunction.apply(this, arguments);
            }

            return returnValue;
        }

        this.injections[objectPrototype.constructor.name + ':' + functionName] = originalFunction;
        this.prototypes.add(objectPrototype);
        return originalFunction;
    }

    // Inject multiple functions on the same prototype at once
    injectMultiple(objectPrototype, injections) {
        for (const [functionName, config] of Object.entries(injections)) {
            const mode = config.mode || 'after';  // default to 'after'
            this.injectOrOverrideFunction(objectPrototype, functionName, mode, config.fn);
        }
    }

    // Convenience method: inject before calling original
    before(objectPrototype, functionName, targetFunction) {
        return this.injectOrOverrideFunction(objectPrototype, functionName, 'before', targetFunction);
    }

    // Convenience method: inject after calling original
    after(objectPrototype, functionName, targetFunction) {
        return this.injectOrOverrideFunction(objectPrototype, functionName, 'after', targetFunction);
    }

    // Convenience method: override completely (no original call)
    override(objectPrototype, functionName, targetFunction) {
        return this.injectOrOverrideFunction(objectPrototype, functionName, 'override', targetFunction);
    }

    removeInjections(objectPrototype) {
        for (let prototypeFunctionName in this.injections) {
            const functionNameArr = prototypeFunctionName.split(':');
            const objectPrototypeName = functionNameArr[0];
            if (objectPrototype.constructor.name !== objectPrototypeName) {
                continue;
            }
            const functionName = functionNameArr[1];
            if (this.injections[prototypeFunctionName] === undefined) {
                delete objectPrototype[functionName];
            } else {
                objectPrototype[functionName] = this.injections[prototypeFunctionName];
            }
            delete this.injections[prototypeFunctionName];
        }
        this.prototypes.delete(objectPrototype);
    }

    removeAllInjections() {
        for (const prototype of this.prototypes) {
            this.removeInjections(prototype);
        }
        this.prototypes.clear();
    }
}