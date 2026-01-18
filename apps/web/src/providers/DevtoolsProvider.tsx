export function DevtoolsProvider({ children }: { children: React.ReactNode }) {
  // @next-devtools is not compatible with Next.js 16.1.3+
  // Just return children for now until the package is updated
  return <>{children}</>;
}
