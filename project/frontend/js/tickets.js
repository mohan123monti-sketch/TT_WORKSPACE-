// File: public/js/tickets.js
// Tickets/Helpdesk UI logic

const tickets = {
  async list(mine = false) {
    return api.get('/tickets' + (mine ? '?mine=1' : ''));
  },
  async add(ticket) {
    return api.post('/tickets', ticket);
  },
  async update(id, data) {
    return api.put(`/tickets/${id}`, data);
  },
  async delete(id) {
    return api.delete(`/tickets/${id}`);
  }
};
window.tickets = tickets;
