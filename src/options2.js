import '@/assets/styles/options.css';

import { mount } from 'svelte';
import App from '@/components/options/PageOptions.svelte';
// import App from '@/components/options/TestTest.svelte';

mount(App, {
  target: document.getElementById('app2'),
});

// import { createApp } from 'vue';

// import App from '@/components/options/PageOptions.vue';

// const app = createApp(App);

// app.mount('#app');
