// File: public/js/payments.js
// Admin Payment Management UI logic

const payments = {
  async list(user_id = null) {
    return api.get('/payments' + (user_id ? `?user_id=${user_id}` : ''));
  },
  async add(payment) {
    return api.post('/payments', payment);
  },
  async delete(id) {
    return api.delete(`/payments/${id}`);
  }
};
window.payments = payments;
