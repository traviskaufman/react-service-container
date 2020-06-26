import { ServiceContainer, useService, ServiceContainerContext } from "../";
import React from "react";
import renderer from "react-test-renderer";

class Dep {
  fn() {}
}

const Component = () => {
  const dep = useService(Dep);
  return <p>{dep.fn()}</p>;
};

let mock;
beforeEach(() => {
  mock = jest.fn();
  jest.spyOn(console, "error").mockImplementation();
  jest.spyOn(console, "warn").mockImplementation();
});

afterEach(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
});

test("useValue", () => {
  renderWithProviders([{ provide: Dep, useValue: { fn: mock } }]);
  expect(mock).toHaveBeenCalled();
});

test("useClass", () => {
  class MockClass {
    fn() {
      mock();
    }
  }

  renderWithProviders([{ provide: Dep, useClass: MockClass }]);
  expect(mock).toHaveBeenCalled();
});

test("useFactory", () => {
  const factory = () => ({
    fn: mock,
  });

  renderWithProviders([{ provide: Dep, useFactory: factory }]);
  expect(mock).toHaveBeenCalled();
});

test("useExisting", () => {
  class Existing {
    fn() {
      mock();
    }
  }

  renderWithProviders([
    { provide: Existing, useClass: Existing },
    { provide: Dep, useExisting: Existing },
  ]);
  expect(mock).toHaveBeenCalled();
});

test("Class shorthand", () => {
  class MockDep {
    fn() {
      mock();
    }
  }

  const Component = () => {
    const mockDep = useService(MockDep);
    return <p>{mockDep.fn()}</p>;
  };

  renderer.create(
    <ServiceContainer providers={[MockDep]}>
      <Component />
    </ServiceContainer>
  );
  expect(mock).toHaveBeenCalled();
});

test("Injection Tokens", () => {
  const CONFIG = Symbol.for("config");
  const config = { message: "Hello, world!" };

  const Component = () => {
    const { message } = useService(CONFIG);
    return <p>{message}</p>;
  };
  const component = renderer.create(
    <ServiceContainer providers={[{ provide: CONFIG, useValue: config }]}>
      <Component />
    </ServiceContainer>
  );
  expect(component.toJSON()).toMatchSnapshot();
});

test("useExisting with injection tokens", () => {
  const V1 = Symbol.for("v1");
  const VALIAS = Symbol.for("vAlias");
  const v1 = "value 1";

  const Component = () => {
    const v1 = useService(VALIAS);
    return <p>{v1}</p>;
  };

  const component = renderer.create(
    <ServiceContainer
      providers={[
        { provide: V1, useValue: v1 },
        { provide: VALIAS, useExisting: V1 },
      ]}
    >
      <Component />
    </ServiceContainer>
  );
  expect(component.toJSON()).toMatchSnapshot();
});

test("Hierarchal injection", () => {
  const parentMock = jest.fn();
  const childMock = jest.fn();
  const overrideMock = jest.fn();
  const mockToBeOverriden = jest.fn();

  class ParentDep {
    fn() {
      parentMock();
    }
  }

  class Child {
    fn() {
      childMock();
    }
  }

  class DepToOverride {
    fn() {
      mockToBeOverriden();
    }
  }

  class Override {
    fn() {
      overrideMock();
    }
  }

  const Component = () => {
    const parent = useService(ParentDep);
    const child = useService(Child);
    const override = useService(DepToOverride);

    return (
      <p>
        {parent.fn()}
        {child.fn()}
        {override.fn()}
      </p>
    );
  };

  renderer.create(
    <ServiceContainer providers={[ParentDep, DepToOverride]}>
      <ServiceContainer
        providers={[Child, { provide: DepToOverride, useClass: Override }]}
      >
        <Component />
      </ServiceContainer>
    </ServiceContainer>
  );

  expect(parentMock).toHaveBeenCalled();
  expect(childMock).toHaveBeenCalled();
  expect(overrideMock).toHaveBeenCalled();
  expect(mockToBeOverriden).not.toHaveBeenCalled();
});

