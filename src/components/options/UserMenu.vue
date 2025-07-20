<template>
  <div
    v-if="props.isLoggedIn"
    class="flex items-center gap-2"
  >
    <div class="relative">
      <button
        :id="triggerId"
        class="
          dropdown-trigger flex items-center gap-2 transition-opacity
          hover:opacity-80
        "
      >
        <img
          v-if="props.userData.image"
          :src="props.userData.image"
          alt="Last.fm Profile pic"
          class="h-8 w-8 rounded-full"
        >
        <strong>{{ props.userData.name }}</strong>
      </button>
      <div
        :id="dropdownId"
        ref="userDropdown"
        class="
          dropdown-menu w-48 rounded-md border border-gray-200 bg-white shadow-lg transition-all
          duration-200
        "
      >
        <div class="py-1">
          <a
            :href="props.userData.url"
            target="_blank"
            class="
              block px-4 py-2 text-sm text-gray-700 transition-colors duration-150
              hover:bg-gray-100
            "
          >
            Last.fm Profile
          </a>
          <button
            class="
              block w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors duration-150
              hover:bg-gray-100
            "
            @click="logout"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const userDropdown = ref(null);

const uniqueId = 'user-dropdown-' + Math.random().toString(36).slice(2) + Date.now();
const dropdownId = `#${uniqueId}-dropdown`;
const triggerId = `#${uniqueId}-trigger`;

const props = defineProps({
  isLoggedIn: { type: Boolean, required: true },
  userData: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && typeof value.name === 'string' && typeof value.url === 'string'
    }
  }
});

const emit = defineEmits(['logout']);

const logout = () => {
  emit('logout');
}
</script>

<style scoped>
.dropdown-menu {
  background: canvas;
  color: currentColor;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
  min-width: 200px;
  padding: 4px 0;
  z-index: 1000;
  position: absolute;
  top: 100%;
  right: 0;

  a, button {
    color: currentColor;
  }
  /* margin-top: 4px; */
}

@media (hover: hover) and (pointer: fine) {
  /* Hide dropdown by default on desktop */
  .dropdown-menu {
    display: none;
  }

  /* Show dropdown on button hover */
  .dropdown-trigger:hover + .dropdown-menu {
    display: block;
  }

  /* Keep dropdown visible when hovering over it */
  .dropdown-menu:hover {
    display: block;
  }

  /* Disable popover behavior on desktop */
  .dropdown-menu {
    /* Reset popover styles that might interfere */
    /* position: absolute;
    inset: unset; */
  }

  /* Prevent popover from opening on click on desktop */
  .dropdown-trigger {
    pointer-events: auto;
  }
}

/* MOBILE BEHAVIOR: Touch devices without hover capability */
@media (hover: none) or (pointer: coarse) {
  /* Hide dropdown when popover is closed */
  .dropdown-menu:not(:popover-open) {
    display: none;
  }

  /* Position dropdown relative to viewport on mobile */
  .dropdown-menu {
    position: fixed;
    inset: unset;
    margin: 0;
  }

  /* Mobile-specific adjustments */
  .dropdown-menu {
    min-width: 250px;
    max-width: 90vw;
  }

  /* Larger touch targets on mobile */
  .dropdown-menu a {
    /* padding: 12px 16px;
    font-size: 16px; */
  }

  /* Button adjustments for mobile */
  .dropdown-trigger {
    /* padding: 14px 18px;
    font-size: 16px;
    min-height: 48px; Minimum touch target size */
  }
}

/* TABLET BEHAVIOR: Devices that support both hover and touch */
@media (hover: hover) and (pointer: coarse) {
  /* Use popover behavior on tablets */
  .dropdown-menu:not(:popover-open) {
    display: none;
  }

  /* Adjust sizing for tablets */
  .dropdown-menu {
    /* min-width: 220px; */
  }

  /* .dropdown-menu a {
    padding: 10px 14px;
    font-size: 15px;
  } */
}
</style>