import React from "react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<Record<string, unknown>>, options?: { loading?: () => React.ReactNode }) => {
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = React.useState<React.ComponentType<Record<string, unknown>> | null>(null);

      React.useEffect(() => {
        let active = true;
        void loader().then((module) => {
          const resolved = (module.default ??
            Object.values(module).find((value) => typeof value === "function")) as React.ComponentType<Record<string, unknown>> | undefined;
          if (active && resolved) {
            setComponent(() => resolved);
          }
        });
        return () => {
          active = false;
        };
      }, []);

      if (!Component) {
        return options?.loading ? React.createElement(React.Fragment, null, options.loading()) : null;
      }

      return React.createElement(Component, props);
    };
  }
}));
