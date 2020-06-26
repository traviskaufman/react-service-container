import React, { useContext } from "react";

export class ServiceContainerRegistry {
  constructor(parent) {
    this.parent = parent;
    this.providers = new Map();
  }

  get(serviceToken) {
    if (this.providers.has(serviceToken)) {
      const initFn = this.providers.get(serviceToken);
      try {
        return initFn();
      } catch (err) {
        console.error(
          `[react-service-container] Provider for ${String(
            serviceToken
          )} threw an error. ` +
            "Please check the error output below for more information."
        );
        throw err;
      }
    }

    if (this.parent != null) {
      // This will recursively call each parent registry, until the base environment is hit in
      // which case the base case is thrown below.
      return this.parent.get(serviceToken);
    }

    const errorMsg =
      `[react-service-container] Could not find provider for token ${String(
        serviceToken
      )}. ` +
      'Think of this as a "missing variable" error. Ensure that in one of your parent ' +
      "service containers, you have configured your providers array to provide a value for this type.";
    throw new Error(errorMsg);
  }

  add(provider) {
    if (!("provide" in provider)) {
      const errorMsg =
        `[react-service-container] Missing "provide" key in object with key(s): ${stringifyKeys(
          provider
        )}. ` +
        'Each provider must specify a "provide" key as well as one of the correct use* values.';
      throw new Error(errorMsg);
    }

    let initFn;
    switch (true) {
      case "useValue" in provider:
        const value = provider.useValue;
        initFn = () => value;
        break;
      case "useClass" in provider:
        const Ctor = provider.useClass;
        initFn = () => new Ctor();
        break;
      case "useFactory" in provider:
        initFn = provider.useFactory;
        break;
      case "useExisting" in provider:
        const resolvedAlias = provider.useExisting;
        initFn = () => {
          try {
            return this.get(resolvedAlias);
          } catch (_) {
            const errorMessage =
              `[react-service-container] Failed alias lookup for useExisting provider ${String(
                provider
              )}. ` +
              "It looks like you passed a token to `useExisting` that was not registered as a provider. " +
              "Ensure that the token given is registered *before* the alias is referenced. " +
              "If the value reference by the alias is provided within the same providers array as the alias, " +
              "ensure that it comes before the alias in the providers array.";
            throw new Error(errorMessage);
          }
        };
        break;
      default:
        const errorMsg =
          `[create-service-container] Provider missing proper use* value in key(s): ${stringifyKeys(
            provider,
            (k) => k !== "provide"
          )}. ` +
          'Possible values are: ["useValue", "useClass", "useFactory", "useExisting"]';
        throw new Error(errorMsg);
    }

    this.providers.set(provider.provide, initFn);
  }
}

function readonlyProxy(registry) {
  const proxy = {
    get(...args) {
      return registry.get(...args);
    },
  };
  return proxy;
}

export const ServiceContainerContext = React.createContext(null);

export function ServiceContainer({ providers, children }) {
  const parent = useContext(ServiceContainerContext);
  const registry = buildRegistry(providers, parent);

  return (
    <ServiceContainerContext.Provider value={readonlyProxy(registry)}>
      {children}
    </ServiceContainerContext.Provider>
  );
}

export function useService(serviceToken) {
  const container = useContext(ServiceContainerContext);
  if (!container) {
    const errorMsg =
      "[react-service-container] Could not find service container context. It looks like you may have used the useService() hook " +
      "in a component that is not a child of a <ServiceContainer>...</>. Take a look at your component tree " +
      "and ensure that somewhere in the hierarchy before this component is rendered, there is a <ServiceContainer> " +
      "available";
    throw new Error(errorMsg);
  }
  return container.get(serviceToken);
}

function buildRegistry(providers, parent) {
  const registry = new ServiceContainerRegistry(parent);
  addProviders(registry, providers);
  return registry;
}

function addProviders(registry, providers) {
  normalize(providers).forEach((provider) => {
    registry.add(provider);
  });
}

function normalize(providers) {
  return providers.map((provider) => {
    const assumeClassShorthand = typeof provider === "function";
    if (assumeClassShorthand) {
      return { provide: provider, useClass: provider };
    }
    return provider;
  });
}

function stringifyKeys(obj, filter = () => true) {
  return Object.keys(obj)
    .filter(filter)
    .map((k) => `"${k}"`)
    .join(", ");
}
