// File: public/js/courses.js
// Admin Learning Hub (Courses) UI logic

const courses = {
  async list() {
    return api.get('/courses');
  },
  async add(course) {
    return api.post('/courses', course);
  },
  async delete(id) {
    return api.delete(`/courses/${id}`);
  }
};
window.courses = courses;
