export type LiveLocationOptions = {
  wsUrl: string;
  updateInterval?: number;
  onOpen?: () => void;
  onMessage?: (message: MessageEvent) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
};
