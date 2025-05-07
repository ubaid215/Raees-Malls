import io from 'socket.io-client';
import mitt from 'mitt';

// Create a mitt event emitter instance
const emitter = mitt();

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(userId = null, role = null) {
    if (this.isConnected) return this.socket;

    this.socket = io(import.meta.env.VITE_API_BASE_PROD_URL || 'http://localhost:5000', {
      query: { userId, role },
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Forward Socket.IO connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Socket.IO connected');
      emitter.emit('connect');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Socket.IO disconnected');
      emitter.emit('disconnect');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      emitter.emit('connect_error', error);
    });

    // Forward relevant Socket.IO events to the mitt emitter
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
      console.log('Socket.IO manually disconnected');
    }
  }

  getSocket() {
    return this.socket;
  }

  getConnectionState() {
    return this.isConnected;
  }

  // Expose mitt's event handling methods
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