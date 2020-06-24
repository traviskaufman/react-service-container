import { ServiceContainer, useService } from "./lib";
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

test.todo("useExisting with injection tokens");

test.todo("Hierarchal injection");

test.todo("Class components");

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