test("useExisting hierarchal override", () => {
  const parentMock = jest.fn();
  const childMock = jest.fn();

  class ParentDep {
    fn() {
      parentMock();
    }
  }

  class Child {
    fn() {
      childMock();
    }
  }

  const Component = () => {
    const dep = useService(Child);
    return <p>{dep.fn()}</p>;
  };

  renderer.create(
    <ServiceContainer providers={[ParentDep]}>
      <ServiceContainer
        providers={[{ provide: Child, useExisting: ParentDep }]}
      >
        <Component />
      </ServiceContainer>
    </ServiceContainer>
  );
  expect(parentMock).toHaveBeenCalled();
  expect(childMock).not.toHaveBeenCalled();
});

test("Class components", () => {
  let mock = jest.fn();

  class Dep {
    fn() {
      mock();
    }
  }

  class Component extends React.Component {
    render() {
      const dep = this.context.get(Dep);
      return <p>{dep.fn()}</p>;
    }
  }
  Component.contextType = ServiceContainerContext;

  renderer.create(
    <ServiceContainer providers={[Dep]}>
      <Component />
    </ServiceContainer>
  );
  expect(mock).toHaveBeenCalled();
});

test("Descriptive error message when useService cannot find context", () => {
  const Component = () => {
    const dep = useService(Dep);
    return <p>{dep.fn()}</p>;
  };

  expect(() => {
    renderer.create(<Component />);
  }).toThrow(
    "Could not find service container context. It looks like you may have used the useService() hook " +
      "in a component that is not a child of a <ServiceContainer>...</>. Take a look at your component tree " +
      "and ensure that somewhere in the hierarchy before this component is rendered, there is a <ServiceContainer> " +
      "available"
  );
});

test("Descriptive error when missing provider", () => {
  expect(() => {
    renderer.create(
      <ServiceContainer providers={[]}>
        <Component />
      </ServiceContainer>
    );
  }).toThrow('Think of this as a "missing variable" error');
});

test("Descriptive error when provider function throws", () => {
  const err = new Error("Provider error");
  expect(() => {
    renderer.create(
      <ServiceContainer
        providers={[
          {
            provide: Dep,
            useFactory: () => {
              throw err;
            },
          },
        ]}
      >
        <Component />
      </ServiceContainer>
    );
  }).toThrow(err);
  expect(console.error).toHaveBeenCalledWith(
    `[react-service-container] Provider for ${Dep} threw an error. Please check the error output below for more information.`
  );
});

test("Descriptive error message when useExisting lookup fails", () => {
  const ALIAS = Symbol.for("alias");
  const Component = () => {
    const dep = useService(ALIAS);
    return <p>{dep.fn()}</p>;
  };

  expect(() => {
    renderer.create(
      <ServiceContainer providers={[{ provide: ALIAS, useExisting: Dep }]}>
        <Component />
      </ServiceContainer>
    );
  }).toThrow(
    "It looks like you passed a token to `useExisting` that was not registered as a provider. " +
      "Ensure that the token given is registered *before* the alias is referenced. If the value reference by " +
      "the alias is provided within the same providers array as the alias, ensure that it comes before the alias " +
      "in the providers array."
  );
});

test("Descriptive error when provider is malformed", () => {
  // Missing provide
  const noProvideKey = { foo: "bar" };
  expect(() => {
    renderer.create(
      <ServiceContainer providers={[noProvideKey]}>
        <Component />
      </ServiceContainer>
    );
  }).toThrow(
    `[react-service-container] Missing "provide" key in object with key(s): "foo". Each provider must specify a "provide" key as well as one of the correct use* values.`
  );

  // Missing correct value to go with provide
  const wrongUseKey = { provide: Dep, useCls: Dep };
  expect(() => {
    renderer.create(
      <ServiceContainer providers={[wrongUseKey]}>
        <Component />
      </ServiceContainer>
    );
  }).toThrow(
    '[create-service-container] Provider missing proper use* value in key(s): "useCls". ' +
      'Possible values are: ["useValue", "useClass", "useFactory", "useExisting"]'
  );
});

function renderWithProviders(providers) {
  return renderer.create(
    <ServiceContainer providers={providers}>
      <Component />
    </ServiceContainer>
  );
}
