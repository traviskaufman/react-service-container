# react-service-container

react-service-container is a library which helps your components get the services they need in an
easy, clean, and testable manner.

Simply define a service

```jsx
// greeter.js

export default class Greeter {
  greet() {
    return "👋 Hello there!";
  }
}
```

provide it within a `ServiceContainer`

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

and use it within your components:

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

Testing your components is a breeze:

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

The library is based off of the [Service Locator](https://martinfowler.com/articles/injection.html#UsingAServiceLocator) pattern, and the API is inspired by [apollo-client](https://github.com/apollographql/apollo-client).

### Features

- [x] Dead simple to use. No annotations, reflect-metadata, etc. needed
- [x] Idiomatically React. First-class support for hooks and components. Includes react-style descriptive error messages.
- [x] Supports hierarchal containers for lazy loading and code splitting.
- [x] First-class TypeScript support
- [x] Fully tested with 100% code coverage

Unlike similar libraries, this is **not** a dependency injection library. The sole purpose of this library
is to provide components with services.

### Motivation

Many react codebases I've worked on have a structure such that each page constitutes a piece of self-contained
functionality, for example listing resources, editing a specific resource, or dealing with user settings (
this for example is common in "Admin" UIs). For apps like these, I find libraries like [Redux](https://redux.js.org/)
add a lot of boilerplate and indirection while not providing as much mileage as say, a more fully-featured
and complex single-page application.

I began looking into Apollo in order for a Redux replacement, but for many applications, especially legacy ones,
using something like GraphQL is infeasible, and even using something like [apollo-rest-client](https://www.apollographql.com/docs/link/links/rest/) is limiting in that you can only use it for data transfer.

However, I really loved the idiom of using providers and hooks in order to get a "handle" to a service (e.g. `useQuery()` / `useMutation()` from Apollo), and wanted to try and generalize this concept for generic services. This turned
out to work well for my use cases, and hence `react-service-container` was born.

Once I started using it, I realized I also preferred providing service mocks in tests explicitly vs. using Jest's
[module mocking](https://jestjs.io/docs/en/mock-functions#mocking-modules). I find that explicitly specifying the services my components rely upon make me less likely to
mock out implementation details and draw clear boundaries around separation of concern. I also prefer to encapsulate
services as classes (call me old-school I guess?), and found Jest's ES6 class mocking to be a bit difficult.
This of course is just my personal opinion :smiley:

## Installation

```
npm i -S react-service-container
```

### UMD Builds

UMD builds can be found in the npm package's `umd/` folder, containing both development (`react-service-container.js`)
and production (`react-service-container.min.js`) builds. Source maps are included in the folder.

If you'd like to include react-service-container using a `<script>` tag, you can use [unpkg](https://unpkg.com/) to
do so.

```html
<script src="https://unpkg.com/react-service-container/umd/react-service-container.min.js"></script>
```

## Usage

### Providing services

In order to use `react-service-container`, you must create a top-level `ServiceContainer` component, and pass it
a list of **providers** via its `providers` prop that tell `react-service-container` what services are available,
and how to constructor them.

```jsx
import Greeter from "./greeter";
import ApiClient from "./apiClient";

ReactDOM.render(
  <ServiceContainer
    providers={[
      Greeter,
      {
        provide: ApiClient,
        useValue: new ApiClient({ endpoint: "http://example.com/api" }),
      },
    ]}
  >
    <PageComponent />
  </ServiceContainer>
);
```

You can then use the `useService()` hook within your components in order to make use of a service.

**NOTE**: Each service is only instantiated _once_, the first time `useService()` is called.

#### The Provider API

> If you're familiar with [Angular's DI providers](https://angular.io/guide/dependency-injection-providers), you're familiar with ours. The API is pretty much the same.

Providers come in two forms:

- An object with a `provide` key whose value is the **service token** you wish to use to represent the service provided, and an additional key the options of which are described below.
- A `Function` object you pass as a shorthand for `{provide: Function, useClass: Function}`

The providers you can use are listed below in the code example:

```js
class MyService {}

const providers = [
  MyService, // Class shorthand
  { provide: MyService, useClass: MyService }, // Equivalent to the above
  { provide: MyService, useValue: new MyService() }, // Provide a concrete value to be used
  { provide: MyService, useFactory: () => new MyService() }, // Provide a factory function, useful for configuring the service
];
```

You can also alias dependencies via `useExisting`

```js
class NewService {}

const providers = [MyService, { provide: NewService, useExisting: MyService }];
```

This is useful for gradually deprecating APIs.

See the tests in this repo for example of using each.

### Using Hierarchal Containers

`react-service-container` fully supports hierarchal `<ServiceContainer>` components. When `<ServiceContainer>`
components are nested within one another, `useService()` calls act exactly like variable lookups: starting from the inner-most to the outer-most service container, the first service token found will be used.

Using hierarchal service containers not only lets you keep different parts of your codebase cleanly separated, but
it allows for [lazy loading](https://reactjs.org/docs/code-splitting.html) of services at the time in which you need it.

Say you have an app which shows a list of TODOs, as well as a settings page. You lazily load the page since users tend to navigate to either one page or the other, most likely TODOs. Chances are that the services
for the TODOs page might be different than those used for the settings page. However, some, such as getting
information about the current user, might be shared across the entire application. Using hierarchal service containers
allows the top-level application to contain shared modules, while lazily loaded feature modules can configure their services at load time.

```jsx
// src/todos/index.js

import React from "react";
import { ServiceContainer } from "react-service-container";
import TodosService from "./todosService";

export default function Todos() {
  return (
    <ServiceContainer providers={[TodosService]}>
      {/* Render TODOs */}
    </ServiceContainer>
  );
}
```

```jsx
// src/settings/index.js

import React from "react";
import { ServiceContainer } from "react-service-container";
import SettingsService from "./settingsService";

export default function Settings() {
  return (
    <ServiceContainer providers={[SettingsService]}>
      {/* Render settings */}
    </ServiceContainer>
  );
}
```

```js
// src/App.js

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { ServiceContainer } from "react-service-container";

// Common dependency
import UserService from "./userService";
// Loading indicator
import Loading from "./components/Loading";

// Lazily loaded components
const Todos = lazy(() => import("./todos"));
const Settings = lazy(() => import("./settings"));

export default function App() {
  return (
    <ServiceContainer providers={[UserService]}>
      <Router>
        <Suspense fallback={<Loading />}>
          <Switch>
            <Route path="/app" component={Todos} />
            <Route path="/settings" component={Settings} />
            <Route exact path="/">
              <Redirect to="/app" />
            </Route>
          </Switch>
        </Suspense>
      </Router>
    </ServiceContainer>
  );
}
```

Now any components/hooks under `Todos` or `Settings` can call `useService(UserService)`, but only components/hooks under `Todos` can
call `useService(TodosService)` and same for `Settings` and `useService(SettingsService)`;

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

import {CONFIG, config} from "./config";

function App() {
  return <ServiceContainer providers={[{provide: CONFIG, useValue: config}]}>{...}</ServiceContainer>
}
```

### Usage within class components

Service containers can be easily used without hooks in class components as well. Simply set
the component's `contextType` property to `ServiceContainerContext` and use `this.context.get()`
inside the render method or anywhere else that's needed.

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

### Usage with TypeScript

`react-service-container` is written in TypeScript, and comes with first-class support for it. When using `Function`
objects, such as class constructors, with `useService()`, it is properly typed as an instance of that constructor.

Let's take the example from the introduction and rewrite it in TypeScript.

```ts
// greeter.ts

export default class Greeter {
  greet(): string {
    return "👋 Hello there!";
  }
}
```

```tsx
// App.tsx
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

```tsx
// Greeting.tsx
import React from "react";
import { useService } from "react-service-container";
import Greeter from "./greeter";

export default function Greeting() {
  const greeter = useService(Greeter);
  return <h1>{greeter.greet()}</h1>;
}
```

In the above component, `greeter` is correctly typed to `Greeter`, ensuring type correctness and consistency.

#### Non-class services

What about the `config` example earlier?

```tsx
/** config.ts */

export interface Config {/* ... */}

export const config: Config = {
  ...,
};

export const CONFIG = Symbol.for("config");

/** App.tsx */

import {CONFIG, config} from "./config";

function App() {
  return <ServiceContainer providers={[{provide: CONFIG, useValue: config}]}>{...}</ServiceContainer>
}
```

Here's how we might use that in a component:

```tsx
// Component.tsx
import { useService } from "react-service-container";
import { CONFIG } from "./config";

export default function Component() {
  const config = useService(CONFIG);
  // render component
}
```

Here, `config` is typed as `any`. This is because based on the given Symbol, TypeScript does not _statically_ know
what type the value associated with that symbol is; the symbol could represent any type.

However, because it's cast to `any`, we can easily typecast the result

```tsx
import { useService } from "react-service-container";
import { CONFIG, Config } from "./config";

export default function Component() {
  const config = useService(CONFIG);
  // render component
}
const config = useService(CONFIG) as Config;
```

This is still less than ideal, since the TypeCasting is ugly and can be repetitive. Here is my preferred approach:

```tsx
// config.ts
import {useService} from 'react-service-container';

export interface Config {/* ... */}

export const config: Config = {
  ...,
};

const configToken = Symbol.for("config");

export const CONFIG_PROVIDER = {
  provide: configToken,
  useValue: config
};

export const useConfig = () => useService(configToken) as Config;
```

By providing a custom `useConfig` hook, and defining the provider within the component, it dramatically reduces the
error surface and repetition of doing manual type-checking, and allows you to abstract away the service token for the config itself.

```tsx
// App.tsx
import {ServiceContainer} from 'react-service-container';
import {CONFIG_PROVIDER} from './config';

function App() {
  return <ServiceContainer providers={[CONFIG_PROVIDER]}>{...}</ServiceContainer>
}

// Component.tsx

import {useConfig} from './config';

export default function Component() {
  const config = useConfig();
  // render component using config, which is now correctly typed.
}
```

# License

MIT
