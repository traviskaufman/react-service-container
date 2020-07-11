import React, { useContext } from "react";

const UNINSTANTIATED = Symbol.for("uninstantiated");

export type ServiceFor<T> = T extends new (...args: any[]) => infer R ? R : any;

export interface UseValueProvider<T> {
  provide: T;
  useValue: ServiceFor<T>;
}

export interface UseClassProvider<T> {
  provide: T;
  useClass: new (...args: any) => ServiceFor<T>;
}

export interface UseFactoryProvider<T> {
  provide: T;
  useFactory(): ServiceFor<T>;
}

export interface UseExistingProvider<T, R = T> {
  provide: T;
  useExisting: R;
}

export type Provider<T> =
  | (new (...args: any[]) => any)
  | UseValueProvider<T>
  | UseClassProvider<T>
  | UseFactoryProvider<T>
  | UseExistingProvider<T>;

export type Providers = Array<Provider<any>>;

export class ServiceContainerRegistry {
  private providers = new Map<any, any>();

  constructor(
    private readonly parent: ServiceContainerRegistryReadonlyProxy | null
  ) {
    this.parent = parent;
    this.providers = new Map();
  }

  get<T, R = ServiceFor<T>>(serviceToken: T): R {
    if (this.providers.has(serviceToken)) {
      const initFn = this.providers.get(serviceToken) as () => R;
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

  add<T>(provider: Provider<T>) {
    if (!("provide" in provider)) {
      const errorMsg =
        `[react-service-container] Missing "provide" key in object with key(s): ${stringifyKeys(
          provider
        )}. ` +
        'Each provider must specify a "provide" key as well as one of the correct use* values.';
      throw new Error(errorMsg);
    }

    let instance: ServiceFor<T> = UNINSTANTIATED as any;
    const initFn = () => {
      if (instance !== UNINSTANTIATED) {
        return instance;
      }

      let init;
      switch (true) {
        case "useValue" in provider:
          const value = (provider as UseValueProvider<T>).useValue;
          init = () => value;
          break;
        case "useClass" in provider:
          const Ctor = (provider as UseClassProvider<T>).useClass;
          init = () => new Ctor();
          break;
        case "useFactory" in provider:
          init = (provider as UseFactoryProvider<T>).useFactory;
          break;
        case "useExisting" in provider:
          const resolvedAlias = (provider as UseExistingProvider<T>)
            .useExisting;
          init = () => {
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

      instance = init();
      return instance;
    };

    this.providers.set((provider as any).provide, initFn);
  }
}

export type ServiceContainerRegistryReadonlyProxy = Pick<
  ServiceContainerRegistry,
  "get"
>;

export const ServiceContainerContext = React.createContext<ServiceContainerRegistryReadonlyProxy | null>(
  null
);

export type ServiceContainerProps = React.PropsWithChildren<{
  providers: Providers;
}>;

export function ServiceContainer({
  providers,
  children,
}: ServiceContainerProps) {
  const parent = useContext(ServiceContainerContext);
  const registry = buildRegistry(providers, parent);

  return (
    <ServiceContainerContext.Provider value={readonlyProxy(registry)}>
      {children}
    </ServiceContainerContext.Provider>
  );
}

export function useService<T, R = ServiceFor<T>>(serviceToken: T): R {
  const container = useContext(ServiceContainerContext);
  if (!container) {
    const errorMsg =
      "[react-service-container] Could not find service container context. It looks like you may have used the useService() hook " +
      "in a component that is not a child of a <ServiceContainer>...</>. Take a look at your component tree " +
      "and ensure that somewhere in the hierarchy before this component is rendered, there is a <ServiceContainer> " +
      "available";
    throw new Error(errorMsg);
  }
  return container.get<T, R>(serviceToken);
}

function readonlyProxy(
  registry: ServiceContainerRegistry
): ServiceContainerRegistryReadonlyProxy {
  const proxy = {
    get<T>(serviceToken: any): ServiceFor<T> {
      return registry.get<T>(serviceToken);
    },
  };
  return proxy;
}

function buildRegistry(
  providers: Providers,
  parent: ServiceContainerRegistryReadonlyProxy | null
) {
  const registry = new ServiceContainerRegistry(parent);
  addProviders(registry, providers);
  return registry;
}

function addProviders(
  registry: ServiceContainerRegistry,
  providers: Providers
) {
  normalize(providers).forEach((provider) => {
    registry.add(provider);
  });
}

function normalize(providers: Providers): Providers {
  return providers.map((provider) => {
    const assumeClassShorthand = typeof provider === "function";
    if (assumeClassShorthand) {
      return {
        provide: provider,
        useClass: provider as UseClassProvider<any>["useClass"],
      };
    }
    return provider;
  });
}

function stringifyKeys(obj: {}, filter = (k: string) => true) {
  return Object.keys(obj)
    .filter(filter)
    .map((k) => `"${k}"`)
    .join(", ");
}
