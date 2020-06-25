import React, { useContext } from "react";

export class ServiceContainerEnvironment {
  constructor(parent = null) {
    this.parent = parent;
    this.providers = new Map();
  }

  get(serviceToken) {
    if (this.providers.has(serviceToken)) {
      const initFn = this.providers.get(serviceToken);
      return initFn();
    }

    if (this.parent != null) {
      // This will recursively call each parent container, until the base environment is hit in
      // which case the base case is thrown below.
      return this.parent.get(serviceToken);
    }

    throw new Error(`Missing provider for service ${serviceToken}`);
  }

  add(provider) {
    if (!("provide" in provider)) {
      throw new Error('Missing "provide" key');
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
        if (!this.providers.has(provider.useExisting)) {
          throw new Error("(TODO: Good message about non-existent existing)");
        }
        initFn = this.providers.get(provider.useExisting);
        break;
      default:
        throw new Error("(TODO: Good errors)");
    }

    this.providers.set(provider.provide, initFn);
  }
}

function readonlyProxy(env) {
  const proxy = {
    get(...args) {
      return env.get(...args);
    },
  };
  return proxy;
}

export const ServiceContainerContext = React.createContext(
  readonlyProxy(new ServiceContainerEnvironment())
);

export function ServiceContainer({ providers, children }) {
  const parent = useContext(ServiceContainerContext);
  const container = buildContainer(providers, parent);

  return (
    <ServiceContainerContext.Provider value={readonlyProxy(container)}>
      {children}
    </ServiceContainerContext.Provider>
  );
}

export function useService(serviceToken) {
  const container = useContext(ServiceContainerContext);
  return container.get(serviceToken);
}

function buildContainer(providers, parent) {
  const container = new ServiceContainerEnvironment(parent);
  addProviders(container, providers);
  return container;
}

function addProviders(container, providers) {
  normalize(providers).forEach((provider) => {
    container.add(provider);
  });
}

function normalize(providers) {
  return providers.map((provider) => {
    const assumeClassShorthand = !("provide" in provider);
    if (assumeClassShorthand) {
      return { provide: provider, useClass: provider };
    }
    return provider;
  });
}
