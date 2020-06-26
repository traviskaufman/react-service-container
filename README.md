# react-service-container

Simple, robust, idiomatic service locator (?) library for react applications.

Just define a service...

```jsx
// greeter.js

export default class Greeter {
  greet() {
    return "👋 Hello there!";
  }
}
```

Provide it within a container...

```jsx
// App.js
import React from "react";
import { ServiceContainer } from "react-service-container";
import Greeter from "./greeter";
import Greeting from "./Greeting";

export default function App() {
  return (
    <ServiceContainer providers={[Greeter]}>
      <Greeting />
    </ServiceContainer>
  );
}
```

...and use it within your components

```jsx
// Greeting.js
import React from "react";
import { useService } from "react-service-container";
import Greeter from "./greeter";

export default function Greeting() {
  const greeter = useService(Greeter);
  return <h1>{greeter.greet()}</h1>;
}
```

Testing your components is also a breeze:

```jsx
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Greeter from "./greeter";
import Greeting from "./greeting";

// Greeting.spec.js
test("renders a greeting", () => {
  const fakeGreet = jest.fn();
  fakeGreet.mockReturnValue("expected greeting");

  const { asFragment } = render(
    <ServiceContainer
      providers={[{ provide: Greeter, useValue: { greet: fakeGreet } }]}
    >
      <Greeting />
    </ServiceContainer>
  );

  expect(asFragment()).toHaveTextContent("expected greeting");
});
```

- [x] Dead simple to use. No annotations, reflect-metadata, etc. needed
- [x] Idiomatically React. First-class support for hooks and components, includes react-style descriptive error messages.
- [x] Supports hierarchal containers for lazy loading and code splitting.
- [ ] First-class TypeScript support
- [x] Fully tested with 100% code coverage

It's not really a DI library because it is only concerned with providing "non-components" to components.

Based off of the [Service Locator](https://martinfowler.com/articles/injection.html#UsingAServiceLocator) pattern,
inspired by [apollo-client]().

### Motivation

Good use-case is when your apps consist of self-contained pages where Redux isn't really necessary and you can't /
don't want to use GraphQL. More in a blog post?

I'm not a crazy huge fan of Jest's module mocking. I find that explicitly specifying the services my components rely
upon make me less likely to mock out implementation details and draw clear boundaries around separation of concern.

## Installation

```
npm i -S react-service-container
```

## Usage

Define your service container and providers, then use the hook within your components.

Providers are the same as those used in [Angular](https://angular.io/guide/dependency-injection-providers).

> **TIP**: Try and keep services used within container components only.

### Using Hierarchal Containers

Use-case: Code-splitting multiple sections.

### Wrapping non-class dependencies

Provide is _simple_. `provide` can be any JS object. Theoretically `{provide: 'hello!', useValue: {...}}` would work.
If you want to inject something that's not a class, try using [Symbols](http://mdn.io/Symbol).

```jsx
/** config.js */

export const config = {
  ...,
};

// NOTE: A string would work fine as well, if you wanted to be simpler. My preference
// is to go for Symbols since they're completely unambiguous.
export const CONFIG = Symbol.for("config");

/** App.js */

import CONFIG, config from "./config";

function App() {
  return <ServiceContainer providers={[{provide: CONFIG, useValue: config}]}>{...}</ServiceContainer>
}
```

### Usage within class components

```jsx
/* Greeting.js */

import React from "react";
import { ServiceContainerContext } from "react-service-container";
import Greeter from "./greeter";

class MyComponent extends React.Component {
  static contextType = ServiceContainerContext;

  render() {
    const greeter = this.context.get(Greeter);
    return <p>{greeter.greet()}</p>;
  }
}
```

Service containers can be easily used without hooks in class components as well. Simply set
the component's `contextType` property to `ServiceContainerContext` and use `this.context.get()`
inside the render method or anywhere else that's needed.
