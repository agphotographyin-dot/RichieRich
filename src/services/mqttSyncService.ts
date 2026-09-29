import mqtt, { MqttClient } from 'mqtt';
import { safeStorage } from '../utils/safeStorage';

export const DEFAULT_MQTT_WS_URL = 'ws://187.126.115.40:9001';
export const DEFAULT_MQTT_TCP_PORT = '1883';

export interface MQTTConnectionState {
  isConnected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  brokerUrl: string;
  clientId: string;
  messagesSent: number;
  messagesReceived: number;
  lastMessageTopic?: string;
  lastActiveTime?: Date;
  errorMessage?: string;
}

type MQTTListener = (state: MQTTConnectionState) => void;

class MQTTSyncService {
  private client: MqttClient | null = null;
  private listeners = new Set<MQTTListener>();
  private clientId = `rr_pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  private state: MQTTConnectionState = {
    isConnected: false,
    status: 'disconnected',
    brokerUrl: this.getBrokerUrl(),
    clientId: this.clientId,
    messagesSent: 0,
    messagesReceived: 0,
  };

  private onDocumentReceivedCallback?: (collection: string, action: 'upsert' | 'delete' | 'batch', data: any) => void;

  public getBrokerUrl(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('rr_mqtt_broker_url');
      if (saved && saved.trim()) return saved.trim();
    }
    return DEFAULT_MQTT_WS_URL;
  }

  public setBrokerUrl(url: string) {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (url && url.trim()) {
        window.localStorage.setItem('rr_mqtt_broker_url', url.trim());
      } else {
        window.localStorage.removeItem('rr_mqtt_broker_url');
      }
    }
    this.reconnect(url || DEFAULT_MQTT_WS_URL);
  }

  public getState(): MQTTConnectionState {
    return { ...this.state };
  }

  public subscribeStatus(cb: MQTTListener): () => void {
    this.listeners.add(cb);
    cb(this.state);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb(this.state);
      } catch (err) {
        console.error('MQTT state subscriber error:', err);
      }
    });
  }

  public onRemoteDocument(callback: (collection: string, action: 'upsert' | 'delete' | 'batch', data: any) => void) {
    this.onDocumentReceivedCallback = callback;
  }

  public init() {
    if (typeof window === 'undefined') return;
    this.connect();
  }

  public connect(customUrl?: string) {
    const url = customUrl || this.getBrokerUrl();
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }

    this.state = {
      ...this.state,
      status: 'connecting',
      brokerUrl: url,
      errorMessage: undefined,
    };
    this.notify();

    try {
      this.client = mqtt.connect(url, {
        clientId: this.clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 5000,
      });

      this.client.on('connect', () => {
        this.state = {
          ...this.state,
          isConnected: true,
          status: 'connected',
          lastActiveTime: new Date(),
          errorMessage: undefined,
        };
        this.notify();

        // Subscribe to all Richie Rich sync topics
        this.client?.subscribe('richierich/sync/+/+', { qos: 1 });
        this.client?.subscribe('richierich/hardware/#', { qos: 1 });
        console.log(`[MQTT] ✅ Connected to Mosquitto Broker at ${url}`);
      });

      this.client.on('message', (topic, payload) => {
        try {
          this.state.messagesReceived++;
          this.state.lastMessageTopic = topic;
          this.state.lastActiveTime = new Date();
          this.notify();

          const messageStr = payload.toString();
          const parsed = JSON.parse(messageStr);

          // Ignore own messages
          if (parsed._senderId === this.clientId) return;

          // Topic format: richierich/sync/<collection>/<action>
          const parts = topic.split('/');
          if (parts[0] === 'richierich' && parts[1] === 'sync') {
            const collection = parts[2];
            const action = parts[3] as 'upsert' | 'delete' | 'batch';
            if (this.onDocumentReceivedCallback && collection && action) {
              this.onDocumentReceivedCallback(collection, action, parsed.data);
            }
          }
        } catch (err) {
          console.warn('[MQTT] Error handling incoming payload:', err);
        }
      });

      this.client.on('error', (err) => {
        this.state = {
          ...this.state,
          isConnected: false,
          status: 'error',
          errorMessage: err.message,
        };
        this.notify();
      });

      this.client.on('close', () => {
        if (this.state.status === 'connected') {
          this.state = {
            ...this.state,
            isConnected: false,
            status: 'disconnected',
          };
          this.notify();
        }
      });
    } catch (err: any) {
      this.state = {
        ...this.state,
        isConnected: false,
        status: 'error',
        errorMessage: err?.message || 'Connection failed',
      };
      this.notify();
    }
  }

  public publishSync(collection: string, action: 'upsert' | 'delete' | 'batch', data: any) {
    if (!this.client || !this.state.isConnected) return;

    try {
      const topic = `richierich/sync/${collection}/${action}`;
      const payload = JSON.stringify({
        _senderId: this.clientId,
        timestamp: Date.now(),
        data,
      });

      this.client.publish(topic, payload, { qos: 1 });
      this.state.messagesSent++;
      this.state.lastActiveTime = new Date();
      this.notify();
    } catch (err) {
      console.warn('[MQTT] Publish error:', err);
    }
  }

  /**
   * Broadcast hardware command to attached POS receipt printer or cash drawer
   */
  public publishHardwareCommand(target: 'printer' | 'drawer' | 'display', payload: any) {
    if (!this.client || !this.state.isConnected) return;
    try {
      const topic = `richierich/hardware/${target}`;
      this.client.publish(topic, JSON.stringify({
        _senderId: this.clientId,
        timestamp: Date.now(),
        ...payload,
      }), { qos: 1 });
      this.state.messagesSent++;
      this.notify();
    } catch {}
  }

  public reconnect(newUrl?: string) {
    this.connect(newUrl);
  }

  public disconnect() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }
    this.state = {
      ...this.state,
      isConnected: false,
      status: 'disconnected',
    };
    this.notify();
  }
}

export const mqttSync = new MQTTSyncService();
