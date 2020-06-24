import React, { useContext } from "react";

export const ServiceContainerContext = React.createContext(new Map());

/**
 * Assume `providers` currently just accepts {provide, useValue} objects.
 */
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
  providers.forEach((provider) => {
    if (!("provide" in provider)) {
      throw new Error('Missing "provide" key');
    }

    let initFn;
    switch (true) {
      case "useValue" in provider:
        const value = provider.useValue;
        initFn = () => value;
        break;
      default:
        throw new Error("Provider missing value property");
    }

    container.set(provider.provide, initFn);
  });
}
