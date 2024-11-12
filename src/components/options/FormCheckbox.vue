<template>
  <div
    class="form-item flex flex-col gap-1"
    :class="{ 'pointer-events-none opacity-50': $attrs.disabled }"
  >
    <div class="form-input">
      <label
        :for="props.name"
        class="flex items-center cursor-pointer gap-2"
      >
        <div class="relative">
          <input
            :id="props.name"
            :checked="props.modelValue"
            type="checkbox"
            class="sr-only peer"
            v-bind="$attrs"
            @input="$emit('update:modelValue', $event.target.checked)"
          >
          <div
            class="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-focus-visible:ring-4 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-800 peer-checked:bg-blue-600"
            :title="`Click to ${props.modelValue ? 'disable' : 'enable'}`"
          />
        </div>
        <span class="text-lg font-bold">{{ props.label }}</span>
      </label>
    </div>
  </div>
</template>
<script setup>
import { defineProps, defineEmits, defineOptions } from 'vue';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Boolean,
    required: true,
  }
});

defineEmits(['update:modelValue']);

defineOptions({
  name: 'FormCheckbox',
  inheritAttrs: false,
});
</script>
