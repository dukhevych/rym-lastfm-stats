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
    <div class="form-input relative">
      <input
        :id="props.name"
        class="
          w-full rounded bg-gray-200 p-2 pr-10
          disabled:cursor-not-allowed disabled:opacity-50
          dark:bg-gray-800
        "
        :class="[
          {'pr-10': props.clearable},
          props.inputClass
        ]"
        :value="props.modelValue"
        type="text"
        :name="props.name"
        v-bind="$attrs"
        @input="$emit('update:modelValue', $event.target.value)"
        @keypress="handleKeypress"
      >
      <button
        v-if="props.clearable && props.modelValue && !wasCleared"
        class="
          transition-duration-200 absolute right-0 top-0 flex aspect-square h-full items-center
          justify-center rounded-none transition-colors
          hover:bg-gray-900
        "
        title="Clear the input"
        @click="clearInput"
      >
        ✕
      </button>
      <button
        v-if="props.clearable && wasCleared"
        class="
          absolute right-0 top-0 flex aspect-square h-full items-center justify-center rounded-none
          hover:bg-gray-300
        "
        title="Undo clear"
        @click="returnInput"
      >
        ↩
      </button>
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
      <slot
        v-else
        name="hint"
      >
        {{ props.hint }}
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

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
  },
  clearable: {
    type: Boolean,
    default: false
  },
  inputClass: {
    type: [String, Array, Object],
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

defineOptions({
  name: 'FormInput',
  inheritAttrs: false,
});

const lastValue = ref('');
const wasCleared = ref(false);

const handleKeypress = (event) => {
  const maxLength = event.target.getAttribute('max');
  if (maxLength && event.target.value.length >= maxLength) {
    event.preventDefault();
  }
};

const clearInput = () => {
  lastValue.value = props.modelValue;
  emit('update:modelValue', '');
  wasCleared.value = true;
};

const returnInput = () => {
  emit('update:modelValue', lastValue.value);
  wasCleared.value = false;
};
</script>
