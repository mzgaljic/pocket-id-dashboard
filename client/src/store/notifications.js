// client/src/store/notifications.js
import { reactive } from 'vue';

export const notifications = reactive({
  items: [],
  add(notification) {
    const id = Date.now().toString();
    const item = {
      id,
      title: notification.title || '',
      description: notification.description || '',
      color: notification.color || 'primary',
      icon: notification.icon || null,
      timeout: notification.timeout || 5000
    };

    this.items.push(item);

    if (item.timeout) {
      setTimeout(() => {
        this.remove(id);
      }, item.timeout);
    }

    return id;
  },
  remove(id) {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }
});
