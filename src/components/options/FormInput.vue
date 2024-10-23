<template>
  <div class="form-item flex flex-col gap-1">
    <div
      v-if="props.label"
      class="form-label font-bold"
    >
      <label :for="props.name">{{ props.label }}</label>
    </div>
    <div class="form-input">
      <input
        :id="props.name"
        class="w-full bg-gray-200 dark:bg-gray-800 p-2 rounded"
        :value="props.modelValue"
        type="text"
        :name="props.name"
        v-bind="$attrs"
        @input="$emit('update:modelValue', $event.target.value)"
        @keypress="handleKeypress"
      >
    </div>
    <div
      v-if="$slots.hint"
      class="form-hint text-sm"
    >
      <slot name="hint" />
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
  name: 'FormInput',
  inheritAttrs: false,
});

const handleKeypress = (event) => {
  const maxLength = event.target.getAttribute('max');
  if (maxLength && event.target.value.length >= maxLength) {
    event.preventDefault();
  }
};
</script>
