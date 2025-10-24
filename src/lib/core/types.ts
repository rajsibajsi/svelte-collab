import type { IndexeddbPersistence } from "y-indexeddb";
import type { WebsocketProvider } from "y-websocket";
import type * as Y from "yjs";

/**
 * Configuration options for collabWritable store
 */
export interface CollabOptions {
  /**
   * Unique room/document identifier
   */
  room: string;

  /**
   * WebSocket server URL (e.g., 'ws://localhost:1234')
   * Optional - if not provided, only local state is maintained
   */
  serverUrl?: string;

  /**
   * Enable IndexedDB persistence
   * @default true
   */
  persist?: boolean;

  /**
   * User information for presence/awareness
   */
  user?: UserInfo;

  /**
   * Custom Y.Doc instance (advanced usage)
   */
  ydoc?: Y.Doc;

  /**
   * Name of the Y.Map to use within the document
   * @default 'state'
   */
  stateName?: string;

  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  connectTimeout?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * User information for presence/awareness features
 */
export interface UserInfo {
  id?: string;
  name: string;
  color?: string;
  avatar?: string;
  [key: string]: any;
}

/**
 * Connection status states
 */
export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/**
 * Connection state information
 */
export interface ConnectionState {
  status: ConnectionStatus;
  error?: Error;
  retries?: number;
  lastConnected?: Date;
}

/**
 * Enhanced Svelte store with collaboration features
 */
export interface CollabStore<T> {
  subscribe: (run: (value: T) => void) => () => void;
  set: (value: T) => void;
  update: (updater: (value: T) => T) => void;

  /**
   * Get the underlying Y.Doc
   */
  getDoc: () => Y.Doc;

  /**
   * Get the Y.Map instance
   */
  getYMap: () => Y.Map<any>;

  /**
   * Get connection state
   */
  getConnectionState: () => ConnectionState;

  /**
   * Subscribe to connection state changes
   */
  subscribeConnection: (run: (state: ConnectionState) => void) => () => void;

  /**
   * Manually connect/disconnect
   */
  connect: () => void;
  disconnect: () => void;

  /**
   * Destroy the store and clean up resources
   */
  destroy: () => void;
}

/**
 * Providers attached to a document
 */
export interface CollabProviders {
  websocket?: WebsocketProvider;
  indexeddb?: IndexeddbPersistence;
}

/**
 * Internal store state
 */
export interface StoreState<T> {
  value: T;
  ydoc: Y.Doc;
  ymap: Y.Map<any>;
  providers: CollabProviders;
  connectionState: ConnectionState;
  options: Required<CollabOptions>;
  subscribers: Set<(value: T) => void>;
  connectionSubscribers: Set<(state: ConnectionState) => void>;
  destroyed: boolean;
}
