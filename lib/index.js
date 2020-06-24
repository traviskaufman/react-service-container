import React, { useContext } from "react";

export const ServiceContainerContext = React.createContext(new Map());

export function ServiceContainer({ providers, children }) {
  const parent = useContext(ServiceContainerContext);
  const container = buildContainer(providers, parent);

  return (
    <ServiceContainerContext.Provider value={container}>
      {children}
    </ServiceContainerContext.Provider>
  );
}

export function useService(serviceToken) {
  const container = useContext(ServiceContainerContext);
  const initFn = container.get(serviceToken);
  return initFn();
}

function buildContainer(providers, parent) {
  const container = new Map(...parent);
  addProviders(container, providers);
  return container;
}

function addProviders(container, providers) {
  normalize(providers).forEach((provider) => {
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
        if (!container.has(provider.useExisting)) {
          throw new Error("(TODO: Good message about non-existent existing)");
        }
        initFn = container.get(provider.useExisting);
        break;
      default:
        throw new Error("(TODO: Good errors)");
    }

    container.set(provider.provide, initFn);
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
