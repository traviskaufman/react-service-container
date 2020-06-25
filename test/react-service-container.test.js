import { ServiceContainer, useService, ServiceContainerContext } from "../lib";
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

test.todo("Descriptive error message when useService cannot find context");

test.todo("Descriptive error when missing provider");

test.todo("Descriptive error when provider function throws");

test.todo("Descriptive error message when useExisting lookup fails");

test.todo("Warn when overriding existing provider (in development?)");

function renderWithProviders(providers) {
  return renderer.create(
    <ServiceContainer providers={providers}>
      <Component />
    </ServiceContainer>
  );
}
