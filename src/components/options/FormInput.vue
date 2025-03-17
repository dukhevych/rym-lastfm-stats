<template>
  <div class="form-item flex flex-col gap-2">
    <div
      v-if="props.label"
      class="
        form-label font-bold
        [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)]
      "
    >
      <label :for="props.name">{{ props.label }}</label>
    </div>
    <div class="form-input">
      <input
        :id="props.name"
        class="
          w-full rounded bg-gray-200 p-2
          disabled:cursor-not-allowed disabled:opacity-50
          dark:bg-gray-800
        "
        :value="props.modelValue"
        type="text"
        :name="props.name"
        v-bind="$attrs"
        @input="$emit('update:modelValue', $event.target.value)"
        @keypress="handleKeypress"
      >
    </div>
    <div
      v-if="$slots.error || props.error"
      class="form-hint text-sm"
    >
      <slot name="error">
        {{ props.error }}
      </slot>
    </div>
    <div
      v-if="$slots.hint || props.hint"
      class="
        form-hint rounded border-l-4 border-blue-500 bg-gray-50 px-4 py-2 text-sm
        dark:bg-gray-900
      "
    >
      <div v-if="$slots.hint">
        <template
          v-for="(child, i) in $slots.hint()"
          :key="i"
        >
          <component :is="child" />
        </template>
      </div>
      <!-- <slot name="hint">
        {{ props.hint }}
      </slot> -->
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true,
  },
  hint: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  modelValue: {
    type: [String, Number],
    required: true,
  }
});

defineEmits(['update:modelValue']);

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
