<template>
  <div class="form-item flex flex-col gap-1">
    <div class="form-label font-bold">
      <label :for="name">{{ props.label }}</label>
    </div>
    <div class="form-input">
      <div class="form-range flex items-center gap-2">
        <input
          :id="name"
          type="range"
          :name="name"
          class="w-[300px]"
          v-bind="$attrs"
          :value="props.modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
        >
        <span
          class="bg-gray-200 dark:bg-gray-800 py-2 px-4 rounded"
        >{{ props.modelValue }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, defineOptions } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true,
  },
  modelValue: {
    type: [String, Number],
    required: true,
  }
});

const emit = defineEmits(['update:modelValue']);

defineOptions({
  name: 'FormRange',
  inheritAttrs: false,
});
</script>
