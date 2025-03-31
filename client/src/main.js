// src/main.js
import './assets/main.css';

import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import router from './router';


// Create the app
const app = createApp(App);

// Use plugins
app.use(router);
app.use(ui);

// Mount the app
app.mount('#app');
