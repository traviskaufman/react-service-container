import { ServiceContainer, useService } from "./lib";
import React, { useEffect } from "react";
import renderer from "react-test-renderer";

test("useValue", () => {
  class Dep {
    fn() {}
  }
  const mock = jest.fn();
  const Component = () => {
    const dep = useService(Dep);
    useEffect(() => {
      dep.fn();
    }, []);
  };
  renderer.create(
    <ServiceContainer
      providers={[{ provide: Greeter, useValue: { fn: mock } }]}
    >
      <Component />
    </ServiceContainer>
  );

  expect(mock).toHaveBeenCalled();
});

test.todo("useClass");

test.todo("useFactory");

test.todo("useExisting");

test.todo("Hierarchal injection");

test.todo("Injection Tokens");

test.todo("Class components");
