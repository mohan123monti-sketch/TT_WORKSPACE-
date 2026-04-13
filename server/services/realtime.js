const { EventEmitter } = require('events');

const realtimeBus = new EventEmitter();
realtimeBus.setMaxListeners(200);

function publish(event, payload) {
  realtimeBus.emit(event, payload);
}

function subscribe(event, listener) {
  realtimeBus.on(event, listener);
  return () => realtimeBus.off(event, listener);
}

module.exports = {
  publish,
  subscribe
};
