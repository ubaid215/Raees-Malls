import io from 'socket.io-client';
import mitt from 'mitt';

// Create a mitt event emitter instance
const emitter = mitt();

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
  }

  connect(userId = null, role = null) {
    if (this.isConnected || this.isConnecting) return this.socket;

    this.isConnecting = true;
    const apiUrl = import.meta.env.VITE_API_BASE_PROD_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    this.socket = io(apiUrl, {
      query: { userId, role },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.isConnecting = false;
      emitter.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.isConnecting = false;
      emitter.emit('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      emitter.emit('connect_error', error);
    });

    this.socket.on('discountCreated', (data) => emitter.emit('discountCreated', data));
    this.socket.on('discountApplied', (data) => emitter.emit('discountApplied', data));
    this.socket.on('orderCreated', (data) => emitter.emit('orderCreated', data));
    this.socket.on('orderStatusUpdated', (data) => emitter.emit('orderStatusUpdated', data));
    this.socket.on('reviewAdded', (data) => emitter.emit('reviewAdded', data));
    this.socket.on('wishlistUpdated', (data) => emitter.emit('wishlistUpdated', data));

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isConnecting = false;
      emitter.emit('disconnect', 'manual');
    }
  }

  getSocket() {
    return this.socket;
  }

  getConnectionState() {
    return this.isConnected;
  }

  on(event, handler) {
    emitter.on(event, handler);
  }

  off(event, handler) {
    emitter.off(event, handler);
  }

  emit(event, data) {
    emitter.emit(event, data);
  }
}

export default new SocketService();