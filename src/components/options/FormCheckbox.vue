<template>
  <div
    class="form-item flex flex-col gap-2"
    :class="{ 'pointer-events-none opacity-50': $attrs.disabled }"
  >
    <div class="form-input flex">
      <label
        :for="props.name"
        class="flex cursor-pointer items-center gap-2"
      >
        <div class="relative">
          <input
            :id="props.name"
            :checked="props.modelValue"
            type="checkbox"
            class="peer sr-only"
            v-bind="$attrs"
            @input="$emit('update:modelValue', $event.target.checked)"
          >
          <div
            class="
              peer h-6 w-11 rounded-full bg-gray-300
              after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full
              after:border after:border-gray-300 after:bg-white after:transition-all
              after:content-['']
              peer-checked:bg-blue-600 peer-checked:after:translate-x-full
              peer-checked:after:border-white
              peer-focus-visible:ring-4
              dark:border-gray-800 dark:bg-gray-700
            "
            :title="`Click to ${props.modelValue ? 'disable' : 'enable'}`"
          />
        </div>
        <span class="text-lg font-bold">{{ props.label }}</span>
      </label>
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
  },
  hint: {
    type: String,
    default: '',
  },
});

defineEmits(['update:modelValue']);

defineOptions({
  name: 'FormCheckbox',
  inheritAttrs: false,
});
</script>
