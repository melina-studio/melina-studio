import { WebSocketProvider } from "@/providers/WebsocketProvider";

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WebSocketProvider>{children}</WebSocketProvider>;
}
