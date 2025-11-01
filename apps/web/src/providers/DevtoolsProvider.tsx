import { NextDevtoolsProvider } from "@next-devtools/core";

export function DevtoolsProvider({ children }: { children: React.ReactNode }) {
  return <NextDevtoolsProvider>{children}</NextDevtoolsProvider>;
}
