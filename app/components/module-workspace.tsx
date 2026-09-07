import { Children, isValidElement, ReactElement, ReactNode } from "react";

type ModuleViewProps = {
  name: string;
  children: ReactNode;
};

export function ModuleView({ children }: ModuleViewProps) {
  return children;
}

export function ModuleWorkspace({
  active,
  modules,
  children,
}: {
  active: string;
  modules: readonly string[];
  children: ReactNode;
}) {
  if (!modules.includes(active)) return null;
  const views = Children.toArray(children).filter(isValidElement) as ReactElement<ModuleViewProps>[];
  return views.find((view) => view.props.name === active) ?? null;
}
